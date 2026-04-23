import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Receipt as ReceiptIcon } from '@mui/icons-material';
import { apiService } from '../../services';
import type { CfdiInvoice, CfdiInvoiceInput } from '../../services';
import { logger } from '../../utils/logger';

const USO_CFDI_OPTIONS = [
  { code: 'D01', label: 'D01 — Honorarios médicos, dentales y gastos hospitalarios' },
  { code: 'G03', label: 'G03 — Gastos en general' },
  { code: 'S01', label: 'S01 — Sin efectos fiscales (público en general)' },
  { code: 'P01', label: 'P01 — Por definir' },
];

const FORMA_PAGO_OPTIONS = [
  { code: '01', label: '01 — Efectivo' },
  { code: '02', label: '02 — Cheque nominativo' },
  { code: '03', label: '03 — Transferencia electrónica' },
  { code: '04', label: '04 — Tarjeta de crédito' },
  { code: '28', label: '28 — Tarjeta de débito' },
  { code: '99', label: '99 — Por definir' },
];

// Régimen fiscal SAT del RECEPTOR (paciente o empresa que recibe la factura).
// Incluye los que aplican típicamente a pacientes particulares (605, 612, 626)
// y a empresas/aseguradoras (601, 603). Fuente: catálogo c_RegimenFiscal SAT.
const TAX_REGIMES_RECEPTOR = [
  { code: '601', label: '601 — General de Ley Personas Morales' },
  { code: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
  { code: '605', label: '605 — Sueldos y Salarios (asalariados)' },
  { code: '606', label: '606 — Arrendamiento' },
  { code: '608', label: '608 — Demás ingresos' },
  { code: '612', label: '612 — Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '614', label: '614 — Ingresos por intereses' },
  { code: '616', label: '616 — Sin obligaciones fiscales' },
  { code: '621', label: '621 — Incorporación Fiscal' },
  { code: '625', label: '625 — Plataformas Tecnológicas' },
  { code: '626', label: '626 — Régimen Simplificado de Confianza (RESICO PF)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  consultationId?: number | null;
  patientId?: number | null;
  patientName?: string;
  patientRfc?: string | null;
  onEmitted?: (invoice: CfdiInvoice) => void;
}

const InvoiceDialog: React.FC<Props> = ({
  open,
  onClose,
  consultationId,
  patientId,
  patientName,
  patientRfc,
  onEmitted,
}) => {
  const [form, setForm] = useState<CfdiInvoiceInput>({
    consultation_id: consultationId ?? undefined,
    patient_id: patientId ?? undefined,
    receptor_rfc: patientRfc || '',
    receptor_name: patientName || '',
    receptor_postal_code: '',
    receptor_tax_regime: '',
    cfdi_use: 'D01',
    subtotal: 0,
    currency: 'MXN',
    payment_form: '03',
    payment_method: 'PUE',
    service_description: 'Consulta médica',
    sat_product_code: '85121501',
    sat_unit_code: 'E48',
  });
  const [emitting, setEmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setError(null);
      setForm((prev) => ({
        ...prev,
        consultation_id: consultationId ?? undefined,
        patient_id: patientId ?? undefined,
        receptor_rfc: patientRfc || '',
        receptor_name: patientName || '',
      }));
    }
  }, [open, consultationId, patientId, patientName, patientRfc]);

  const isPublic =
    !form.receptor_rfc ||
    form.receptor_rfc.trim().toUpperCase() === 'XAXX010101000';

  async function handleEmit() {
    if (!form.subtotal || form.subtotal <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    try {
      setEmitting(true);
      setError(null);
      const payload: CfdiInvoiceInput = {
        ...form,
        receptor_rfc: form.receptor_rfc?.trim().toUpperCase() || undefined,
        cfdi_use: isPublic ? 'S01' : form.cfdi_use,
      };
      const invoice = await apiService.cfdi.createInvoice(payload);
      onEmitted?.(invoice);
      onClose();
    } catch (err: any) {
      logger.error('Error emitiendo CFDI', err, 'api');
      setError(err?.message || 'No se pudo emitir la factura');
    } finally {
      setEmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptIcon color="primary" /> Emitir factura CFDI
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Receptor
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Si dejas el RFC vacío, se emitirá a "Público en general" (XAXX010101000).
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="RFC del paciente"
              value={form.receptor_rfc || ''}
              onChange={(e) =>
                setForm({ ...form, receptor_rfc: e.target.value.toUpperCase() })
              }
              inputProps={{ maxLength: 13 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              size="small"
              label="Razón social / Nombre"
              value={form.receptor_name || ''}
              onChange={(e) => setForm({ ...form, receptor_name: e.target.value })}
              disabled={isPublic}
              placeholder={isPublic ? 'PUBLICO EN GENERAL (automático)' : ''}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="C.P. del receptor"
              value={form.receptor_postal_code || ''}
              onChange={(e) =>
                setForm({ ...form, receptor_postal_code: e.target.value })
              }
              inputProps={{ maxLength: 5 }}
              disabled={isPublic}
              helperText={isPublic ? 'Usará el C.P. del emisor' : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Régimen fiscal del receptor"
              value={isPublic ? '616' : (form.receptor_tax_regime || '')}
              onChange={(e) =>
                setForm({ ...form, receptor_tax_regime: e.target.value })
              }
              disabled={isPublic}
              helperText={
                isPublic
                  ? '616 automático (público en general)'
                  : 'Debe coincidir con la Constancia Fiscal del paciente'
              }
            >
              <MenuItem value="">
                <em>Selecciona…</em>
              </MenuItem>
              {TAX_REGIMES_RECEPTOR.map((tr) => (
                <MenuItem key={tr.code} value={tr.code}>
                  {tr.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Uso CFDI"
              value={isPublic ? 'S01' : form.cfdi_use || 'D01'}
              onChange={(e) => setForm({ ...form, cfdi_use: e.target.value })}
              disabled={isPublic}
            >
              {USO_CFDI_OPTIONS.map((o) => (
                <MenuItem key={o.code} value={o.code}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
          Concepto e importe
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Descripción del servicio"
              value={form.service_description}
              onChange={(e) => setForm({ ...form, service_description: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Monto (MXN)"
              type="number"
              value={form.subtotal || ''}
              onChange={(e) =>
                setForm({ ...form, subtotal: parseFloat(e.target.value) || 0 })
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Honorarios médicos: 0% IVA (Art. 15 LIVA)"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Forma de pago"
              value={form.payment_form || '03'}
              onChange={(e) => setForm({ ...form, payment_form: e.target.value })}
            >
              {FORMA_PAGO_OPTIONS.map((o) => (
                <MenuItem key={o.code} value={o.code}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Método de pago"
              value={form.payment_method || 'PUE'}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <MenuItem value="PUE">PUE — Pago en una sola exhibición</MenuItem>
              <MenuItem value="PPD">PPD — Pago en parcialidades o diferido</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Clave SAT del servicio"
              value={form.sat_product_code || '85121501'}
              onChange={(e) => setForm({ ...form, sat_product_code: e.target.value })}
              helperText="85121501 = Medicina general"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total a facturar: <strong>${(form.subtotal || 0).toFixed(2)} MXN</strong>
          </Typography>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 2, lineHeight: 1.5 }}
        >
          Al emitir certificas que los datos (RFC y datos fiscales del receptor, uso CFDI, monto,
          clave SAT del servicio) son correctos. CORTEX timbra lo que capturas; no valida tu
          régimen fiscal ni declara impuestos por ti. Consulta a tu contador si tienes dudas.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={emitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleEmit}
          disabled={emitting || !form.subtotal || !form.service_description}
        >
          {emitting ? 'Timbrando…' : 'Emitir CFDI'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDialog;
