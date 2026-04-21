import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  Fab,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  AddCircleOutline as NewChatIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import type {
  AssistantChatResponse,
  AssistantToolCall,
  AssistantConversationSummary,
} from '../../services/ApiService';
import { logger } from '../../utils/logger';

interface AssistantPanelProps {
  /** Patient currently open in the main view, if any — passed as context to the bot. */
  currentPatientId?: number | null;
  /** Called when the user clicks a [[PATIENT:id:name]] link in a bot reply. */
  onNavigateToPatient?: (patientId: number) => void;
}

type Role = 'user' | 'assistant' | 'system';

interface Message {
  role: Role;
  text: string;
  toolCalls?: AssistantToolCall[];
}

const DISCLAIMER =
  'Asistente informativo. Verifica siempre con el expediente. No ofrece recomendaciones clínicas.';

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  currentPatientId = null,
  onNavigateToPatient,
}) => {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Hide Sentry feedback widget while panel is open so it doesn't overlap the input.
  useEffect(() => {
    const el = document.getElementById('sentry-feedback');
    if (el) el.style.display = open ? 'none' : '';
  }, [open]);

  // Context greeting: when the panel is opened on an empty conversation
  // with a patient in scope, show a welcome line so the doctor knows the
  // bot already has context.
  const contextGreetingShown = useRef(false);
  useEffect(() => {
    if (!open) {
      contextGreetingShown.current = false;
      return;
    }
    if (
      currentPatientId != null &&
      messages.length === 0 &&
      !contextGreetingShown.current
    ) {
      contextGreetingShown.current = true;
      setMessages([
        {
          role: 'system',
          text:
            'Ya tengo abierto al paciente que estás viendo. Puedes preguntar por ' +
            'su historia, medicamentos o últimas consultas sin repetir el nombre.',
        },
      ]);
    }
  }, [open, currentPatientId, messages.length]);

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const rows = await apiService.assistant.listConversations(20);
      setConversations(rows);
    } catch (err) {
      logger.error('Failed to load assistant conversations', err, 'ui');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    if (open && showHistory) {
      refreshConversations();
    }
  }, [open, showHistory, refreshConversations]);

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
        setMessages((prev) =>
          prev.some((m) => m.role === 'system' && m.text.includes('sandbox'))
            ? prev
            : [
                {
                  role: 'system',
                  text: 'Modo sandbox activo — respuestas simuladas, sin llamadas a Gemini.',
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

  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    contextGreetingShown.current = false;
  }, []);

  const handleLoadConversation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await apiService.assistant.getConversation(id);
      const loaded: Message[] = detail.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.content,
        toolCalls: m.tool_calls ?? undefined,
      }));
      setConversationId(detail.conversation_id);
      setMessages(loaded);
      setShowHistory(false);
      contextGreetingShown.current = true; // Don't prepend greeting to loaded chat.
    } catch (err) {
      logger.error('Failed to load conversation', err, 'ui');
      setError('No pude cargar esa conversación.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await apiService.assistant.deleteConversation(id);
        setConversations((prev) => prev.filter((c) => c.conversation_id !== id));
        if (conversationId === id) {
          handleNewConversation();
        }
      } catch (err) {
        logger.error('Failed to delete conversation', err, 'ui');
      }
    },
    [conversationId, handleNewConversation]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const headerTitle = useMemo(() => {
    if (showHistory) return 'Historial';
    return 'Asistente CORTEX';
  }, [showHistory]);

  return (
    <>
      <Tooltip title="Asistente CORTEX">
        <Fab
          color="primary"
          aria-label="Abrir asistente"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            // Offset above Sentry's "Reportar un problema" feedback widget.
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
          sx: { width: { xs: '100%', sm: 460 } },
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
              {headerTitle}
            </Typography>
            {!showHistory && (
              <>
                <Tooltip title="Nueva conversación">
                  <IconButton
                    size="small"
                    onClick={handleNewConversation}
                    disabled={messages.length === 0}
                    aria-label="Nueva conversación"
                  >
                    <NewChatIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ver historial de conversaciones">
                  <IconButton
                    size="small"
                    onClick={() => setShowHistory(true)}
                    aria-label="Ver historial"
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {showHistory && (
              <Tooltip title="Actualizar lista">
                <IconButton
                  size="small"
                  onClick={refreshConversations}
                  disabled={loadingConversations}
                  aria-label="Actualizar historial"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={() => (showHistory ? setShowHistory(false) : setOpen(false))}
              aria-label={showHistory ? 'Cerrar historial' : 'Cerrar asistente'}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {!showHistory && (
            <>
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
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', mt: 4 }}
                  >
                    Pregúntame sobre tus pacientes, consultas recientes o medicamentos.
                    <br />
                    Ejemplo: "¿Qué tengo hoy?" o "Resume la historia de Juan Pérez".
                  </Typography>
                )}
                {messages.map((m, idx) => (
                  <MessageBubble key={idx} message={m} onNavigateToPatient={onNavigateToPatient} />
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
            </>
          )}

          {showHistory && (
            <ConversationHistory
              conversations={conversations}
              loading={loadingConversations}
              activeId={conversationId}
              onOpen={handleLoadConversation}
              onDelete={handleDeleteConversation}
            />
          )}
        </Box>
      </Drawer>
    </>
  );
};


// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const PATIENT_LINK_RE = /\[\[PATIENT:(\d+):([^\]]+)\]\]/g;

function renderWithLinks(
  text: string,
  onNavigateToPatient?: (id: number) => void,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  PATIENT_LINK_RE.lastIndex = 0;
  while ((match = PATIENT_LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const patientId = parseInt(match[1], 10);
    const name = match[2];
    nodes.push(
      <Link
        key={match.index}
        component="button"
        variant="body2"
        underline="always"
        onClick={() => onNavigateToPatient?.(patientId)}
        sx={{ fontWeight: 600, cursor: 'pointer', verticalAlign: 'baseline' }}
      >
        {name}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const MessageBubble: React.FC<{
  message: Message;
  onNavigateToPatient?: (patientId: number) => void;
}> = ({ message, onNavigateToPatient }) => {
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
        {isUser || isSystem
          ? message.text
          : renderWithLinks(message.text, onNavigateToPatient)}
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


interface ConversationHistoryProps {
  conversations: AssistantConversationSummary[];
  loading: boolean;
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  loading,
  activeId,
  onOpen,
  onDelete,
}) => {
  if (loading && conversations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (conversations.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">Aún no tienes conversaciones guardadas.</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      <List dense>
        {conversations.map((c, idx) => (
          <React.Fragment key={c.conversation_id}>
            {idx > 0 && <Divider component="li" />}
            <ListItemButton
              selected={activeId === c.conversation_id}
              onClick={() => onOpen(c.conversation_id)}
              sx={{ alignItems: 'flex-start' }}
            >
              <ListItemText
                primary={c.title}
                secondary={
                  <Stack direction="row" spacing={1} sx={{ color: 'text.secondary' }}>
                    <Typography variant="caption">
                      {c.last_activity
                        ? new Date(c.last_activity).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </Typography>
                    {c.current_patient_id != null && (
                      <Typography variant="caption">· Paciente #{c.current_patient_id}</Typography>
                    )}
                  </Stack>
                }
                primaryTypographyProps={{
                  sx: {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  },
                }}
              />
              <IconButton
                size="small"
                edge="end"
                aria-label="Borrar conversación"
                onClick={(e) => onDelete(c.conversation_id, e)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default AssistantPanel;
