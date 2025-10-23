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
  protected api: AxiosInstance;

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
    console.group('🚨 API Error Details');
    console.log('URL:', error.config?.url);
    console.log('Method:', error.config?.method?.toUpperCase());
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Response Data:', error.response?.data);
    console.log('Request Headers:', error.config?.headers);
    console.log('Error Message:', error.message);
    console.log('Network Error (no response):', !error.response);
    
    // Detailed error logging for 422 validation errors
    if (error.response?.status === 422) {
      console.log('🚨 422 Validation Error Details:', error.response.data?.detail);
      console.log('🚨 Full error response:', error.response.data);
      if (Array.isArray(error.response.data?.detail)) {
        const fieldErrors = error.response.data.detail.map((err: any) => {
          const field = err.loc?.[1] || err.loc?.[0];
          return `${field}: ${err.msg}`;
        }).join(', ');
        console.log('🚨 Field validation errors:', fieldErrors);
        
        // Show user-friendly error message
        const firstError = error.response.data.detail[0];
        const fieldName = firstError.loc?.[1] || firstError.loc?.[0] || 'campo';
        const errorMessage = firstError.msg || 'Error de validación';
        console.log('🚨 User-friendly error:', `${fieldName}: ${errorMessage}`);
      }
    }
    if (!error.response) {
      console.log('- Backend server is down');
      console.log('- CORS configuration issue');
      console.log('- Network connectivity problem');
      console.log('- Firewall blocking the request');
      console.log('- Incorrect API URL configuration');
    }
    console.groupEnd();
    
    if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
      logger.api.error(error.config?.url || 'unknown', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    
    // Handle specific error cases
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Handle unauthorized/forbidden - clear auth data
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
    const responseData = error.response?.data;

    // Handle different error types
    if (!error.response) {
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR,
        status: 0,
        statusText: 'Network Error'
      };
    }

    if (status === 401) {
      return {
        message: ERROR_MESSAGES.UNAUTHORIZED,
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
      if (Array.isArray(responseData?.detail)) {
        const firstError = responseData.detail[0];
        const fieldName = firstError.loc?.[1] || firstError.loc?.[0] || 'campo';
        const errorMessage = firstError.msg || 'Error de validación';
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
    return {
      message: responseData?.detail || responseData?.message || ERROR_MESSAGES.UNKNOWN_ERROR,
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
