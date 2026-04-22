/**
 * SignatureProfileSection — tarjeta en el perfil del doctor para capturar
 * cédula profesional, RFC y CURP. Son los datos que la firma electrónica
 * incluye en el payload y el endpoint POST /sign exige (sin cédula válida,
 * el backend devuelve 400 "Registra tu cédula profesional...").
 *
 * Consume GET/PUT /api/doctor/signature-profile. Independiente de
 * DoctorProfileDialog para evitar tocar ese formulario grande.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Draw as DrawIcon,
  VerifiedUser as VerifiedIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { apiService } from '../../services';
import { useToast } from '../common/ToastNotification';
import { logger } from '../../utils/logger';

interface SignatureProfile {
  professional_license: string | null;
  rfc: string | null;
  curp: string | null;
  cedula_valid: boolean;
  rfc_valid: boolean;
  curp_valid: boolean;
  can_sign: boolean;
}

const EMPTY_PROFILE: SignatureProfile = {
  professional_license: '',
  rfc: '',
  curp: '',
  cedula_valid: false,
  rfc_valid: false,
  curp_valid: false,
  can_sign: false,
};

export const SignatureProfileSection: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState<SignatureProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.consultations.api.get('/api/doctor/signature-profile');
      setProfile({
        professional_license: res.data.professional_license ?? '',
        rfc: res.data.rfc ?? '',
        curp: res.data.curp ?? '',
        cedula_valid: !!res.data.cedula_valid,
        rfc_valid: !!res.data.rfc_valid,
        curp_valid: !!res.data.curp_valid,
        can_sign: !!res.data.can_sign,
      });
    } catch (err) {
      logger.error('Error loading signature profile', err, 'api');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiService.consultations.api.put('/api/doctor/signature-profile', {
        professional_license: profile.professional_license || null,
        rfc: profile.rfc || null,
        curp: profile.curp || null,
      });
      setProfile({
        professional_license: res.data.professional_license ?? '',
        rfc: res.data.rfc ?? '',
        curp: res.data.curp ?? '',
        cedula_valid: !!res.data.cedula_valid,
        rfc_valid: !!res.data.rfc_valid,
        curp_valid: !!res.data.curp_valid,
        can_sign: !!res.data.can_sign,
      });
      setEditing(false);
      showSuccess('Datos de firma guardados');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'No se pudieron guardar los datos';
      showError(detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card id="signature" sx={{ mt: 3, scrollMarginTop: 24 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="signature" sx={{ mt: 3, scrollMarginTop: 24 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DrawIcon color="primary" />
            Identidad profesional para firma electrónica
          </Typography>
          {profile.can_sign ? (
            <Chip icon={<VerifiedIcon />} label="Listo para firmar" color="success" size="small" />
          ) : (
            <Chip icon={<WarningIcon />} label="Falta cédula" color="warning" size="small" />
          )}
        </Box>

        <Alert severity="info" icon={false} sx={{ mb: 2, fontSize: '0.8rem' }}>
          Estos datos aparecen en la firma de recetas y órdenes médicas.
          La <strong>cédula profesional</strong> es obligatoria para poder firmar
          (requisito LGS Art. 240). RFC y CURP son opcionales pero recomendados
          para cumplir NOM-004 §7.1.
          <br />
          <Typography component="span" variant="caption" color="text.secondary">
            Firma electrónica simple conforme al Art. 89-bis del Código de
            Comercio. No equivale a firma electrónica avanzada (e.firma SAT).
          </Typography>
        </Alert>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={2}>
          <TextField
            label="Cédula profesional (SEP)"
            value={profile.professional_license ?? ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, professional_license: e.target.value.replace(/\D/g, '') }))
            }
            placeholder="7-8 dígitos"
            size="small"
            fullWidth
            disabled={!editing}
            helperText={
              profile.professional_license && !profile.cedula_valid
                ? 'Formato inválido — debe ser 6 a 10 dígitos numéricos.'
                : 'Número de registro ante la Dirección General de Profesiones (SEP).'
            }
            error={!!profile.professional_license && !profile.cedula_valid}
            inputProps={{ maxLength: 10 }}
          />

          <TextField
            label="RFC (persona física)"
            value={profile.rfc ?? ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))
            }
            placeholder="XAXX010101XXX"
            size="small"
            fullWidth
            disabled={!editing}
            helperText={
              profile.rfc && !profile.rfc_valid
                ? 'RFC inválido — formato: 4 letras + 6 dígitos + 3 alfanuméricos.'
                : 'Opcional. Facilita validación cruzada con SAT en auditoría.'
            }
            error={!!profile.rfc && !profile.rfc_valid}
            inputProps={{ maxLength: 13 }}
          />

          <TextField
            label="CURP"
            value={profile.curp ?? ''}
            onChange={(e) =>
              setProfile((p) => ({ ...p, curp: e.target.value.toUpperCase() }))
            }
            placeholder="XAXX010101HDFRRR00"
            size="small"
            fullWidth
            disabled={!editing}
            helperText={
              profile.curp && !profile.curp_valid
                ? 'CURP inválido — 18 caracteres, formato estándar RENAPO.'
                : 'Opcional. Requerido por NOM-004 §7.1 en el expediente.'
            }
            error={!!profile.curp && !profile.curp_valid}
            inputProps={{ maxLength: 18 }}
          />
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
          {editing ? (
            <>
              <Button
                onClick={() => {
                  setEditing(false);
                  load();
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </>
          ) : (
            <Button variant="outlined" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default SignatureProfileSection;
