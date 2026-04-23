/**
 * Public page that renders one of CORTEX's legal documents:
 *   - platform_privacy (Aviso de Privacidad de la Plataforma)
 *   - tos (Términos y Condiciones)
 *   - dpa (Contrato de Encargo del Tratamiento)
 *
 * Used by the signup clickwrap: cada checkbox abre este componente en una
 * pestaña nueva apuntando al tipo que corresponde. Sin auth.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { Gavel as GavelIcon } from '@mui/icons-material';
import { apiService } from '../../services';
import type { LegalDocument, LegalDocumentType } from '../../types';

interface PublicLegalDocumentProps {
  docType: LegalDocumentType;
}

export const PublicLegalDocument: React.FC<PublicLegalDocumentProps> = ({ docType }) => {
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiService.patients.api.get('/api/legal/current');
        const payload = response.data as Record<LegalDocumentType, LegalDocument | undefined>;
        const picked = payload?.[docType];
        if (!picked) {
          throw new Error('Documento legal no disponible.');
        }
        setDoc(picked);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Error al cargar el documento legal.',
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [docType]);

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error || !doc) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">{error || 'Documento no disponible.'}</Alert>
      </Container>
    );
  }

  const rendered = doc.content.replace('{{effective_date}}', doc.effective_date || '');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{ mb: 4, p: 3, borderRadius: 2, bgcolor: 'primary.main', color: 'white' }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <GavelIcon sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {doc.title}
            </Typography>
            <Typography variant="subtitle1">Documento legal de la plataforma CORTEX</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1} mt={2}>
          <Chip
            label={`Versión ${doc.version}`}
            sx={{ bgcolor: 'white', color: 'primary.main' }}
            size="small"
          />
          <Chip
            label={`Vigente desde: ${doc.effective_date}`}
            sx={{ bgcolor: 'white', color: 'primary.main' }}
            size="small"
          />
        </Box>
      </Paper>

      <Card variant="outlined">
        <CardContent>
          <Typography
            variant="body1"
            component="div"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
          >
            {rendered}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PublicLegalDocument;
