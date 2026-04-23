import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CloudUpload as UploadIcon,
  DeleteForever as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { apiService } from '../../services';
import type { CfdiIssuer, CfdiIssuerInput } from '../../services';
import { logger } from '../../utils/logger';
import { useSimpleToast } from '../common/ToastNotification';

// Catálogo mínimo de regímenes SAT (los más comunes para médicos)
const TAX_REGIMES: { code: string; label: string }[] = [
  { code: '612', label: '612 — Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '605', label: '605 — Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', label: '606 — Arrendamiento' },
  { code: '608', label: '608 — Demás ingresos' },
  { code: '621', label: '621 — Incorporación Fiscal' },
  { code: '625', label: '625 — Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { code: '626', label: '626 — Régimen Simplificado de Confianza (RESICO PF)' },
];

const emptyInput: CfdiIssuerInput = {
  rfc: '',
  legal_name: '',
  tax_regime: '612',
  postal_code: '',
  invoice_series: 'CORTEX',
};

const CfdiSettings: React.FC = () => {
  const [issuer, setIssuer] = useState<CfdiIssuer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CfdiIssuerInput>(emptyInput);
  const [error, setError] = useState<string | null>(null);

  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [csdPassword, setCsdPassword] = useState('');
  const [showCsdPassword, setShowCsdPassword] = useState(false);
  const [uploadingCsd, setUploadingCsd] = useState(false);

  const toast = useSimpleToast();

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.cfdi.getIssuer();
      setIssuer(data);
      if (data) {
        setForm({
          rfc: data.rfc,
          legal_name: data.legal_name,
          tax_regime: data.tax_regime,
          postal_code: data.postal_code,
          invoice_series: data.invoice_series ?? 'CORTEX',
        });
      }
    } catch (err: any) {
      logger.error('Error cargando perfil fiscal', err, 'api');
      setError(err?.message || 'No se pudo cargar el perfil fiscal');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      setSaving(true);
      setError(null);
      const saved = issuer
        ? await apiService.cfdi.updateIssuer(form)
        : await apiService.cfdi.createIssuer(form);
      setIssuer(saved);
      toast.success('Perfil fiscal guardado');
    } catch (err: any) {
      logger.error('Error guardando perfil fiscal', err, 'api');
      setError(err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCsd() {
    if (!cerFile || !keyFile || !csdPassword) {
      setError('Sube .cer, .key y escribe el password de tu CSD');
      return;
    }
    try {
      setUploadingCsd(true);
      setError(null);
      const updated = await apiService.cfdi.uploadCsd({
        cer_file: cerFile,
        key_file: keyFile,
        password: csdPassword,
      });
      setIssuer(updated);
      setCerFile(null);
      setKeyFile(null);
      setCsdPassword('');
      toast.success('CSD cargado. Ya puedes emitir facturas.');
    } catch (err: any) {
      logger.error('Error subiendo CSD', err, 'api');
      setError(err?.message || 'No se pudo registrar el CSD');
    } finally {
      setUploadingCsd(false);
    }
  }

  async function handleDeleteCsd() {
    if (!window.confirm('¿Eliminar CSD? Dejarás de poder emitir facturas hasta subir uno nuevo.')) {
      return;
    }
    try {
      setSaving(true);
      const updated = await apiService.cfdi.deleteCsd();
      setIssuer(updated);
      toast.success('CSD eliminado');
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Cargando perfil fiscal…</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 3, borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Facturación CFDI 4.0
          </Typography>
          {issuer?.is_active ? (
            <Chip
              icon={<CheckCircleIcon />}
              color="success"
              label="Listo para facturar"
              size="small"
            />
          ) : (
            <Chip
              icon={<WarningIcon />}
              color="warning"
              label={issuer ? 'Falta CSD' : 'No configurado'}
              size="small"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Emite facturas electrónicas a tus pacientes directamente desde CORTEX.
          Los CSDs se almacenan cifrados y sólo se usan para sellar CFDIs.
        </Typography>

        <Alert severity="info" icon={false} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
            Aviso importante
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.5 }}>
            CORTEX emite CFDIs conforme a los datos que captures y los transmite al SAT a través
            de Facturama (PAC autorizado). <strong>No sustituye asesoría contable o fiscal.</strong>
            {' '}Tú eres responsable de verificar régimen fiscal, clave SAT, uso CFDI y cumplimiento
            de obligaciones accesorias (declaraciones ISR, DIOT, etc.) con tu contador. CORTEX
            no declara impuestos ni asume la responsabilidad fiscal de tus comprobantes.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Datos fiscales
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="RFC"
              value={form.rfc}
              onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
              inputProps={{ maxLength: 13 }}
              placeholder="XAXX010101000"
              helperText="13 caracteres. Debe coincidir con el RFC de tu CSD."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              size="small"
              label="Razón social"
              value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              helperText="Nombre legal tal como aparece en tu Constancia de Situación Fiscal (sin 'SA de CV' ni régimen)."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Régimen fiscal"
              value={form.tax_regime}
              onChange={(e) => setForm({ ...form, tax_regime: e.target.value })}
              helperText="El que el SAT te asignó. Médicos típicamente usan 612 o 626 (RESICO)."
            >
              {TAX_REGIMES.map((tr) => (
                <MenuItem key={tr.code} value={tr.code}>
                  {tr.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="C.P. fiscal"
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
              inputProps={{ maxLength: 5 }}
              helperText="C.P. de tu domicilio fiscal (Constancia SAT)."
            />
          </Grid>
          {/* "Serie" es un concepto fiscal confuso para médicos. El backend
              guarda "CORTEX" por default y eso basta para el 99% de los casos.
              Si algún día se necesita, se expone detrás de "Configuración avanzada". */}
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={saving || !form.rfc || !form.legal_name || !form.postal_code}
          >
            {saving ? 'Guardando…' : issuer ? 'Actualizar perfil' : 'Guardar perfil'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Certificados de Sello Digital (CSD)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Descarga tus CSDs desde el portal del SAT (es distinto de tu e.firma).
          Se guardan cifrados con AES-256 y sólo se usan para firmar CFDIs.
        </Typography>

        {issuer?.has_csd ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip icon={<CheckCircleIcon />} color="success" label="CSD cargado" />
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteCsd}
              size="small"
            >
              Eliminar CSD
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {cerFile ? cerFile.name : 'Archivo .cer'}
                <input
                  hidden
                  type="file"
                  accept=".cer"
                  onChange={(e) => setCerFile(e.target.files?.[0] ?? null)}
                />
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {keyFile ? keyFile.name : 'Archivo .key'}
                <input
                  hidden
                  type="file"
                  accept=".key"
                  onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)}
                />
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type={showCsdPassword ? 'text' : 'password'}
                label="Contraseña del CSD"
                value={csdPassword}
                onChange={(e) => setCsdPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        aria-label={showCsdPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowCsdPassword((v) => !v)}
                      >
                        {showCsdPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                fullWidth
                variant="contained"
                disabled={uploadingCsd || !issuer || !cerFile || !keyFile || !csdPassword}
                onClick={handleUploadCsd}
              >
                {uploadingCsd ? 'Registrando…' : 'Registrar CSD'}
              </Button>
              {!issuer && (
                <Typography variant="caption" color="text.secondary">
                  Guarda primero tu perfil fiscal.
                </Typography>
              )}
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default CfdiSettings;
