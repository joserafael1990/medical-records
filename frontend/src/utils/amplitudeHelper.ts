// ============================================================================
// AMPLITUDE HELPER - Safe wrapper for AmplitudeService
// ============================================================================

/**
 * Helper para usar AmplitudeService de forma segura
 * Este helper siempre está disponible, incluso si AmplitudeService no se puede cargar
 */

/**
 * Trackear evento de usuario de forma segura
 */
export function trackAmplitudeEvent(eventName: string, eventProperties?: Record<string, any>): void {
  try {
    // Dynamic import to avoid issues if module is not available
    const AmplitudeService = require('../services/analytics/AmplitudeService').AmplitudeService;
    if (AmplitudeService && typeof AmplitudeService.track === 'function') {
      AmplitudeService.track(eventName, eventProperties);
    }
  } catch (error) {
    // Silently fail - Amplitude tracking is non-critical
  }
}

/**
 * Trackear vista de página de forma segura
 */
export function trackAmplitudePageView(pageName: string, pageTitle?: string): void {
  try {
    const AmplitudeService = require('../services/analytics/AmplitudeService').AmplitudeService;
    if (AmplitudeService && typeof AmplitudeService.trackPageView === 'function') {
      AmplitudeService.trackPageView(pageName, pageTitle);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Trackear error de UX de forma segura
 */
export function trackAmplitudeUXError(errorType: string, errorMessage: string, errorDetails?: Record<string, any>): void {
  try {
    const AmplitudeService = require('../services/analytics/AmplitudeService').AmplitudeService;
    if (AmplitudeService && typeof AmplitudeService.trackUXError === 'function') {
      AmplitudeService.trackUXError(errorType, errorMessage, errorDetails);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Identificar usuario de forma segura
 */
export function identifyAmplitudeUser(userId: string, userProperties?: Record<string, any>): Promise<void> {
  try {
    const AmplitudeService = require('../services/analytics/AmplitudeService').AmplitudeService;
    if (AmplitudeService && typeof AmplitudeService.identify === 'function') {
      return AmplitudeService.identify(userId, userProperties);
    }
  } catch (error) {
    // Silently fail
  }
  return Promise.resolve();
}

/**
 * Resetear usuario de forma segura
 */
export function resetAmplitudeUser(): void {
  try {
    const AmplitudeService = require('../services/analytics/AmplitudeService').AmplitudeService;
    if (AmplitudeService && typeof AmplitudeService.reset === 'function') {
      AmplitudeService.reset();
    }
  } catch (error) {
    // Silently fail
  }
}

