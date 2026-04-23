/**
 * Public Privacy Notice Page
 * 
 * Public-facing page that displays the active privacy notice
 * No authentication required - can be shared via link or QR code
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Security as SecurityIcon,
  Gavel as GavelIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { apiService } from '../../services';
import type { PrivacyNotice } from '../../types';

// Parse once at module load — no need to re-run on re-render.
const urlParams = new URLSearchParams(window.location.search);
const CONSENT_ID_FROM_URL = urlParams.get('consent');

type AcceptanceState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'accepted'; at: string | null }
  | { kind: 'error'; message: string };

export const PublicPrivacyNotice: React.FC = () => {
  const [notice, setNotice] = useState<PrivacyNotice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptance, setAcceptance] = useState<AcceptanceState>({ kind: 'idle' });
  // Doble acto afirmativo bajo LFPDPPP Art. 9 (datos sensibles): el checkbox
  // obligatorio ANTES del botón Acepto refuerza la prueba de voluntad
  // ("leí" + "acepto" = dos actos separados).
  const [hasReadNotice, setHasReadNotice] = useState(false);

  useEffect(() => {
    fetchPublicNotice();
  }, []);

  const handleAccept = async () => {
    if (!notice || !notice.content_hash || !CONSENT_ID_FROM_URL) return;
    setAcceptance({ kind: 'submitting' });
    try {
      const response = await apiService.patients.api.post('/api/privacy/accept-public', {
        consent_id: Number(CONSENT_ID_FROM_URL),
        content_hash: notice.content_hash,
      });
      const data = response.data;
      if (data?.success) {
        setAcceptance({ kind: 'accepted', at: data.accepted_at || null });
      } else {
        setAcceptance({ kind: 'error', message: 'No se pudo registrar tu aceptación.' });
      }
    } catch (err: any) {
      setAcceptance({
        kind: 'error',
        message:
          err?.response?.data?.detail ||
          err?.message ||
          'Error al registrar aceptación.',
      });
    }
  };

  const fetchPublicNotice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Soporte de slug por-doctor (?doctor=PERSON_CODE): si está presente
      // renderiza el aviso del médico específico al paciente; si no, el
      // backend devuelve el aviso propio de la plataforma CORTEX.
      const params = new URLSearchParams(window.location.search);
      const doctorSlug = params.get('doctor');
      const consentId = params.get('consent');
      const qs: string[] = [];
      if (doctorSlug) qs.push(`doctor=${encodeURIComponent(doctorSlug)}`);
      if (consentId) qs.push(`consent=${encodeURIComponent(consentId)}`);
      const url = '/api/privacy/public-notice' + (qs.length ? `?${qs.join('&')}` : '');

      const response = await apiService.patients.api.get(url);
      const noticeData = response.data;

      if (!noticeData) {
        throw new Error('No data received from API');
      }

      const mappedNotice: PrivacyNotice = {
        id: noticeData.id,
        version: noticeData.version || '',
        title: noticeData.title || '',
        content: noticeData.content || '',
        short_summary: noticeData.short_summary || noticeData.summary,
        effective_date: noticeData.effective_date || '',
        expiration_date: noticeData.expiration_date,
        is_active: noticeData.is_active !== undefined ? noticeData.is_active : true,
        created_at: noticeData.created_at || noticeData.effective_date || '',
        updated_at: noticeData.updated_at,
        kind: noticeData.kind,
        content_hash: noticeData.content_hash,
        doctor_slug: noticeData.doctor_slug,
        consent_state: noticeData.consent_state,
      };

      setNotice(mappedNotice);

      // Si el consent ya fue aceptado previamente, reflejarlo sin
      // esperar al click del botón.
      if (noticeData.consent_state?.already_accepted) {
        setAcceptance({
          kind: 'accepted',
          at: noticeData.consent_state.accepted_at || null,
        });
      }
    } catch (err: any) {
      // Axios wraps HTTP errors: el detail real está en err.response.data.detail
      const errorMsg =
        err?.response?.data?.detail ||
        err?.detail ||
        err?.message ||
        'Error al cargar el aviso de privacidad';
      console.error('Error loading public notice:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error || !notice) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'No se encontró el aviso de privacidad'}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Si el problema persiste, por favor contacte al responsable del tratamiento de datos.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ mb: 4, p: 3, borderRadius: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <SecurityIcon sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {notice.title}
            </Typography>
            <Typography variant="subtitle1">
              {notice.kind === 'platform_privacy'
                ? 'Plataforma CORTEX — Aviso para usuarios médicos'
                : 'Aviso del médico responsable al paciente'}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
          <Chip
            label={`Versión ${notice.version}`}
            sx={{ bgcolor: 'white', color: 'primary.main' }}
            size="small"
          />
          <Chip
            label={`Vigente desde: ${formatDate(notice.effective_date)}`}
            sx={{ bgcolor: 'white', color: 'primary.main' }}
            size="small"
          />
          {notice.expiration_date && (
            <Chip
              label={`Vigente hasta: ${formatDate(notice.expiration_date)}`}
              sx={{ bgcolor: 'white', color: 'primary.main' }}
              size="small"
            />
          )}
        </Box>
      </Paper>

      {/* Summary */}
      {notice.short_summary && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <InfoIcon color="info" />
              <Typography variant="h6" fontWeight={500}>
                Resumen
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {notice.short_summary}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="body1"
            component="div"
            sx={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.8
            }}
          >
            {notice.content}
          </Typography>
        </CardContent>
      </Card>

      {/* Web-form acceptance block — solo si venimos con ?consent=<id>
          en la URL y la respuesta del backend nos dio consent_state. */}
      {CONSENT_ID_FROM_URL && notice.consent_state && notice.kind === 'doctor_patient_notice' && (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderColor: acceptance.kind === 'accepted' ? 'success.main' : 'primary.main',
            borderWidth: 2,
          }}
        >
          <CardContent>
            {notice.consent_state.not_found ? (
              <Alert severity="error">
                Este enlace de consentimiento no es válido o ha expirado. Solicite uno
                nuevo a su médico.
              </Alert>
            ) : acceptance.kind === 'accepted' ? (
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} color="success.main">
                    Consentimiento registrado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {acceptance.at
                      ? `Aceptado el ${formatDate(acceptance.at)}`
                      : 'Gracias por aceptar.'}
                  </Typography>
                </Box>
              </Box>
            ) : notice.consent_state.hash_matches === false ? (
              <Alert severity="warning">
                El aviso que está viendo corresponde a una versión distinta a la enviada
                por su médico. Recargue la página o solicite un enlace nuevo.
              </Alert>
            ) : (
              <Box>
                {notice.consent_state.patient_first_name && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Hola{' '}
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {notice.consent_state.patient_first_name}
                    </Box>
                    , al marcar la casilla y presionar "Acepto" confirmas que
                    eres tú quien otorga este consentimiento.
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Conforme al artículo 8 y 9 de la LFPDPPP (datos sensibles),
                  se requiere manifestación expresa de voluntad.
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasReadNotice}
                      onChange={(e) => setHasReadNotice(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      He leído y entiendo el aviso de privacidad
                    </Typography>
                  }
                  sx={{ mb: 2, alignItems: 'flex-start', display: 'flex' }}
                />

                {acceptance.kind === 'error' && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {acceptance.message}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  disabled={!hasReadNotice || acceptance.kind === 'submitting'}
                  startIcon={
                    acceptance.kind === 'submitting' ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                  onClick={handleAccept}
                >
                  {acceptance.kind === 'submitting' ? 'Registrando…' : 'Acepto'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* ARCO Rights Info */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'info.lighter' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <GavelIcon color="info" />
            <Typography variant="h6" fontWeight={500}>
              Derechos ARCO
            </Typography>
          </Box>
          <Typography variant="body2" paragraph>
            Usted tiene derecho a ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
            respecto a sus datos personales. Para ejercer estos derechos, por favor contacte a su médico tratante
            o al responsable del sistema.
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            Plazo de respuesta: 20 días hábiles según la LFPDPPP
          </Typography>
        </CardContent>
      </Card>

      {/* Legal Footer */}
      <Divider sx={{ my: 3 }} />
      
      <Box textAlign="center">
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Este aviso de privacidad cumple con la Ley Federal de Protección de Datos Personales
          en Posesión de Particulares (LFPDPPP) y su Reglamento.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Última actualización: {formatDate(notice.created_at)}
        </Typography>
      </Box>

      {/* Print-friendly version note */}
      <Box mt={4} p={2} bgcolor="grey.100" borderRadius={1}>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          💡 Para guardar o imprimir este aviso, use la función de impresión de su navegador (Ctrl+P / Cmd+P)
        </Typography>
      </Box>
    </Container>
  );
};

export default PublicPrivacyNotice;

