import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { apiService } from '../../../services';
import {
  LLMTraceListItem,
  LLMTracesListFilters,
  LLMTracesStats,
} from '../../../services/admin/LLMTracesService';
import { LLMTraceDetailDrawer } from './LLMTraceDetailDrawer';

const SOURCES = [
  { value: '', label: 'Todos' },
  { value: 'doctor_assistant', label: 'Doctor Assistant' },
  { value: 'whatsapp_agent', label: 'WhatsApp Agent' },
  { value: 'transcribe', label: 'Transcripción' },
];

const DEFAULT_PAGE_SIZE = 50;

const formatNumber = (v?: number | null) => (v == null ? '—' : v.toLocaleString('es-MX'));
const formatUSD = (v?: number | null) =>
  v == null ? '—' : `$${v.toFixed(v < 0.01 ? 6 : 4)}`;
const formatMs = (v?: number | null) =>
  v == null ? '—' : v < 1000 ? `${v} ms` : `${(v / 1000).toFixed(2)} s`;
const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
};

export const LLMTracesView: React.FC = () => {
  const [filters, setFilters] = useState<LLMTracesListFilters>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  });
  const [items, setItems] = useState<LLMTraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LLMTracesStats | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const loadTraces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, statsResp] = await Promise.all([
        apiService.llmTraces.list(filters),
        apiService.llmTraces.getStats(filters.from, filters.to),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setStats(statsResp);
    } catch (err: any) {
      setError(err?.message || 'Error cargando traces');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  const updateFilter = (patch: Partial<LLMTracesListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page: page + 1 }));
  };

  const changePageSize = (size: number) => {
    setFilters((prev) => ({ ...prev, page: 1, page_size: size }));
  };

  const statsCards = useMemo(
    () => [
      { label: 'Llamadas', value: stats ? formatNumber(stats.total_calls) : '—' },
      { label: 'Costo total', value: stats ? formatUSD(stats.total_cost_usd) : '—' },
      {
        label: '% error',
        value: stats ? `${(stats.error_rate * 100).toFixed(1)}%` : '—',
      },
      {
        label: 'Latencia p95',
        value: stats ? formatMs(stats.latency_ms_p95) : '—',
      },
    ],
    [stats],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600}>
            Monitoreo LLM
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Observabilidad interna de llamadas a Gemini. Retención: 90 días. Admin-only.
          </Typography>
        </Box>
        <Tooltip title="Recargar">
          <IconButton onClick={loadTraces} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Grid container spacing={2} mb={2}>
        {statsCards.map((card) => (
          <Grid size={{ xs: 6, md: 3 }} key={card.label}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {card.label}
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {stats && stats.by_source.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Por fuente (últimos 30 días)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {stats.by_source.map((s) => (
              <Chip
                key={s.source}
                label={`${s.source}: ${s.count} · ${formatUSD(s.cost_usd)}${s.error_count > 0 ? ` · ${s.error_count} errores` : ''}`}
                color={s.error_count > 0 ? 'warning' : 'default'}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Fuente</InputLabel>
              <Select
                label="Fuente"
                value={filters.source ?? ''}
                onChange={(e) => updateFilter({ source: e.target.value || undefined })}
              >
                {SOURCES.map((s) => (
                  <MenuItem key={s.value || 'all'} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label="User ID"
              value={filters.user_id ?? ''}
              onChange={(e) =>
                updateFilter({
                  user_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              size="small"
              fullWidth
              type="datetime-local"
              label="Desde"
              InputLabelProps={{ shrink: true }}
              value={filters.from ?? ''}
              onChange={(e) => updateFilter({ from: e.target.value || undefined })}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              size="small"
              fullWidth
              type="datetime-local"
              label="Hasta"
              InputLabelProps={{ shrink: true }}
              value={filters.to ?? ''}
              onChange={(e) => updateFilter({ to: e.target.value || undefined })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.has_error === true}
                  onChange={(e) =>
                    updateFilter({ has_error: e.target.checked ? true : undefined })
                  }
                />
              }
              label="Solo con error"
            />
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Tiempo</TableCell>
              <TableCell>Fuente</TableCell>
              <TableCell>User</TableCell>
              <TableCell align="right">Tokens</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell align="right">Latencia</TableCell>
              <TableCell align="right">Tools</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sin resultados para los filtros actuales.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const totalTokens =
                  (item.prompt_tokens ?? 0) + (item.completion_tokens ?? 0);
                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedTraceId(item.trace_id)}
                  >
                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                    <TableCell>
                      <Chip label={item.source} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{item.user_id ?? '—'}</TableCell>
                    <TableCell align="right">{formatNumber(totalTokens || null)}</TableCell>
                    <TableCell align="right">{formatUSD(item.cost_usd)}</TableCell>
                    <TableCell align="right">{formatMs(item.latency_ms)}</TableCell>
                    <TableCell align="right">{item.tool_call_count}</TableCell>
                    <TableCell>
                      {item.has_error ? (
                        <Chip
                          icon={<ErrorOutlineIcon />}
                          label="error"
                          color="error"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="ok"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTraceId(item.trace_id);
                        }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={(filters.page ?? 1) - 1}
          onPageChange={(_, p) => goToPage(p)}
          rowsPerPage={filters.page_size ?? DEFAULT_PAGE_SIZE}
          onRowsPerPageChange={(e) => changePageSize(Number(e.target.value))}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="Filas:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      <LLMTraceDetailDrawer
        traceId={selectedTraceId}
        onClose={() => setSelectedTraceId(null)}
      />
    </Box>
  );
};

export default LLMTracesView;
