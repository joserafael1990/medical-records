import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Drawer,
  Fab,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import type { AssistantChatResponse, AssistantToolCall } from '../../services/ApiService';
import { logger } from '../../utils/logger';

interface AssistantPanelProps {
  /** Patient currently open in the main view, if any — passed as context to the bot. */
  currentPatientId?: number | null;
}

type Role = 'user' | 'assistant' | 'system';

interface Message {
  role: Role;
  text: string;
  toolCalls?: AssistantToolCall[];
}

const DISCLAIMER =
  'Asistente informativo. Verifica siempre con el expediente. No ofrece recomendaciones clínicas.';

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ currentPatientId = null }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || loading) return;
    setDraft('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    try {
      const res: AssistantChatResponse = await apiService.assistant.chat({
        message: trimmed,
        conversation_id: conversationId,
        current_patient_id: currentPatientId,
      });
      setConversationId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply, toolCalls: res.tool_calls },
      ]);
      if (res.sandbox) {
        // Surface sandbox mode once, the first time.
        setMessages((prev) =>
          prev.some((m) => m.role === 'system')
            ? prev
            : [
                {
                  role: 'system',
                  text:
                    'Modo sandbox activo — respuestas simuladas, sin llamadas a Gemini.',
                },
                ...prev,
              ]
        );
      }
    } catch (err) {
      logger.error('AssistantPanel chat failed', err, 'ui');
      setError(
        'No pude procesar tu pregunta. Revisa tu conexión o intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }, [draft, loading, conversationId, currentPatientId]);

  const handleReset = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Tooltip title="Asistente CORTEX">
        <Fab
          color="primary"
          aria-label="Abrir asistente"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            // Offset above Sentry's "Reportar un problema" feedback widget
            // (which also pins itself to bottom-right and was overlapping this FAB).
            bottom: 88,
            right: 24,
            zIndex: (t) => t.zIndex.drawer - 1,
          }}
        >
          <BotIcon />
        </Fab>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 420 } },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <BotIcon color="primary" />
            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Asistente CORTEX
            </Typography>
            <Tooltip title="Nueva conversación">
              <span>
                <IconButton
                  size="small"
                  onClick={handleReset}
                  disabled={messages.length === 0}
                  aria-label="Reiniciar conversación"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Alert severity="info" sx={{ m: 2, mb: 0 }}>
            {DISCLAIMER}
          </Alert>

          <Box
            ref={scrollRef}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              px: 2,
              py: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                Pregúntame sobre tus pacientes, consultas recientes o
                medicamentos.
                <br />
                Ejemplo: "Resume la historia de Juan Pérez".
              </Typography>
            )}
            {messages.map((m, idx) => (
              <MessageBubble key={idx} message={m} />
            ))}
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Pensando…</Typography>
              </Box>
            )}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Box>

          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder="Escribe tu pregunta…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleSend}
                      disabled={loading || draft.trim().length === 0}
                      aria-label="Enviar"
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  return (
    <Paper
      elevation={0}
      sx={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        px: 1.5,
        py: 1,
        bgcolor: isSystem
          ? 'warning.light'
          : isUser
          ? 'primary.main'
          : 'grey.100',
        color: isUser ? 'primary.contrastText' : 'text.primary',
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {message.text}
      </Typography>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.5, opacity: 0.75, fontStyle: 'italic' }}
        >
          {`Consultas internas: ${message.toolCalls.map((t) => t.name).join(', ')}`}
        </Typography>
      )}
    </Paper>
  );
};

export default AssistantPanel;
