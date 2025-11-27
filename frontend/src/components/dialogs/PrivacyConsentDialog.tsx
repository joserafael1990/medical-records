/**
 * Privacy Consent Dialog Component
 * 
 * Manages patient privacy consent according to LFPDPPP (Mexican Data Protection Law)
 * 
 * Features:
 * - Display current consent status
 * - Send privacy notice via WhatsApp with interactive button
 * - LFPDPPP compliance indicators
 */

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
  IconButton,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  DoneAll as DoneAllIcon,
  Security as SecurityIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { usePrivacyConsent } from '../../hooks/usePrivacyConsent';
import { useConsentExpirationCheck } from '../../hooks/useConsentExpirationCheck';
import { useToast } from '../common/ToastNotification';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import type { Patient } from '../../types';

interface PrivacyConsentDialogProps {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export const PrivacyConsentDialog: React.FC<PrivacyConsentDialogProps> = ({
  open,
  onClose,
  patient
}) => {
  const { showSuccess, showError } = useToast();
  const {
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
    consentStatusText,
    consentStatusColor
  } = usePrivacyConsent();

  const { errorRef } = useScrollToErrorInDialog(error);
  const expirationStatus = useConsentExpirationCheck(consent);
  
  const [showRevokeDialog, setShowRevokeDialog] = React.useState(false);
  const [revocationReason, setRevocationReason] = React.useState('');

  // Fetch consent status when dialog opens and patient changes
  useEffect(() => {
    if (open && patient?.id) {
      fetchConsentStatus(patient.id);
    }
  }, [open, patient?.id]); // Removed fetchConsentStatus from dependencies to prevent infinite loops

  // Clear error and stop polling when dialog closes
  useEffect(() => {
    if (!open) {
      clearError();
      // Stop any active polling when dialog closes
      if ((window as any).consentPollingCleanup) {
        (window as any).consentPollingCleanup();
        (window as any).consentPollingCleanup = null;
      }
      if ((window as any).consentPollingTimeout) {
        clearTimeout((window as any).consentPollingTimeout);
        (window as any).consentPollingTimeout = null;
      }
    }
  }, [open, clearError]);

  // Stop polling when consent is accepted
  useEffect(() => {
    if (hasAcceptedConsent && (window as any).consentPollingCleanup) {
      (window as any).consentPollingCleanup();
      if ((window as any).consentPollingTimeout) {
        clearTimeout((window as any).consentPollingTimeout);
      }
      (window as any).consentPollingCleanup = null;
      (window as any).consentPollingTimeout = null;
    }
  }, [hasAcceptedConsent]);

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      if ((window as any).consentPollingCleanup) {
        (window as any).consentPollingCleanup();
        (window as any).consentPollingCleanup = null;
      }
      if ((window as any).consentPollingTimeout) {
        clearTimeout((window as any).consentPollingTimeout);
        (window as any).consentPollingTimeout = null;
      }
    };
  }, []);

  /**
   * Handle sending WhatsApp privacy notice
   */
  const handleSendWhatsApp = async () => {
    if (!patient?.id) {
      showError('No se pudo identificar al paciente');
      return;
    }

    if (!patient.primary_phone) {
      showError('El paciente no tiene número de teléfono registrado. Por favor, agregue un número antes de enviar el aviso.');
      return;
    }

    try {
      await sendWhatsAppNotice(patient.id, patient.primary_phone);
      showSuccess('✅ Aviso de privacidad enviado por WhatsApp');
      
      // Start polling to check for consent updates
      const cleanup = startPolling(patient.id, 3000); // Check every 3 seconds
      
      // Stop polling after 5 minutes or when consent is accepted
      const timeout = setTimeout(() => {
        cleanup();
      }, 5 * 60 * 1000); // 5 minutes
      
      // Store cleanup function for later use
      (window as any).consentPollingCleanup = cleanup;
      (window as any).consentPollingTimeout = timeout;
      
    } catch (err: any) {
      showError(err?.detail || 'Error al enviar el aviso de privacidad');
    }
  };

  /**
   * Handle revoke consent
   */
  const handleRevokeConsent = async () => {
    if (!patient?.id) {
      showError('No se pudo identificar al paciente');
      return;
    }

    if (!revocationReason.trim()) {
      showError('Por favor, indique el motivo de la revocación');
      return;
    }

    try {
      await revokeConsent(patient.id, revocationReason.trim());
      showSuccess('✅ Consentimiento revocado exitosamente');
      
      setShowRevokeDialog(false);
      setRevocationReason('');
      
      // Refresh consent status
      await fetchConsentStatus(patient.id);
    } catch (err: any) {
      showError(err?.detail || 'Error al revocar el consentimiento');
    }
  };

  /**
   * Format datetime for display
   */
  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  /**
   * Get icon for consent status
   */
  const getStatusIcon = () => {
    if (consent?.is_revoked) {
      return <CancelIcon color="error" />;
    }
    
    switch (consent?.consent_status) {
      case 'accepted':
        return <CheckCircleIcon color="success" />;
      case 'rejected':
        return <CancelIcon color="error" />;
      case 'sent':
        return <SendIcon color="info" />;
      case 'delivered':
        return <DoneAllIcon color="info" />;
      case 'read':
        return <VisibilityIcon color="info" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };


  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={false}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <SecurityIcon />
            <Typography variant="h6">
              Consentimiento de Privacidad
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Error Display */}
        {error && (
          <Box
            ref={errorRef}
            sx={{
              mb: 2,
              p: 2,
              bgcolor: '#d32f2f',
              borderRadius: 1
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {error}
            </Typography>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && !consent && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        )}

        {/* Patient Info */}
        {patient && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Paciente
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {patient.name}
              </Typography>
              {patient.primary_phone && (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <WhatsAppIcon fontSize="small" />
                  {patient.primary_phone}
                </Typography>
              )}
              {!patient.primary_phone && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Sin número de teléfono. Agregue uno para enviar el aviso por WhatsApp.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Consent Status */}
        {!isLoading && (
          <>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="subtitle2">
                    Estado del Consentimiento
                  </Typography>
                  <Chip
                    icon={getStatusIcon()}
                    label={consentStatusText}
                    color={consentStatusColor as any}
                    size="small"
                  />
                </Box>

                {hasAcceptedConsent && (
                  <>
                    {/* Expiration warning */}
                    {(expirationStatus.isExpiring || expirationStatus.isExpired) && (
                      <Alert severity={expirationStatus.severity}>
                        {expirationStatus.expirationMessage}
                      </Alert>
                    )}
                  </>
                )}

                {consent && !hasAcceptedConsent && consent.consent_status !== 'accepted' && (
                  <Alert severity="info">
                    Aviso enviado. Esperando respuesta del paciente.
                  </Alert>
                )}

                {!consent && (
                  <Alert severity="warning">
                    No se ha enviado el aviso de privacidad a este paciente.
                  </Alert>
                )}

                {consent && consent.is_revoked && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Consentimiento revocado: {consent.revocation_reason || 'Sin motivo especificado'}
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Consent Details */}
            {consent && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Detalles
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Método:
                      </Typography>
                      <Typography variant="body2">
                        {consent.consent_method === 'whatsapp_button' && 'WhatsApp (Botón Interactivo)'}
                        {consent.consent_method === 'papel_firmado' && 'Papel Firmado'}
                        {consent.consent_method === 'tablet_digital' && 'Tablet Digital'}
                        {consent.consent_method === 'portal_web' && 'Portal Web'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Versión del aviso:
                      </Typography>
                      <Typography variant="body2">
                        {consent.privacy_notice_version}
                      </Typography>
                    </Box>
                    {consent.consent_date && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Fecha de consentimiento:
                        </Typography>
                        <Typography variant="body2">
                          {formatDateTime(consent.consent_date)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* LFPDPPP Compliance Info */}
            <Card variant="outlined" sx={{ mt: 2, bgcolor: 'info.lighter' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon fontSize="small" />
                  Cumplimiento LFPDPPP
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Este sistema cumple con la Ley Federal de Protección de Datos Personales en Posesión de Particulares.
                  El consentimiento es libre, informado, específico e inequívoco.
                </Typography>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        
        {/* Revoke button - only show if consent is accepted and not revoked */}
        {hasAcceptedConsent && (
          <Button
            onClick={() => setShowRevokeDialog(true)}
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            disabled={isLoading}
          >
            Revocar Consentimiento
          </Button>
        )}
        
        {patient?.primary_phone && (!consent || consent.consent_status !== 'accepted') && (
          <Button
            onClick={handleSendWhatsApp}
            variant="contained"
            color="success"
            startIcon={<WhatsAppIcon />}
            disabled={isLoading}
          >
            {consent ? 'Reenviar por WhatsApp' : 'Enviar por WhatsApp'}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    {/* Revocation Confirmation Dialog */}
    <Dialog
      open={showRevokeDialog}
      onClose={() => setShowRevokeDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CancelIcon color="error" />
          <Typography variant="h6">
            Revocar Consentimiento
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Al revocar el consentimiento, el paciente retira su autorización para el tratamiento
            de sus datos personales. Esta acción quedará registrada en el sistema.
          </Typography>
        </Alert>

        <TextField
          label="Motivo de la Revocación"
          multiline
          rows={4}
          fullWidth
          value={revocationReason}
          onChange={(e) => setRevocationReason(e.target.value)}
          placeholder="Indique el motivo de la revocación del consentimiento..."
          required
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Esta información será registrada en el historial del paciente.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => setShowRevokeDialog(false)} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleRevokeConsent}
          variant="contained"
          color="error"
          disabled={isLoading || !revocationReason.trim()}
        >
          Confirmar Revocación
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

