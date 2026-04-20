import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { apiService } from '../../../services';
import {
  LLMTraceDetailResponse,
  LLMTraceDetailRow,
} from '../../../services/admin/LLMTracesService';

interface Props {
  traceId: string | null;
  onClose: () => void;
}

const PreBlock: React.FC<{ content?: string | null | Record<string, unknown> | unknown[] }> = ({ content }) => {
  if (content == null) {
    return (
      <Typography variant="body2" color="text.secondary" fontStyle="italic">
        (vacío)
      </Typography>
    );
  }
  const text =
    typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  return (
    <Box
      component="pre"
      sx={{
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        p: 1.5,
        bgcolor: 'grey.50',
        borderRadius: 1,
        m: 0,
        maxHeight: 400,
        overflow: 'auto',
      }}
    >
      {text}
    </Box>
  );
};

const formatMs = (v?: number | null) =>
  v == null ? '—' : v < 1000 ? `${v} ms` : `${(v / 1000).toFixed(2)} s`;
const formatUSD = (v?: number | null) =>
  v == null ? '—' : `$${v.toFixed(v < 0.01 ? 6 : 4)}`;

const TraceRow: React.FC<{ row: LLMTraceDetailRow; index: number; total: number }> = ({
  row,
  index,
  total,
}) => {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2">
          Paso {index + 1} / {total} · {row.model ?? 'gemini'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip size="small" label={formatMs(row.latency_ms)} />
          <Chip size="small" label={formatUSD(row.cost_usd)} />
          <Chip
            size="small"
            label={`${row.prompt_tokens ?? 0} → ${row.completion_tokens ?? 0} tok`}
          />
          {row.finish_reason && (
            <Chip size="small" label={row.finish_reason} variant="outlined" />
          )}
          {row.error && <Chip size="small" label="error" color="error" />}
        </Stack>
      </Stack>

      {row.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {row.error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        <Tab label="Input" />
        <Tab label="Response" />
        <Tab label={`Tools (${(row.tool_calls ?? []).length})`} />
        <Tab label="System" />
        <Tab label="History" />
        <Tab label="Meta" />
      </Tabs>
      <Divider sx={{ mb: 1.5 }} />

      {tab === 0 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Mensaje del usuario (descifrado)
          </Typography>
          <PreBlock content={row.user_input} />
        </Stack>
      )}
      {tab === 1 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Respuesta del modelo (descifrada)
          </Typography>
          <PreBlock content={row.response_text} />
        </Stack>
      )}
      {tab === 2 && (
        <Stack spacing={2}>
          {(row.tool_calls ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No hubo tool calls en este paso.
            </Typography>
          ) : (
            (row.tool_calls ?? []).map((call, i) => (
              <Box key={i}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  #{i + 1}: {call.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  args
                </Typography>
                <PreBlock content={call.args} />
                {(row.tool_results ?? [])[i] && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      result
                    </Typography>
                    <PreBlock content={(row.tool_results ?? [])[i].result as any} />
                  </>
                )}
              </Box>
            ))
          )}
        </Stack>
      )}
      {tab === 3 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            System prompt (no PHI)
          </Typography>
          <PreBlock content={row.system_prompt} />
          {row.tools_available && (
            <>
              <Typography variant="caption" color="text.secondary">
                Tools disponibles
              </Typography>
              <PreBlock content={row.tools_available} />
            </>
          )}
        </Stack>
      )}
      {tab === 4 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Conversation history enviada al modelo
          </Typography>
          <PreBlock content={row.conversation_history} />
        </Stack>
      )}
      {tab === 5 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Metadata
          </Typography>
          <PreBlock
            content={{
              id: row.id,
              created_at: row.created_at,
              trace_id: row.trace_id,
              source: row.source,
              user_id: row.user_id,
              patient_id: row.patient_id,
              session_id: row.session_id,
              ...row.metadata,
            }}
          />
        </Stack>
      )}
    </Box>
  );
};

export const LLMTraceDetailDrawer: React.FC<Props> = ({ traceId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LLMTraceDetailResponse | null>(null);

  useEffect(() => {
    if (!traceId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService.llmTraces
      .getTrace(traceId)
      .then((resp) => {
        if (!cancelled) setData(resp);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error cargando trace');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  return (
    <Drawer
      anchor="right"
      open={Boolean(traceId)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6">Trace</Typography>
            {traceId && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {traceId}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard.writeText(traceId)}
                  title="Copiar trace_id"
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Stack>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {data &&
          data.rows.map((row, i) => (
            <TraceRow key={row.id} row={row} index={i} total={data.rows.length} />
          ))}
      </Box>
    </Drawer>
  );
};

export default LLMTraceDetailDrawer;
