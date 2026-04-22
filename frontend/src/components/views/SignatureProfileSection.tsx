/**
 * SignatureProfileSection — status card que muestra si el doctor está listo
 * para firmar recetas y órdenes. NO captura datos (eso se hace en el flujo
 * tradicional de Documentos profesionales / DoctorProfileDialog). Solo lee
 * GET /api/doctor/signature-profile, que resuelve cédula/CURP/RFC con
 * fallback a PersonDocument legacy — por eso aparece "Listo para firmar"
 * aunque el doctor nunca haya tocado esta sección.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Link,
} from '@mui/material';
import {
  Draw as DrawIcon,
  VerifiedUser as VerifiedIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { apiService } from '../../services';
import { logger } from '../../utils/logger';

interface SignatureProfile {
  professional_license: string | null;
  rfc: string | null;
  curp: string | null;
  cedula_valid: boolean;
  rfc_valid: boolean;
  curp_valid: boolean;
  can_sign: boolean;
  source: 'direct' | 'legacy_documents';
}

export const SignatureProfileSection: React.FC = () => {
  const [profile, setProfile] = useState<SignatureProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.consultations.api.get('/api/doctor/signature-profile');
      setProfile(res.data);
    } catch (err) {
      logger.error('Error loading signature profile', err, 'api');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card id="signature" sx={{ mt: 3, scrollMarginTop: 24 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  const maskedCedula = profile.professional_license || '—';
  const canSign = profile.can_sign;

  return (
    <Card id="signature" sx={{ mt: 3, scrollMarginTop: 24 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DrawIcon color="primary" />
            Firma electrónica
          </Typography>
          {canSign ? (
            <Chip icon={<VerifiedIcon />} label="Listo para firmar" color="success" size="small" />
          ) : (
            <Chip icon={<WarningIcon />} label="Falta cédula" color="warning" size="small" />
          )}
        </Box>

        {canSign ? (
          <Alert severity="success" icon={false} sx={{ mb: 0 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Estás listo para firmar recetas y órdenes de estudios. La firma
              se emitirá con tu cédula profesional <strong>{maskedCedula}</strong>
              {profile.curp_valid && <> y tu CURP.</>}
              {!profile.curp_valid && '.'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Firma electrónica simple conforme al Art. 89-bis del Código de
              Comercio. No equivale a firma electrónica avanzada (e.firma SAT)
              ni a conservación NOM-151-SCFI-2016.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="warning" icon={false}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Aún no puedes firmar documentos. Agrega tu{' '}
              <strong>cédula profesional</strong> en{' '}
              <Link
                component="button"
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  // DoctorProfileDialog se abre desde "Editar Datos" en el header;
                  // si el user hace scroll arriba lo encuentra.
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Editar Datos
              </Link>{' '}
              (sección "Documentos profesionales"). Una vez guardada, esta
              tarjeta cambiará a "Listo para firmar" automáticamente.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Requisito LGS Art. 240 para emitir recetas médicas electrónicas.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SignatureProfileSection;
