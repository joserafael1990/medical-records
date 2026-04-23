import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Description as XmlIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../../services';
import type { CfdiInvoice } from '../../services';
import { openBase64InNewTab, downloadBase64 } from '../../utils/base64File';
import { logger } from '../../utils/logger';
import { useSimpleToast } from '../common/ToastNotification';

const CANCEL_MOTIVES = [
  { code: '01', label: '01 — Comprobante emitido con errores con relación' },
  { code: '02', label: '02 — Comprobante emitido con errores sin relación' },
  { code: '03', label: '03 — No se llevó a cabo la operación' },
  { code: '04', label: '04 — Operación nominativa relacionada en factura global' },
];

interface CancelDialogState {
  open: boolean;
  invoiceId: number | null;
  motive: string;
  substituteUuid: string;
}

function statusChip(status: CfdiInvoice['status']) {
  switch (status) {
    case 'issued':
      return <Chip label="Emitida" color="success" size="small" />;
    case 'cancelled':
      return <Chip label="Cancelada" color="default" size="small" />;
    case 'error':
      return <Chip label="Error" color="error" size="small" />;
    default:
      return <Chip label={status} size="small" />;
  }
}

const InvoiceHistoryTable: React.FC = () => {
  const [invoices, setInvoices] = useState<CfdiInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState>({
    open: false,
    invoiceId: null,
    motive: '02',
    substituteUuid: '',
  });
  const toast = useSimpleToast();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.cfdi.listInvoices({ limit: 100 });
      setInvoices(data);
    } catch (err: any) {
      logger.error('Error listando facturas', err, 'api');
      setError(err?.message || 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handlePdf(inv: CfdiInvoice) {
    try {
      setBusyId(inv.id);
      const { base64 } = await apiService.cfdi.downloadPdf(inv.id);
      openBase64InNewTab(base64, 'application/pdf');
    } catch (err: any) {
      toast.error(err?.message || 'Error descargando PDF');
    } finally {
      setBusyId(null);
    }
  }

  async function handleXml(inv: CfdiInvoice) {
    try {
      setBusyId(inv.id);
      const { base64 } = await apiService.cfdi.downloadXml(inv.id);
      const filename = `${inv.serie || 'CORTEX'}-${inv.folio || inv.id}.xml`;
      downloadBase64(base64, filename, 'application/xml');
    } catch (err: any) {
      toast.error(err?.message || 'Error descargando XML');
    } finally {
      setBusyId(null);
    }
  }

  function openCancelDialog(id: number) {
    setCancelDialog({ open: true, invoiceId: id, motive: '02', substituteUuid: '' });
  }

  async function handleCancelConfirm() {
    if (!cancelDialog.invoiceId) return;
    try {
      setBusyId(cancelDialog.invoiceId);
      await apiService.cfdi.cancelInvoice(
        cancelDialog.invoiceId,
        cancelDialog.motive as '01' | '02' | '03' | '04',
        cancelDialog.motive === '01' ? cancelDialog.substituteUuid : undefined,
      );
      toast.success('Factura cancelada');
      setCancelDialog({ ...cancelDialog, open: false });
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cancelar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Historial de facturas
        </Typography>
        <IconButton size="small" onClick={refresh} disabled={loading} aria-label="Actualizar">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && invoices.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : invoices.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aún no has emitido facturas. Cuando emitas desde una consulta aparecerán aquí.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Serie-Folio</TableCell>
                <TableCell>Receptor</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell>
                    {inv.created_at
                      ? new Date(inv.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {inv.serie || 'CORTEX'}-{inv.folio || inv.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{inv.receptor_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inv.receptor_rfc}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    ${Number(inv.total).toFixed(2)} {inv.currency}
                  </TableCell>
                  <TableCell>{statusChip(inv.status)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver PDF">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handlePdf(inv)}
                          disabled={busyId === inv.id || !inv.facturama_id}
                        >
                          <PdfIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Descargar XML">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleXml(inv)}
                          disabled={busyId === inv.id || !inv.facturama_id}
                        >
                          <XmlIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={inv.status === 'issued' ? 'Cancelar' : 'No cancelable'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => openCancelDialog(inv.id)}
                          disabled={busyId === inv.id || inv.status !== 'issued'}
                          color="error"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Cancel dialog */}
      <Dialog
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ ...cancelDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancelar factura</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            La cancelación se envía al SAT. Si el CFDI tiene más de 24 horas o el receptor
            ya lo usó, el SAT puede requerir aceptación del receptor antes de completarla.
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            label="Motivo"
            value={cancelDialog.motive}
            onChange={(e) =>
              setCancelDialog({ ...cancelDialog, motive: e.target.value })
            }
            sx={{ mb: 2 }}
          >
            {CANCEL_MOTIVES.map((m) => (
              <MenuItem key={m.code} value={m.code}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
          {cancelDialog.motive === '01' && (
            <TextField
              fullWidth
              size="small"
              label="UUID del CFDI que sustituye"
              value={cancelDialog.substituteUuid}
              onChange={(e) =>
                setCancelDialog({ ...cancelDialog, substituteUuid: e.target.value })
              }
              helperText="Requerido para motivo 01"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog({ ...cancelDialog, open: false })}>
            Volver
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleCancelConfirm}
            disabled={
              busyId !== null ||
              (cancelDialog.motive === '01' && !cancelDialog.substituteUuid.trim())
            }
          >
            Confirmar cancelación
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoiceHistoryTable;
