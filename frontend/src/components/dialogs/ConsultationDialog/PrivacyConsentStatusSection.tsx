import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { usePrivacyConsent } from '../../../hooks/usePrivacyConsent';
import { apiService } from '../../../services';
import { logger } from '../../../utils/logger';

interface PrivacyConsentStatusSectionProps {
  patientId: number | null;
  consultationType: string;
  isFirstTime: boolean;
}

export const PrivacyConsentStatusSection: React.FC<PrivacyConsentStatusSectionProps> = ({
  patientId,
  consultationType,
  isFirstTime
}) => {
  const {
    consent,
    isLoading,
    error,
    fetchConsentStatus,
    sendWhatsAppNotice,
    clearError
  } = usePrivacyConsent();

  const [sendingNotice, setSendingNotice] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch consent status when patient or first time status changes
  useEffect(() => {
    if (patientId && isFirstTime) {
      fetchConsentStatus(patientId);
    }
  }, [patientId, isFirstTime, fetchConsentStatus]);

  const handleSendNotice = useCallback(async () => {
    if (!patientId) return;

    setSendingNotice(true);
    clearError();

    try {
      logger.debug('Enviando aviso de privacidad desde consulta', { patientId }, 'ui');
      
      // Get patient phone from API
      // ApiBase returns AxiosResponse, extract data property
      let patientPhone = '';
      try {
        const patientResponse = await apiService.patients.api.get(`/api/patients/${patientId}`);
        const patientData = patientResponse.data;
        patientPhone = patientData?.primary_phone || '';
      } catch (phoneErr: any) {
        // If we can't get patient phone, try without it (backend may get it from DB)
        logger.debug('No se pudo obtener teléfono del paciente, enviando sin teléfono', { patientId }, 'ui');
        patientPhone = '';
      }
      
      await sendWhatsAppNotice(patientId, patientPhone);
      logger.debug('Aviso de privacidad enviado exitosamente', { patientId }, 'ui');
      
      // Refresh status after sending
      setTimeout(() => {
        fetchConsentStatus(patientId);
      }, 2000);
    } catch (err: any) {
      logger.error('Error al enviar aviso de privacidad', err, 'ui');
    } finally {
      setSendingNotice(false);
    }
  }, [patientId, sendWhatsAppNotice, clearError, fetchConsentStatus]);

  const handleRefreshStatus = useCallback(async () => {
    if (!patientId) return;

    setUpdatingStatus(true);
    clearError();

    try {
      logger.debug('Actualizando estado de consentimiento', { patientId }, 'ui');
      await fetchConsentStatus(patientId);
      logger.debug('Estado de consentimiento actualizado', { patientId }, 'ui');
    } catch (err: any) {
      logger.error('Error al actualizar estado de consentimiento', err, 'ui');
    } finally {
      setUpdatingStatus(false);
    }
  }, [patientId, fetchConsentStatus, clearError]);

  // Only show if it's a first-time consultation
  if (!isFirstTime || !patientId) {
    return null;
  }

  const hasAcceptedConsent = consent?.consent_given === true;
  const isPending = consent && !hasAcceptedConsent;

  return (
    <Card sx={{ mb: 3, border: '1px solid', borderColor: hasAcceptedConsent ? 'success.main' : 'warning.main' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SecurityIcon color={hasAcceptedConsent ? 'success' : 'warning'} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Consentimiento de Privacidad
          </Typography>
          {hasAcceptedConsent && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Aceptado"
              color="success"
              size="small"
            />
          )}
          {isPending && (
            <Chip
              icon={<WarningIcon />}
              label="Pendiente"
              color="warning"
              size="small"
            />
          )}
          {!consent && (
            <Chip
              label="No enviado"
              color="default"
              size="small"
            />
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Verificando estado de consentimiento...
            </Typography>
          </Box>
        ) : hasAcceptedConsent ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              ✅ El paciente ha aceptado el aviso de privacidad
            </Typography>
            {consent.consent_date && (
              <Typography variant="caption" color="text.secondary">
                Aceptado el: {new Date(consent.consent_date).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            )}
          </Alert>
        ) : isPending ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              ⏳ El aviso de privacidad fue enviado pero aún no ha sido aceptado
            </Typography>
            {consent.whatsapp_sent_at && (
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Enviado el: {new Date(consent.whatsapp_sent_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              El paciente puede aceptarlo desde su WhatsApp. Use el botón "Actualizar estado" para verificar si ya respondió.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              📋 El aviso de privacidad aún no ha sido enviado
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Envíe el aviso de privacidad al paciente para obtener su consentimiento antes de la consulta.
            </Typography>
          </Alert>
        )}

        <Box display="flex" gap={2} mt={2}>
          {!hasAcceptedConsent && (
            <Button
              variant="contained"
              color="primary"
              startIcon={sendingNotice ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleSendNotice}
              disabled={sendingNotice || isLoading}
              size="small"
            >
              {sendingNotice ? 'Enviando...' : consent ? 'Reenviar Aviso' : 'Enviar Aviso'}
            </Button>
          )}
          
          {(isPending || consent) && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={updatingStatus ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefreshStatus}
              disabled={updatingStatus || isLoading}
              size="small"
            >
              {updatingStatus ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          💡 El aviso de privacidad se envía automáticamente al agendar la primera cita. 
          Si el paciente no lo ha recibido o aceptado, puede enviarlo manualmente desde aquí.
        </Typography>
      </CardContent>
    </Card>
  );
};

