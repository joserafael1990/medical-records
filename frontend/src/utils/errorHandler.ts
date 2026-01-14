/**
 * Enhanced Error Handling System for Medical Records Frontend
 * Sistema mejorado de manejo de errores para el frontend médico
 */

import { AxiosError } from 'axios';

// Error types and interfaces
export interface ApiErrorDetail {
  message: string;
  error_code: string;
  details: Record<string, any>;
  request_id?: string;
  timestamp?: string;
  field_errors?: Record<string, string>;
}

export interface ParsedError {
  message: string;
  errorCode: string;
  details: Record<string, any>;
  fieldErrors?: Record<string, string>;
  severity: 'error' | 'warning' | 'info';
  isRetryable: boolean;
  userFriendlyMessage: string;
}

// Error code mappings to user-friendly messages
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Patient errors
  PATIENT_NOT_FOUND: 'El paciente no fue encontrado. Verifica el ID e intenta nuevamente.',
  PATIENT_ALREADY_EXISTS: 'Ya existe un paciente registrado con estos datos.',
  PATIENT_INVALID_DATA: 'Los datos del paciente no son válidos.',
  
  // Medical errors
  CONSULTATION_NOT_FOUND: 'La consulta médica no fue encontrada.',
  APPOINTMENT_NOT_FOUND: 'La cita médica no fue encontrada.',
  APPOINTMENT_CONFLICT: 'Ya existe una cita programada para esta fecha y hora.',
  MEDICAL_RECORD_INVALID: 'Los datos del registro médico no son válidos.',
  
  // NOM-004 compliance errors
  NOM004_VALIDATION_ERROR: 'Los datos no cumplen con los requisitos de la NOM-004.',
  MISSING_REQUIRED_FIELD: 'Faltan campos obligatorios requeridos por la normativa.',
  INVALID_CURP: 'La CURP proporcionada no es válida.',
  INVALID_DATE_FORMAT: 'El formato de fecha no es válido.',
  
  // Doctor errors
  DOCTOR_NOT_FOUND: 'El médico no fue encontrado.',
  INVALID_LICENSE: 'La cédula profesional no es válida.',
  
  // Database errors
  DATABASE_ERROR: 'Error de base de datos. El equipo técnico ha sido notificado.',
  CONSTRAINT_VIOLATION: 'Violación de restricciones de datos. Verifica la información.',
  CONNECTION_ERROR: 'Error de conexión. Verifica tu internet e intenta más tarde.',
  
  // File errors
  FILE_TOO_LARGE: 'El archivo es demasiado grande. Tamaño máximo permitido superado.',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido.',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION: 'Operación no permitida por las reglas de negocio.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
  
  // Network errors
  NETWORK_ERROR: 'Error de conexión de red. Verifica tu internet.',
  TIMEOUT_ERROR: 'La operación tardó demasiado tiempo. Intenta nuevamente.',
  
  // Generic
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado. El equipo técnico ha sido notificado.'
};

// Determine if an error is retryable
const RETRYABLE_ERRORS = new Set([
  'CONNECTION_ERROR',
  'TIMEOUT_ERROR',
  'NETWORK_ERROR',
  'DATABASE_ERROR'
]);

