import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, ERROR_MESSAGES, FEATURE_FLAGS } from '../../constants';
import { logger } from '../../utils/logger';
import { trackAmplitudeUXError, trackAmplitudeEvent } from '../../utils/amplitudeHelper';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  details?: any;
}

// Request deduplication cache
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const requestCache = new Map<string, PendingRequest>();
const CACHE_DURATION = 1000; // 1 second - deduplicate requests within this window
const MAX_CACHE_SIZE = 100; // Maximum number of cached requests

function getRequestKey(config: any): string {
  // Create a unique key from method, URL, and params
  const method = (config.method || 'get').toUpperCase();
  let url = config.url || '';
  
  // Remove query string from URL if params are provided separately
  // (axios will add them, so we don't want to double-count them)
  if (config.params && url.includes('?')) {
    url = url.split('?')[0];
  }
  
  // Sort params for consistent key generation
  const params = config.params 
    ? JSON.stringify(Object.keys(config.params).sort().reduce((acc: any, key: string) => {
        acc[key] = config.params[key];
        return acc;
      }, {}))
    : '';
  
  return `${method}:${url}:${params}`;
}

function cleanupCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  // Remove expired entries
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => requestCache.delete(key));
  
  // If cache is still too large, remove oldest entries
  if (requestCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(requestCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, requestCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => requestCache.delete(key));
  }
}

