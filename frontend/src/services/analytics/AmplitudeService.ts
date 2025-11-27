// ============================================================================
// AMPLITUDE SERVICE - Analytics tracking
// ============================================================================

/**
 * AmplitudeService - Servicio para tracking de eventos de usuario
 * IMPORTANTE: Este servicio es OPCIONAL y no debe causar errores si no está disponible
 * 
 * ESTRATEGIA: La clase se define y exporta INMEDIATAMENTE como un stub funcional.
 * El módulo de Amplitude se carga de forma completamente opcional.
 * Si el import falla, la clase funciona como un stub (no-op).
 */

import { logger } from '../../utils/logger';

// Get API key from environment or use empty string (will silently fail)
const AMPLITUDE_API_KEY = process.env.REACT_APP_AMPLITUDE_API_KEY || '';

/**
 * Sanitizar propiedades para remover datos sensibles
 */
function sanitizeProperties(properties?: Record<string, any>): Record<string, any> {
  if (!properties) return {};

  const safeProperties: Record<string, any> = {};
  const sensitiveKeys = [
    'password', 'password_hash', 'token', 'access_token', 'refresh_token',
    'ssn', 'social_security_number', 'curp', 'rfc',
    'credit_card', 'card_number', 'cvv',
    'medical_record', 'diagnosis', 'prescription', 'symptom',
    'patient_name', 'doctor_name', 'patient_id', 'doctor_id'
  ];

  for (const [key, value] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    
    if (!isSensitive) {
      safeProperties[key] = value;
    }
  }

  return safeProperties;
}

// Amplitude instance - will be loaded optionally
let amplitudeInstance: any = null;
let amplitudeLoadAttempted = false;

/**
 * Attempt to load amplitude module - completely optional, won't break if it fails
 */
function tryLoadAmplitude(): void {
  if (amplitudeLoadAttempted) return;
  amplitudeLoadAttempted = true;

  // Only try to load if API key is present
  if (!AMPLITUDE_API_KEY) {
    return;
  }

  try {
    // Use require with explicit path to help webpack resolve it
    // Wrap in try-catch to prevent any errors from breaking the module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const amplitudeModule = require('@amplitude/analytics-browser');
    
    if (amplitudeModule) {
      try {
        // Check if init function exists (different versions may have different APIs)
        if (typeof amplitudeModule.init === 'function') {
          amplitudeModule.init(AMPLITUDE_API_KEY, {
            defaultTracking: {
              pageViews: true,
              sessions: true,
              formInteractions: false,
              fileDownloads: false
            },
            trackingOptions: {
              ipAddress: false,
              deviceId: true,
              userId: true
            }
          });
          amplitudeInstance = amplitudeModule;
        } else if (typeof amplitudeModule.track === 'function') {
          // If init doesn't exist, try to use track directly (some versions)
          amplitudeInstance = amplitudeModule;
        }
      } catch (initError: any) {
        // Silently fail - don't break the app
        logger.error('❌ Error al inicializar Amplitude', initError, 'system');
        amplitudeInstance = null;
      }
    }
  } catch (error) {
    // Module not available or import failed - will use stub (amplitudeInstance stays null)
    // This is expected if the module is not installed or webpack can't resolve it
    amplitudeInstance = null;
  }
}

/**
 * AmplitudeService - Always available class
 * This class is ALWAYS exported synchronously, even if amplitude module is not available
 * All methods check if amplitudeInstance is available before using it
 * 
 * CRITICAL: This class definition happens BEFORE any module loading attempts,
 * ensuring it's always available in the bundle.
 */
export class AmplitudeService {
  /**
   * Trackear evento de usuario
   * IMPORTANTE: NO incluir datos médicos sensibles
   */
  static track(eventName: string, eventProperties?: Record<string, any>): void {
    try {
      // Lazy load amplitude module on first use
      if (!amplitudeLoadAttempted) {
        tryLoadAmplitude();
      }

      if (!AMPLITUDE_API_KEY || !amplitudeInstance || typeof amplitudeInstance.track !== 'function') {
        return; // Silently fail si no está configurado
      }

      // Sanitizar propiedades - remover datos sensibles
      const safeProperties = sanitizeProperties(eventProperties);
      amplitudeInstance.track(eventName, safeProperties);
    } catch (error: any) {
      // Silently fail - don't break the app if tracking fails
    }
  }

  /**
   * Trackear vista de página
   */
  static trackPageView(pageName: string, pageTitle?: string): void {
    try {
      if (!amplitudeLoadAttempted) {
        tryLoadAmplitude();
      }

      if (!AMPLITUDE_API_KEY || !amplitudeInstance || typeof amplitudeInstance.track !== 'function') {
        return;
      }

      amplitudeInstance.track('page_view', {
        page_name: pageName,
        page_title: pageTitle
      });
    } catch (error: any) {
      // Silently fail
    }
  }

  /**
   * Trackear error de UX
   */
  static trackUXError(errorType: string, errorMessage: string, errorDetails?: Record<string, any>): void {
    try {
      if (!amplitudeLoadAttempted) {
        tryLoadAmplitude();
      }

      if (!AMPLITUDE_API_KEY || !amplitudeInstance || typeof amplitudeInstance.track !== 'function') {
        return;
      }

      amplitudeInstance.track('ux_error', {
        error_type: errorType,
        error_message: errorMessage,
        ...errorDetails
      });
    } catch (error: any) {
      // Silently fail
    }
  }

  /**
   * Identificar usuario
   */
  static identify(userId: string, userProperties?: Record<string, any>): Promise<void> {
    try {
      if (!amplitudeLoadAttempted) {
        tryLoadAmplitude();
      }

      if (!AMPLITUDE_API_KEY || !amplitudeInstance) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        try {
          if (typeof amplitudeInstance.setUserId === 'function') {
            amplitudeInstance.setUserId(userId);
          }
          if (userProperties && typeof amplitudeInstance.setUserProperties === 'function') {
            amplitudeInstance.setUserProperties(userProperties);
          }
          resolve();
        } catch (error: any) {
          // Silently fail
          resolve();
        }
      });
    } catch (error: any) {
      return Promise.resolve();
    }
  }

  /**
   * Resetear usuario
   */
  static reset(): void {
    try {
      if (!amplitudeLoadAttempted) {
        tryLoadAmplitude();
      }

      if (!AMPLITUDE_API_KEY || !amplitudeInstance) {
        return;
      }

      if (typeof amplitudeInstance.setUserId === 'function') {
        amplitudeInstance.setUserId(null);
      }
      if (typeof amplitudeInstance.clearUserProperties === 'function') {
        amplitudeInstance.clearUserProperties();
      }
    } catch (error: any) {
      // Silently fail
    }
  }
}

// CRITICAL: Export the class immediately - this ensures it's always available
// This export happens BEFORE any module loading attempts, guaranteeing the class exists
export default AmplitudeService;