export class ErrorHandler {
  /**
   * Parse and enhance API errors for better user experience
   */
  static parseApiError(error: any): ParsedError {
    // Handle network errors
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return {
        message: 'Error de conexión de red',
        errorCode: 'NETWORK_ERROR',
        details: { networkError: true },
        severity: 'error',
        isRetryable: true,
        userFriendlyMessage: 'No se pudo conectar al servidor. Verifica tu conexión a internet e intenta nuevamente.'
      };
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Tiempo de espera agotado',
        errorCode: 'TIMEOUT_ERROR',
        details: { timeoutError: true },
        severity: 'warning',
        isRetryable: true,
        userFriendlyMessage: 'La operación tardó demasiado tiempo. Por favor, intenta nuevamente.'
      };
    }

    const response = error.response;
    if (!response) {
      return this.createGenericError(error);
    }

    // Handle structured API errors
    if (response.data && typeof response.data === 'object') {
      const errorData: ApiErrorDetail = response.data;
      
      const errorCode = errorData.error_code || 'UNKNOWN_ERROR';
      const userMessage = ERROR_CODE_MESSAGES[errorCode] || errorData.message || 'Error desconocido';
      
      return {
        message: errorData.message || 'Error de API',
        errorCode,
        details: errorData.details || {},
        fieldErrors: errorData.details?.field_errors,
        severity: this.determineSeverity(response.status, errorCode),
        isRetryable: RETRYABLE_ERRORS.has(errorCode),
        userFriendlyMessage: userMessage
      };
    }

    // Handle HTTP status codes
    return this.parseHttpStatus(response.status, response.data);
  }

  /**
   * Determine error severity based on status code and error type
   */
  private static determineSeverity(statusCode: number, errorCode: string): 'error' | 'warning' | 'info' {
    if (statusCode >= 500) return 'error';
    if (statusCode === 404) return 'warning';
    if (statusCode === 422 || errorCode.includes('VALIDATION')) return 'warning';
    if (statusCode >= 400) return 'error';
    return 'info';
  }

  /**
   * Parse HTTP status codes to meaningful errors
   */
  private static parseHttpStatus(statusCode: number, data: any): ParsedError {
    let message = 'Error HTTP';
    let errorCode = 'UNKNOWN_ERROR';
    let userMessage = 'Ha ocurrido un error inesperado';
    let isRetryable = false;
    let severity: 'error' | 'warning' | 'info' = 'error';

    switch (statusCode) {
      case 400:
        message = 'Solicitud incorrecta';
        errorCode = 'BAD_REQUEST';
        userMessage = 'Los datos enviados no son válidos. Verifica la información e intenta nuevamente.';
        severity = 'warning';
        break;
      
      case 401:
        message = 'No autorizado';
        errorCode = 'UNAUTHORIZED';
        userMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        severity = 'warning';
        break;
      
      case 403:
        message = 'Acceso denegado';
        errorCode = 'PERMISSION_DENIED';
        userMessage = 'No tienes permisos para realizar esta acción.';
        severity = 'error';
        break;
      
      case 404:
        message = 'Recurso no encontrado';
        errorCode = 'NOT_FOUND';
        userMessage = 'El recurso solicitado no fue encontrado.';
        severity = 'warning';
        break;
      
      case 409:
        message = 'Conflicto de datos';
        errorCode = 'CONFLICT';
        userMessage = 'Los datos enviados están en conflicto con información existente.';
        severity = 'warning';
        break;
      
      case 422:
        message = 'Datos inválidos';
        errorCode = 'VALIDATION_ERROR';
        userMessage = 'Los datos proporcionados no son válidos. Revisa los campos marcados.';
        severity = 'warning';
        break;
      
      case 429:
        message = 'Demasiadas solicitudes';
        errorCode = 'RATE_LIMIT';
        userMessage = 'Has realizado demasiadas solicitudes. Espera un momento e intenta nuevamente.';
        isRetryable = true;
        severity = 'warning';
        break;
      
      case 500:
        message = 'Error interno del servidor';
        errorCode = 'SERVER_ERROR';
        userMessage = 'Error interno del servidor. El equipo técnico ha sido notificado.';
        isRetryable = true;
        severity = 'error';
        break;
      
      case 502:
      case 503:
      case 504:
        message = 'Servicio no disponible';
        errorCode = 'SERVICE_UNAVAILABLE';
        userMessage = 'El servicio no está disponible temporalmente. Intenta más tarde.';
        isRetryable = true;
        severity = 'error';
        break;
      
      default:
        if (statusCode >= 500) {
          errorCode = 'SERVER_ERROR';
          userMessage = 'Error del servidor. Intenta más tarde.';
          isRetryable = true;
        }
    }

    return {
      message,
      errorCode,
      details: { statusCode, data },
      severity,
      isRetryable,
      userFriendlyMessage: userMessage
    };
  }

  /**
   * Create a generic error for unknown error types
   */
  private static createGenericError(error: any): ParsedError {
    return {
      message: error.message || 'Error desconocido',
      errorCode: 'UNKNOWN_ERROR',
      details: { originalError: error },
      severity: 'error',
      isRetryable: false,
      userFriendlyMessage: 'Ha ocurrido un error inesperado. Si el problema persiste, contacta al soporte técnico.'
    };
  }

  /**
   * Extract field-level validation errors
   */
  static extractFieldErrors(parsedError: ParsedError): Record<string, string> {
    return parsedError.fieldErrors || {};
  }

  /**
   * Determine if an error suggests a retry
   */
  static shouldRetry(parsedError: ParsedError): boolean {
    return parsedError.isRetryable;
  }

  /**
   * Format error for logging - safe serialization that handles circular references
   */
  static formatForLogging(error: any, context?: Record<string, any>): any {
    const parsedError = this.parseApiError(error);
    
    // Safe serialization helper
    const safeSerialize = (obj: any): any => {
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch {
        return String(obj);
      }
    };
    
    return {
      timestamp: new Date().toISOString(),
      timezone: 'America/Mexico_City',
      error: {
        message: parsedError.message,
        errorCode: parsedError.errorCode,
        severity: parsedError.severity,
        isRetryable: parsedError.isRetryable
      },
      details: safeSerialize(parsedError.details),
      context: safeSerialize(context || {}),
      stackTrace: error?.stack ? String(error.stack) : 'No stack trace available',
      url: error?.config?.url ? String(error.config.url) : 'Unknown URL',
      method: error?.config?.method ? String(error.config.method) : 'Unknown method',
      requestData: error?.config?.data ? safeSerialize(error.config.data) : 'No request data'
    };
  }

  /**
   * Create user notification from error
   */
  static createNotification(parsedError: ParsedError): {
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
    autoHide: boolean;
    duration?: number;
  } {
    return {
      message: parsedError.userFriendlyMessage,
      severity: parsedError.severity,
      autoHide: parsedError.severity !== 'error',
      duration: parsedError.severity === 'info' ? 3000 : undefined
    };
  }
}

// React hook for error handling
export const useErrorHandler = () => {
  const handleError = (error: any, context?: Record<string, any>) => {
    const parsedError = ErrorHandler.parseApiError(error);
    
    // Log error for debugging using safe logging
    try {
      const formattedError = ErrorHandler.formatForLogging(error, context);
      console.error('Application Error:', JSON.stringify(formattedError, null, 2));
    } catch (loggingError) {
      // Fallback safe logging
      console.error('Application Error (safe fallback):', {
        message: parsedError.message,
        errorCode: parsedError.errorCode,
        userMessage: parsedError.userFriendlyMessage,
        timestamp: new Date().toISOString()
      });
    }
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, or similar service
      // errorMonitoringService.captureError(error, context);
    }
    
    return parsedError;
  };

  const handleFieldErrors = (parsedError: ParsedError): Record<string, string> => {
    return ErrorHandler.extractFieldErrors(parsedError);
  };

  const createUserMessage = (parsedError: ParsedError): string => {
    return parsedError.userFriendlyMessage;
  };

  return {
    handleError,
    handleFieldErrors,
    createUserMessage,
    shouldRetry: ErrorHandler.shouldRetry
  };
};

export default ErrorHandler;