export class ApiBase {
  public api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupRequestDeduplication();
    this.setupInterceptors();
  }

  private setupRequestDeduplication(): void {
    // Store original request method
    const originalRequest = this.api.request.bind(this.api);
    
    // Override request method to add deduplication
    this.api.request = ((config: any) => {
      const method = (config?.method || 'get').toLowerCase();
      const isIdempotent = ['get', 'head', 'options'].includes(method);
      
      // Only deduplicate idempotent requests
      if (isIdempotent && !config?.headers?.['X-Skip-Deduplication']) {
        const requestKey = getRequestKey(config);
        const cached = requestCache.get(requestKey);
        const now = Date.now();
        
        // If there's a pending request within the cache window, reuse it
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          // Return a clone of the cached promise
          return cached.promise.then((response: any) => {
            // Return a new response object to avoid sharing references
            return { ...response, config: { ...response.config } };
          }).catch((error: any) => {
            // Remove from cache on error so it can be retried
            requestCache.delete(requestKey);
            throw error;
          });
        }
        
        // Make the actual request
        const requestPromise = originalRequest(config);
        
        // Cache the promise
        requestCache.set(requestKey, {
          promise: requestPromise,
          timestamp: now
        });
        
        // Clean up cache entry when request completes (success or error)
        requestPromise
          .then(() => {
            // Keep in cache for CACHE_DURATION, then remove
            setTimeout(() => {
              requestCache.delete(requestKey);
            }, CACHE_DURATION);
          })
          .catch(() => {
            // Remove immediately on error
            requestCache.delete(requestKey);
          });
        
        // Clean up old cache entries periodically
        if (Math.random() < 0.1) { // 10% chance to cleanup
          cleanupCache();
        }
        
        return requestPromise;
      }
      
      // For non-idempotent requests, just make the request normally
      return originalRequest(config);
    }) as any;
  }

  private setupInterceptors(): void {
    // Request interceptor with deduplication
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Removed debug logging for performance - only log errors
        return config;
      },
      (error) => {
        logger.api.error('request', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Removed debug logging for performance - only log errors
        return response;
      },
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(this.transformError(error));
      }
    );

  }

  private handleError(error: AxiosError): void {
    // Type guard helper
    const isErrorResponse = (data: unknown): data is { detail?: string | any[]; message?: string } => {
      return typeof data === 'object' && data !== null;
    };

    // Enhanced error logging for debugging connection issues
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      message: error.message,
      networkError: !error.response
    };

    // Log error safely to avoid [object Object] issues
    try {
      logger.error('API Error', error, 'api');
    } catch (loggingError) {
      // Fallback if logger fails
      const responseData = error.response?.data;
      const detail = (isErrorResponse(responseData) && typeof responseData.detail === 'string')
        ? responseData.detail
        : 'No detail';
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        detail
      });
    }

    // Track API errors in Amplitude (if available)
    const status = error.response?.status;
    if (status) {
      trackAmplitudeUXError('api_error', `Status ${status}`, {
        status_code: status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase()
      });
    } else {
      trackAmplitudeUXError('network_error', 'Network request failed', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase()
      });
    }

    // Track validation errors (without detailed logging for performance)
    if (error.response?.status === 422) {
      const responseData = error.response.data;
      if (isErrorResponse(responseData) && Array.isArray(responseData.detail)) {
        // Track validation errors
        trackAmplitudeEvent('form_validation_error', {
          form_type: 'api',
          error_fields: responseData.detail.map((err: any) => err.loc?.[1] || err.loc?.[0]),
          error_count: responseData.detail.length
        });
      }
    }

    if (!error.response) {
      logger.warn('Network error - possible causes: backend down, CORS issue, network problem, firewall, o problema de red', undefined, 'api');
    }

    if (FEATURE_FLAGS.ENABLE_DEBUG_MODE) {
      logger.api.error(error.config?.url || 'unknown', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }

    // Handle specific error cases
    // Only treat 401/403 as session expired if NOT an auth endpoint (login/register)
    // Auth endpoints return 401 for invalid credentials, not expired sessions
    // Some endpoints may return 403 for business logic (e.g., patient access, not auth issues)
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register') ||
      error.config?.url?.includes('/auth/refresh');

    // Endpoints that may return 403 for business reasons, not auth issues
    // These endpoints can return 403 when:
    // - Patient doesn't exist (404 converted to 403 by middleware)
    // - Patient is not active
    // - User doesn't have permission (business logic, not auth failure)
    const isBusinessLogic403 = error.config?.url?.includes('/privacy/consent-status') ||
      error.config?.url?.includes('/clinical-studies/patient/') ||
      (error.config?.url?.includes('/consultations') && error.response?.status === 403) ||
      (error.config?.url?.includes('/api/privacy/') && error.response?.status === 403);

    // Only treat 401/403 as session expired if:
    // 1. Not an auth endpoint (auth endpoints use 401 for invalid credentials)
    // 2. Not a business logic 403 (these are expected errors, not auth failures)
    // 3. Response indicates "Not authenticated" or similar auth-related message
    const responseDataForAuth = error.response?.data;
    const detailString = (isErrorResponse(responseDataForAuth) && typeof responseDataForAuth.detail === 'string')
      ? responseDataForAuth.detail.toLowerCase()
      : '';
    const isAuthFailure = detailString.includes('not authenticated') ||
      detailString.includes('invalid token') ||
      detailString.includes('token') ||
      (error.response?.status === 401 && !isAuthEndpoint && !isBusinessLogic403);

    if (isAuthFailure && !isAuthEndpoint && !isBusinessLogic403) {
      // Handle unauthorized/forbidden - clear auth data (only for actual auth failures)
      logger.auth.sessionExpired();
      localStorage.removeItem('token');
      localStorage.removeItem('doctor_data');

      // Dispatch a custom event to notify the auth context
      // This avoids forced page reloads that cause blinking
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
  }

  private transformError(error: AxiosError): ApiError {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const responseData = error.response?.data as any; // Type assertion for error response data

    // Type guard helper
    const isErrorResponse = (data: unknown): data is { detail?: string | any[]; message?: string } => {
      return typeof data === 'object' && data !== null;
    };

    // Handle different error types
    if (!error.response) {
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR,
        status: 0,
        statusText: 'Network Error'
      };
    }

    if (status === 401) {
      // For auth endpoints, use the backend's error message (e.g., "Credenciales inválidas")
      // For other endpoints, use generic unauthorized message
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register') ||
        error.config?.url?.includes('/auth/refresh');

      let message = ERROR_MESSAGES.UNAUTHORIZED;
      if (isAuthEndpoint && isErrorResponse(responseData) && typeof responseData.detail === 'string') {
        // Use backend's specific error message for auth endpoints
        message = responseData.detail;
      }

      return {
        message,
        status,
        statusText,
        details: responseData
      };
    }

    if (status === 403) {
      return {
        message: ERROR_MESSAGES.FORBIDDEN,
        status,
        statusText,
        details: responseData
      };
    }

    if (status === 404) {
      return {
        message: ERROR_MESSAGES.NOT_FOUND,
        status,
        statusText,
        details: responseData
      };
    }

    if (status === 422) {
      // Handle validation errors
      if (isErrorResponse(responseData)) {
        // If detail is a string, use it directly (e.g., CURP validation error)
        if (typeof responseData.detail === 'string') {
          return {
            message: responseData.detail,
            status,
            statusText,
            details: responseData
          };
        }
        // If detail is an array (Pydantic validation errors), format the first error
        if (Array.isArray(responseData.detail)) {
          const firstError = responseData.detail[0] as any;
          const fieldName = firstError?.loc?.[1] || firstError?.loc?.[0] || 'campo';
          const errorMessage = firstError?.msg || 'Error de validación';
          return {
            message: `${fieldName}: ${errorMessage}`,
            status,
            statusText,
            details: responseData
          };
        }
      }
      return {
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        status,
        statusText,
        details: responseData
      };
    }

    if (status >= 500) {
      return {
        message: ERROR_MESSAGES.SERVER_ERROR,
        status,
        statusText,
        details: responseData
      };
    }

    // Default error handling
    let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
    if (isErrorResponse(responseData)) {
      if (typeof responseData.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (typeof responseData.message === 'string') {
        errorMessage = responseData.message;
      }
    }

    return {
      message: errorMessage,
      status,
      statusText,
      details: responseData
    };
  }

  // Helper method to map frontend gender values to backend format
  protected mapGenderToBackend(gender: string): string | null {
    if (!gender || gender.trim() === '') {
      return null;
    }
    const genderMap: { [key: string]: string } = {
      'Masculino': 'Masculino',
      'Femenino': 'Femenino',
      'M': 'Masculino',
      'F': 'Femenino',
      'masculino': 'Masculino',
      'femenino': 'Femenino'
    };
    return genderMap[gender] || gender;
  }

  // Helper method to map backend gender values to frontend format
  protected mapGenderToFrontend(gender: string): string {
    if (!gender || gender.trim() === '') {
      return '';
    }
    const genderMap: { [key: string]: string } = {
      'Masculino': 'M',
      'Femenino': 'F',
      'masculino': 'M',
      'femenino': 'F'
    };
    return genderMap[gender] || gender;
  }

  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        logger.debug(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, undefined, 'api');
      }
    }

    throw lastError;
  }
}
