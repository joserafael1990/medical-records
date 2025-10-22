/**
 * Public Privacy Notice Page
 * 
 * Public-facing page that displays the active privacy notice
 * No authentication required - can be shared via link or QR code
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Security as SecurityIcon,
  Gavel as GavelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import type { PrivacyNotice } from '../../types';

export const PublicPrivacyNotice: React.FC = () => {
  const [notice, setNotice] = useState<PrivacyNotice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicNotice();
  }, []);

  const fetchPublicNotice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // This endpoint doesn't require authentication
      const response = await apiService.get('/api/privacy/public-notice');
      console.log('✅ Public privacy notice loaded:', response);
      setNotice(response);
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al cargar el aviso de privacidad';
      console.error('❌ Error loading public notice:', errorMsg);
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
              Sistema de Historias Clínicas Electrónicas
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
      {notice.summary && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <InfoIcon color="info" />
              <Typography variant="h6" fontWeight={500}>
                Resumen
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {notice.summary}
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
          Última actualización: {formatDate(notice.updated_at)}
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

