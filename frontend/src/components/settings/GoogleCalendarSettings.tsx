import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { apiService, GoogleCalendarStatus, AmplitudeService } from '../../services';
import { logger } from '../../utils/logger';
import { API_CONFIG } from '../../constants';
import { useSimpleToast } from '../common/ToastNotification';

interface GoogleCalendarSettingsProps {
  doctorId?: number;
}

const GoogleCalendarSettings: React.FC<GoogleCalendarSettingsProps> = ({ doctorId }) => {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [openDisconnectDialog, setOpenDisconnectDialog] = useState(false);
  const toast = useSimpleToast();

  // Cargar estado inicial
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentStatus = await apiService.googleCalendar.getStatus();
      setStatus(currentStatus);
    } catch (err: any) {
      logger.error('Error al obtener estado de Google Calendar', err, 'api');
      setError('Error al verificar estado de Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      setSuccess(null);

      // Obtener URL de autorización
      // El redirect URI debe ser la URL del frontend donde Google redirigirá
      const redirectUri = `${window.location.origin}/profile`;
      const authorizationUrl = await apiService.googleCalendar.getAuthorizationUrl(redirectUri);

      // Redirigir a Google para autorización
      window.location.href = authorizationUrl;
    } catch (err: any) {
      logger.error('Error al conectar Google Calendar', err, 'api');
      setError(err?.response?.data?.detail || 'Error al iniciar conexión con Google Calendar');
      setConnecting(false);
    }
  };

  // Open the confirmation dialog
  const handleDisconnectClick = () => {
    setOpenDisconnectDialog(true);
  };

  // Close the dialog without disconnecting
  const handleCloseDisconnectDialog = () => {
    setOpenDisconnectDialog(false);
  };

  // Perform the actual disconnection
  const handleConfirmDisconnect = async () => {
    setOpenDisconnectDialog(false);

    try {
      setLoading(true);
      setError(null);
      await apiService.googleCalendar.disconnect();
      setSuccess('Google Calendar desconectado exitosamente');
      await fetchStatus();
    } catch (err: any) {
      logger.error('Error al desconectar Google Calendar', err, 'api');
      setError(err?.response?.data?.detail || 'Error al desconectar Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      setLoading(true);
      setError(null);
      await apiService.googleCalendar.toggleSync(enabled);

      // Track sync toggle in Amplitude
      try {
        if (typeof AmplitudeService !== 'undefined' && AmplitudeService.track) {
          AmplitudeService.track('google_calendar_sync_toggled', {
            sync_enabled: enabled,
            previous_state: status?.sync_enabled ?? true
          });
        }
      } catch (error) {
        // Silently fail if AmplitudeService is not available
      }

      setSuccess(`Sincronización ${enabled ? 'habilitada' : 'deshabilitada'}`);
      await fetchStatus();
    } catch (err: any) {
      logger.error('Error al cambiar estado de sincronización', err, 'api');
      setError(err?.response?.data?.detail || 'Error al cambiar estado de sincronización');
    } finally {
      setLoading(false);
    }
  };

  // Verificar si estamos en el callback de OAuth
  // Usar useRef para evitar procesar el callback múltiples veces (React Strict Mode)
  const callbackProcessed = React.useRef(false);

  useEffect(() => {
    // Si ya se procesó el callback, no hacer nada
    if (callbackProcessed.current) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      callbackProcessed.current = true;
      setError(`Error de autorización: ${error}`);
      setConnecting(false);
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      // Marcar como procesado inmediatamente para evitar doble procesamiento
      callbackProcessed.current = true;

      // Procesar el callback de OAuth
      const processCallback = async () => {
        try {
          setConnecting(true);
          setError(null);

          const redirectUri = `${window.location.origin}/profile`;

          logger.debug('Procesando callback de OAuth', { hasCode: !!code, redirectUri }, 'api');

          // Llamar al backend para intercambiar código por tokens
          await apiService.googleCalendar.api.post('/api/google-calendar/oauth/callback', {
            code,
            redirect_uri: redirectUri
          });

          // Track Google Calendar connection in Amplitude
          try {
            if (typeof AmplitudeService !== 'undefined' && AmplitudeService.track) {
              AmplitudeService.track('google_calendar_connected', {
                sync_enabled: true
              });
            }
          } catch (error) {
            // Silently fail if AmplitudeService is not available
          }

          setSuccess('Google Calendar conectado exitosamente');
          // Mostrar notificación toast en la esquina superior derecha
          toast.success('Google Calendar conectado exitosamente');
          await fetchStatus();
        } catch (err: any) {
          logger.error('Error al procesar callback de OAuth', err, 'api');
          const errorMessage = err?.response?.data?.detail || 'Error al conectar Google Calendar';

          // Si el error es "invalid_grant", sugerir reconectar
          if (errorMessage.includes('invalid_grant') || errorMessage.includes('código de autorización es inválido')) {
            setError('El código de autorización expiró o ya fue usado. Por favor, intenta conectar nuevamente.');
          } else {
            setError(errorMessage);
          }
        } finally {
          setConnecting(false);
          // Limpiar URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      processCallback();
    }
  }, []);

  if (loading && !status) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={100}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CalendarIcon color="primary" />
            <Typography variant="h6">Google Calendar</Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {status?.connected ? (
            <>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CheckCircleIcon color="success" />
                <Typography variant="body1" color="success.main">
                  Google Calendar conectado
                </Typography>
              </Box>

              {status.last_sync_at && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Última sincronización: {new Date(status.last_sync_at).toLocaleString('es-MX')}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={status.sync_enabled ?? true}
                    onChange={(e) => handleToggleSync(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Sincronización automática"
              />

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                Cuando está habilitada, las citas se sincronizan automáticamente con tu Google Calendar
              </Typography>

              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={handleDisconnectClick}
                disabled={loading}
              >
                Desconectar Google Calendar
              </Button>
            </>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Conecta tu Google Calendar para sincronizar automáticamente tus citas médicas.
                Las citas creadas, actualizadas o canceladas se reflejarán en tu calendario de Google.
              </Alert>

              <Button
                variant="contained"
                color="primary"
                startIcon={connecting ? <CircularProgress size={20} /> : <LinkIcon />}
                onClick={handleConnect}
                disabled={connecting || loading}
                fullWidth
              >
                {connecting ? 'Conectando...' : 'Conectar Google Calendar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={openDisconnectDialog}
        onClose={handleCloseDisconnectDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"¿Desconectar Google Calendar?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que deseas desconectar Google Calendar? Las citas futuras dejarán de sincronizarse y no se actualizarán automáticamente.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDisconnectDialog} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleConfirmDisconnect} color="error" autoFocus>
            Desconectar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GoogleCalendarSettings;

