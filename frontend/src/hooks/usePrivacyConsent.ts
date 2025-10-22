/**
 * Custom hook for managing patient privacy consent
 * Handles WhatsApp consent flow, status tracking, and consent management
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { PrivacyConsent, SendPrivacyNoticeRequest } from '../types';

interface UsePrivacyConsentReturn {
  consent: PrivacyConsent | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConsentStatus: (patientId: number) => Promise<void>;
  sendWhatsAppNotice: (patientId: number, patientPhone: string) => Promise<void>;
  clearError: () => void;
  
  // Status helpers
  hasAcceptedConsent: boolean;
  consentStatusText: string;
  consentStatusColor: string;
}

export const usePrivacyConsent = (): UsePrivacyConsentReturn => {
  const [consent, setConsent] = useState<PrivacyConsent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch consent status for a patient
   */
  const fetchConsentStatus = useCallback(async (patientId: number) => {
    console.log('🔒 Fetching consent status for patient:', patientId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.get(`/api/privacy/consent-status/${patientId}`);
      console.log('✅ Consent status:', response);
      
      if (response.has_consent) {
        setConsent(response.consent);
      } else {
        setConsent(null);
      }
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al obtener el estado del consentimiento';
      console.error('❌ Error fetching consent:', errorMsg);
      setError(errorMsg);
      setConsent(null);
    } finally {
      setIsLoading(false);
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

      const response = await apiService.post('/api/privacy/send-whatsapp-notice', payload);
      console.log('✅ WhatsApp notice sent:', response);
      
      // Update consent state with the newly created consent
      if (response.consent) {
        setConsent(response.consent);
      }

      return response;
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al enviar el aviso de privacidad por WhatsApp';
      console.error('❌ Error sending WhatsApp notice:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if patient has accepted consent
   */
  const hasAcceptedConsent = consent?.consent_status === 'accepted' && !consent?.is_revoked;

  /**
   * Get human-readable consent status
   */
  const getConsentStatusText = (status: string | undefined, isRevoked: boolean): string => {
    if (isRevoked) return 'Revocado';
    
    switch (status) {
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

  const consentStatusText = consent 
    ? getConsentStatusText(consent.consent_status, consent.is_revoked)
    : 'Sin consentimiento';

  /**
   * Get color for consent status
   */
  const getConsentStatusColor = (status: string | undefined, isRevoked: boolean): string => {
    if (isRevoked) return 'error';
    
    switch (status) {
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

  const consentStatusColor = consent 
    ? getConsentStatusColor(consent.consent_status, consent.is_revoked)
    : 'default';

  return {
    consent,
    isLoading,
    error,
    fetchConsentStatus,
    sendWhatsAppNotice,
    clearError,
    hasAcceptedConsent,
    consentStatusText,
    consentStatusColor
  };
};

