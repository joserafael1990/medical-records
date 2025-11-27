/**
 * Custom hook for managing patient privacy consent
 * Handles WhatsApp consent flow, status tracking, and consent management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';
import type { PrivacyConsent, SendPrivacyNoticeRequest } from '../types';

interface UsePrivacyConsentReturn {
  consent: PrivacyConsent | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConsentStatus: (patientId: number) => Promise<void>;
  sendWhatsAppNotice: (patientId: number, patientPhone: string) => Promise<void>;
  revokeConsent: (patientId: number, reason: string) => Promise<void>;
  clearError: () => void;
  
  // Polling
  startPolling: (patientId: number, intervalMs?: number) => () => void;
  stopPolling: (cleanup: () => void) => void;
  
  // Status helpers
  hasAcceptedConsent: boolean;
  isPendingConsent: boolean;
  consentStatusText: string;
  consentStatusColor: string;
}

export const usePrivacyConsent = (): UsePrivacyConsentReturn => {
  const [consent, setConsent] = useState<PrivacyConsent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<boolean>(false);

  /**
   * Fetch consent status for a patient
   */
  const fetchConsentStatus = useCallback(async (patientId: number) => {
    // Prevent multiple simultaneous requests
    if (fetchingRef.current) {
      return;
    }
    
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.patients.api.get(`/api/privacy/consent-status/${patientId}`);
      
      // ApiBase returns AxiosResponse, extract data property
      const responseData = response.data;
      
      if (responseData.has_consent) {
        setConsent(responseData.consent);
      } else {
        setConsent(null);
      }
    } catch (err: any) {
      // Handle 403/404 gracefully - these are expected for new patients without consent
      const status = err?.response?.status || err?.status;
      if (status === 403 || status === 404) {
        // Patient may not exist yet or no consent - this is expected for new patients
        setConsent(null);
        setError(null); // Don't show error for expected cases
        logger.debug('No consent found for patient (expected for new patients)', { patientId }, 'api');
      } else {
        // Only show error for unexpected errors
        const errorMsg = err?.detail || err?.response?.data?.detail || err?.message || 'Error al obtener el estado del consentimiento';
        setError(errorMsg);
        setConsent(null);
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  /**
   * Send privacy notice via WhatsApp
   */
  const sendWhatsAppNotice = useCallback(async (patientId: number, patientPhone: string) => {
    console.log('📤 Sending WhatsApp privacy notice to patient:', patientId);
    setIsLoading(true);
    setError(null);

    try {
      const payload: SendPrivacyNoticeRequest = {
        patient_id: patientId,
        method: 'whatsapp_button'
      };

      const response = await apiService.patients.api.post('/api/privacy/send-whatsapp-notice', payload);
      console.log('✅ WhatsApp notice sent:', response);
      
      // Update consent state with the newly created consent
      if (response.consent) {
        setConsent(response.consent);
      }

      return response;
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al enviar el aviso de privacidad por WhatsApp';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Revoke consent
   */
  const revokeConsent = useCallback(async (patientId: number, reason: string) => {
    console.log('🚫 Revoking consent for patient:', patientId);
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        patient_id: patientId,
        revocation_reason: reason
      };

      const response = await apiService.patients.api.post('/api/privacy/revoke', payload);
      console.log('✅ Consent revoked:', response);
      
      // Update consent state
      if (consent) {
        setConsent({
          ...consent,
          is_revoked: true,
          revoked_date: new Date().toISOString(),
          revocation_reason: reason
        });
      }

      return response;
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al revocar el consentimiento';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [consent]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Start polling for consent status updates
   */
  const startPolling = useCallback((patientId: number, intervalMs: number = 5000) => {
    const interval = setInterval(() => {
      fetchConsentStatus(patientId);
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [fetchConsentStatus]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback((cleanup: () => void) => {
    cleanup();
  }, []);

  /**
   * Check if patient has accepted consent
   * Support both new format (consent_given) and legacy format (consent_status)
   */
  const hasAcceptedConsent = consent?.consent_given === true || 
                             (consent?.consent_status === 'accepted' && !consent?.is_revoked);
  
  /**
   * Check if consent is pending (sent but not accepted)
   */
  const isPendingConsent = consent?.consent_given === false || 
                           consent?.consent_status === 'pending';

  /**
   * Get human-readable consent status
   * Prioriza consent_given sobre consent_status
   */
  const getConsentStatusText = (consentData: any): string => {
    if (!consentData) return 'Sin consentimiento';
    
    // Si tiene consent_given, usar ese valor directamente
    if (consentData.consent_given === true) {
      return 'Aceptado';
    }
    
    if (consentData.consent_given === false) {
      // Si fue revocado (tenía consent_given=true antes y ahora es false)
      // O si está pendiente (nunca fue aceptado)
      // Por ahora, si existe un consentimiento con consent_given=false, es pendiente
      // La revocación se maneja separadamente
      return 'Pendiente';
    }
    
    // Fallback a consent_status si existe
    const isRevoked = consentData.is_revoked === true;
    if (isRevoked) return 'Revocado';
    
    switch (consentData.consent_status) {
      case 'accepted':
        return 'Aceptado';
      case 'rejected':
        return 'Rechazado';
      case 'pending':
        return 'Pendiente';
      case 'sent':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'read':
        return 'Leído';
      case 'expired':
        return 'Expirado';
      default:
        return 'Sin consentimiento';
    }
  };

  const consentStatusText = getConsentStatusText(consent);

  /**
   * Get color for consent status
   */
  /**
   * Get color for consent status
   * Prioriza consent_given sobre consent_status
   */
  const getConsentStatusColor = (consentData: any): string => {
    if (!consentData) return 'default';
    
    // Si tiene consent_given, usar ese valor directamente
    if (consentData.consent_given === true) {
      return 'success';
    }
    
    if (consentData.consent_given === false) {
      return 'warning'; // Pendiente
    }
    
    // Fallback a consent_status si existe
    const isRevoked = consentData.is_revoked === true;
    if (isRevoked) return 'error';
    
    switch (consentData.consent_status) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      case 'sent':
      case 'delivered':
      case 'read':
        return 'info';
      case 'expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const consentStatusColor = getConsentStatusColor(consent);

  return {
    consent,
    isLoading,
    error,
    fetchConsentStatus,
    sendWhatsAppNotice,
    revokeConsent,
    clearError,
    startPolling,
    stopPolling,
    hasAcceptedConsent,
    isPendingConsent,
    consentStatusText,
    consentStatusColor
  };
};

