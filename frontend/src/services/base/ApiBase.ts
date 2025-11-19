import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, ERROR_MESSAGES, FEATURE_FLAGS } from '../../constants';
import { logger } from '../../utils/logger';

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

export class ApiBase {
  public api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log request data for appointments endpoint
        if (config.url?.includes('/api/appointments') && config.method === 'post' && config.data) {
          logger.debug('📤 Sending appointment data', {
            url: config.url,
            data: config.data,
            reminders: config.data.reminders,
            reminders_type: typeof config.data.reminders,
            reminders_length: config.data.reminders?.length || 0,
            data_keys: Object.keys(config.data)
          }, 'api');
        }
        
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          logger.api.request(config.url || '', config.method?.toUpperCase() || '');
          logger.auth.info(`Token present: ${token ? 'YES' : 'NO'}`);
          if (token) {
            logger.auth.info(`Token preview: ${token.substring(0, 20)}...`);
          }
        }
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
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          logger.api.response(response.config.url || '', response.status);
        }
        return response;
      },
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private handleError(error: AxiosError): void {
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
    
    logger.error('API Error', error, 'api');
    
    // Detailed error logging for 422 validation errors
    if (error.response?.status === 422) {
      if (Array.isArray(error.response.data?.detail)) {
        const fieldErrors = error.response.data.detail.map((err: any) => {
          const field = err.loc?.[1] || err.loc?.[0];
          return `${field}: ${err.msg}`;
        }).join(', ');
        logger.debug('422 Validation Error Details', { fieldErrors }, 'api');
      }
    }
    
    if (!error.response) {
      logger.warn('Network error - possible causes: backend down, CORS issue, network problem, firewall, o problema de red', undefined, 'api');
    }
    
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
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
    const isAuthFailure = error.response?.data?.detail?.toLowerCase().includes('not authenticated') ||
                         error.response?.data?.detail?.toLowerCase().includes('invalid token') ||
                         error.response?.data?.detail?.toLowerCase().includes('token') ||
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
      if (isErrorResponse(responseData) && Array.isArray(responseData.detail)) {
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
}
