
import { safeConsoleError } from './errorHandling';
import * as Sentry from '@sentry/react';

// Store original console.error
const originalConsoleError = console.error;

/**
 * Override console.error to prevent [object Object] logging
 */
const setupSafeConsoleError = () => {
  console.error = (...args: any[]) => {
    try {
      // Process each argument to ensure safe serialization
      const safeArgs = args.map(arg => {
        if (arg && typeof arg === 'object' && arg.constructor === Object) {
          // This is a plain object that might log as [object Object]
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return `[Object: ${Object.keys(arg).join(', ')}]`;
          }
        } else if (arg instanceof Error) {
          return {
            message: arg.message,
            stack: arg.stack,
            name: arg.name
          };
        } else if (arg && typeof arg === 'object') {
          // For other object types, try to extract meaningful info
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return arg;
      });
      
      originalConsoleError(...safeArgs);
    } catch (fallbackError) {
      // If all else fails, use the original console.error with string conversion
      originalConsoleError(...args.map(String));
    }
  };
};

/**
 * Initialize global error handlers to catch unhandled errors
 */
export const initializeGlobalErrorHandlers = () => {
  // Set up safe console.error override
  setupSafeConsoleError();
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    safeConsoleError('Unhandled Promise Rejection:', event.reason);
    
    // Capturar en Sentry si está habilitado
    if (process.env.REACT_APP_SENTRY_DSN && event.reason) {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      // Capturar error en Sentry - el usuario puede usar el botón flotante para reportar
      Sentry.captureException(error, {
        contexts: {
          unhandledRejection: {
            reason: String(event.reason),
          },
        },
      });
    }
    
    // Prevent the default handling (which would log [object Object])
    event.preventDefault();
    
    // In development, we might want to show more details
    if (process.env.NODE_ENV === 'development') {
      try {
        const safeDetails = {
          reason: event.reason ? String(event.reason) : 'Unknown reason',
          type: event.type || 'Unknown type',
          timestamp: new Date().toISOString()
        };
        console.warn('Unhandled Promise Rejection Details:', JSON.stringify(safeDetails, null, 2));
      } catch (detailError) {
        console.warn('Failed to log rejection details safely');
      }
    }
  });

  // Handle uncaught JavaScript errors
  window.addEventListener('error', (event) => {
    const errorInfo = {
      message: event.message || 'Unknown error message',
      filename: event.filename || 'Unknown file',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      timestamp: new Date().toISOString()
    };
    
    safeConsoleError('Uncaught JavaScript Error:', errorInfo);
    
    // Log the actual error object safely if it exists
    if (event.error) {
      safeConsoleError('Error object:', event.error);
    }
    
    // Capturar en Sentry si está habilitado
    if (process.env.REACT_APP_SENTRY_DSN) {
      const error = event.error || new Error(event.message || 'Unknown error');
      
      // Capturar error en Sentry - el usuario puede usar el botón flotante para reportar
      Sentry.captureException(error, {
        contexts: {
          uncaughtError: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
      });
    }
    
    // Prevent default error reporting
    event.preventDefault();
  });

  // Note: React errors are already handled above in the main error handler

  // Global error handlers initialized
};

/**
 * Clean up global error handlers (useful for testing)
 */
export const cleanupGlobalErrorHandlers = () => {
  // Restore original console.error
  console.error = originalConsoleError;
  
  // Note: This is primarily for testing or cleanup scenarios
  // In a normal app, you typically don't need to remove these
  window.removeEventListener('unhandledrejection', () => {});
  window.removeEventListener('error', () => {});
  
  console.log('🧹 Global error handlers cleaned up');
};
