// ============================================================================
// ERROR HANDLING - Utilidades para manejo de errores
// ============================================================================

import type { ApiError } from '../types';

// ApiError interface moved to types/index.ts to avoid duplication

/**
 * Parse API error response and extract meaningful error messages
 */
export const parseApiError = (error: any): ApiError => {
  // Default error message
  let message = 'Ha ocurrido un error inesperado';
  let fieldErrors: { [key: string]: string } = {};

  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      // Handle Pydantic validation errors
      const errorMessages = detail.map((err: any) => {
        const field = err.loc?.[1] || err.loc?.[0] || 'Campo';
        return `${field}: ${err.msg}`;
      }).join(', ');
      message = errorMessages;
      
      // Set individual field errors
      detail.forEach((err: any) => {
        const field = err.loc?.[1] || err.loc?.[0];
        if (field) {
          fieldErrors[field] = err.msg;
        }
      });
    } else if (typeof detail === 'object') {
      message = detail.message || 'Error en la respuesta del servidor';
    }
  } else if (error.response?.status) {
    // Handle HTTP status codes
    switch (error.response.status) {
      case 400:
        message = 'Solicitud inválida. Verifica los datos enviados.';
        break;
      case 401:
        message = 'No autorizado. Inicia sesión nuevamente.';
        break;
      case 403:
        message = 'Acceso denegado. No tienes permisos para esta acción.';
        break;
      case 404:
        message = 'Recurso no encontrado.';
        break;
      case 409:
        message = 'Conflicto. El recurso ya existe o hay un problema de concurrencia.';
        break;
      case 422:
        message = 'Datos de entrada inválidos. Verifica los campos requeridos.';
        break;
      case 500:
        message = 'Error interno del servidor. Intenta nuevamente más tarde.';
        break;
      case 503:
        message = 'Servicio no disponible. Intenta nuevamente más tarde.';
        break;
      default:
        message = `Error del servidor (${error.response.status})`;
    }
  } else if (error.request) {
    // Network error
    message = 'Error de conexión. Verifica tu conexión a internet.';
  } else if (error.message) {
    message = error.message;
  }

  return { 
    details: message, 
    status: error.response?.status || 500,
    message, 
    fieldErrors 
  };
};

/**
 * Handle form submission errors
 */
export const handleFormError = (
  error: any,
  setErrorMessage: (message: string) => void,
  setFieldErrors: (errors: { [key: string]: string }) => void
) => {
  const parsedError = parseApiError(error);
  setErrorMessage(parsedError.message || 'Ha ocurrido un error inesperado');
  setFieldErrors(parsedError.fieldErrors || {});
};

/**
 * Show user-friendly error messages
 */
export const getErrorMessage = (error: any): string => {
  return parseApiError(error).message || 'Ha ocurrido un error inesperado';
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (
  data: { [key: string]: any },
  requiredFields: string[]
): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = 'Este campo es requerido';
    }
  });
  
  return errors;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return true; // Optional field
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Mexican phone numbers are typically 10 digits
  return cleaned.length === 10;
};

/**
 * Validate date format and range
 */
export const validateDate = (dateString: string, minAge?: number, maxAge?: number): string | null => {
  if (!dateString) return 'Fecha es requerida';
  
  const date = new Date(dateString);
  const today = new Date();
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Formato de fecha inválido';
  }
  
  // Check if date is not in the future
  if (date > today) {
    return 'La fecha no puede ser en el futuro';
  }
  
  // Check age restrictions if provided
  if (minAge || maxAge) {
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      actualAge--;
    }
    
    if (minAge && actualAge < minAge) {
      return `La edad mínima es ${minAge} años`;
    }
    
    if (maxAge && actualAge > maxAge) {
      return `La edad máxima es ${maxAge} años`;
    }
  }
  
  return null; // Valid date
};

/**
 * Create error boundary handler
 */
export const createErrorBoundary = (
  onError: (error: Error, errorInfo: any) => void
) => {
  return class ErrorBoundary extends Error {
    constructor(error: Error, errorInfo: any) {
      super(error.message);
      onError(error, errorInfo);
    }
  };
};

/**
 * Log error for debugging - safely formatted to avoid [object Object] issues
 */
export const logError = (error: any, context?: string) => {
  try {
    const formattedError = {
      message: error?.message || 'Unknown error',
      detail: error?.detail || error?.response?.data?.detail || 'No additional details',
      status: error?.status || error?.response?.status || 'Unknown status',
      url: error?.config?.url || error?.response?.config?.url || 'Unknown URL',
      stack: error?.stack || 'No stack trace'
    };
    
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, formattedError);
  } catch (loggingError) {
    // Fallback error logging to prevent infinite loops
    safeConsoleError('Failed to log error properly:', loggingError);
    safeConsoleError('Original error:', error);
  }
  
  // In production, you might want to send this to an error tracking service
  // Example: Sentry.captureException(error, { extra: { context } });
};

/**
 * Safe console.error wrapper that prevents [object Object] logging
 */
export const safeConsoleError = (message: string, error: any) => {
  try {
    if (error && typeof error === 'object') {
      // Create a safe error object
      const safeError = {
        message: error.message || 'Unknown error',
        detail: error.detail || error.response?.data?.detail || 'No additional details',
        status: error.status || error.response?.status || 'Unknown status',
        code: error.code || 'No code',
        name: error.name || 'Error',
        url: error.config?.url || error.response?.config?.url || 'Unknown URL'
      };
      
      console.error(message, safeError);
      
      // Also log the stack if available (in development)
      if (process.env.NODE_ENV === 'development' && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error(message, String(error));
    }
  } catch (loggingError) {
    // Fallback if even logging fails
    console.error('Error occurred while logging error:', loggingError);
    console.error('Original message:', message);
    console.error('Original error (stringified):', JSON.stringify(error, null, 2));
  }
};
