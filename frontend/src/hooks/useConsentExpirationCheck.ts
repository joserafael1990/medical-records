/**
 * Custom hook to check for consent expiration
 * Shows warnings when consents are expiring soon or have expired
 */

import { useMemo } from 'react';
import type { PrivacyConsent } from '../types';

interface ExpirationStatus {
  isExpiring: boolean;
  isExpired: boolean;
  daysUntilExpiration: number;
  expirationMessage: string;
  severity: 'warning' | 'error' | 'info';
}

const EXPIRATION_WARNING_DAYS = 30; // Warn 30 days before expiration
const DEFAULT_CONSENT_VALIDITY_DAYS = 365; // 1 year

export const useConsentExpirationCheck = (consent: PrivacyConsent | null): ExpirationStatus => {
  return useMemo(() => {
    if (!consent || !consent.consent_date) {
      return {
        isExpiring: false,
        isExpired: false,
        daysUntilExpiration: 0,
        expirationMessage: '',
        severity: 'info'
      };
    }

    // If revoked, no expiration check needed
    if (consent.is_revoked) {
      return {
        isExpiring: false,
        isExpired: false,
        daysUntilExpiration: 0,
        expirationMessage: '',
        severity: 'info'
      };
    }

    // Calculate expiration date (1 year from consent date)
    const consentDate = new Date(consent.consent_date);
    const expirationDate = new Date(consentDate);
    expirationDate.setDate(expirationDate.getDate() + DEFAULT_CONSENT_VALIDITY_DAYS);

    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Already expired
    if (daysUntilExpiration < 0) {
      return {
        isExpiring: true,
        isExpired: true,
        daysUntilExpiration,
        expirationMessage: `El consentimiento expiró hace ${Math.abs(daysUntilExpiration)} días. Se requiere renovación.`,
        severity: 'error'
      };
    }

    // Expiring soon
    if (daysUntilExpiration <= EXPIRATION_WARNING_DAYS) {
      return {
        isExpiring: true,
        isExpired: false,
        daysUntilExpiration,
        expirationMessage: `El consentimiento expirará en ${daysUntilExpiration} días. Se recomienda renovar.`,
        severity: 'warning'
      };
    }

    // Valid
    return {
      isExpiring: false,
      isExpired: false,
      daysUntilExpiration,
      expirationMessage: `Consentimiento válido por ${daysUntilExpiration} días más.`,
      severity: 'info'
    };
  }, [consent]);
};

