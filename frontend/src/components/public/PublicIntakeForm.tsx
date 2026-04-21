/**
 * Public Pre-Consultation Intake Form
 *
 * Reached via a tokenised WhatsApp link: /public/intake/:token
 * Unauthenticated. Renders the (possibly filtered) question set grouped
 * by NOM-004 section, posts answers back, and shows a thank-you state
 * on success.
 *
 * Keeps the UI minimal and mobile-first — most patients will open this
 * on a phone from a WhatsApp push notification.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircleOutline as CheckIcon } from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import type {
  IntakeQuestion,
  PublicIntakePayload,
} from '../../services/ApiService';
import { logger } from '../../utils/logger';

type AnswerValue = string | number | boolean | null;
type AnswersMap = Record<string, AnswerValue>;

interface State {
  status: 'loading' | 'ready' | 'submitting' | 'submitted' | 'expired' | 'not_found' | 'error';
  payload?: PublicIntakePayload;
  errorMessage?: string;
}

function extractTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/public\/intake\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const PublicIntakeForm: React.FC = () => {
  const token = useMemo(() => extractTokenFromPath(window.location.pathname), []);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setState({ status: 'not_found' });
      return;
    }
    let active = true;
    apiService.intake
      .loadPublic(token)
      .then((payload) => {
        if (!active) return;
        setState({ status: 'ready', payload });
      })
      .catch((err: any) => {
        if (!active) return;
        const status = err?.response?.status;
        if (status === 404) setState({ status: 'not_found' });
        else if (status === 410) setState({ status: 'expired' });
        else {
          logger.error('Failed to load public intake', err, 'ui');
          setState({
            status: 'error',
            errorMessage:
              'No pudimos cargar el cuestionario. Intenta desde el link original de WhatsApp.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!token || !state.payload) return;
    // Client-side required check — mirrors server validation for better UX.
    const errs: string[] = [];
    state.payload.questions.forEach((q) => {
      if (q.required) {
        const v = answers[q.id];
        if (
          v === undefined ||
          v === null ||
          (typeof v === 'string' && v.trim() === '')
        ) {
          errs.push(`Falta: ${q.label}`);
          return;
        }
      }
      // Generic yes_no + followup: if answered "yes", the {qid}_detail
      // field is required.
      if (q.type === 'yes_no' && q.followup && answers[q.id] === true) {
        const detail = answers[`${q.id}_detail`];
        if (
          detail === undefined ||
          detail === null ||
          (typeof detail === 'string' && detail.trim() === '')
        ) {
          errs.push(`Falta: ${q.followup.label}`);
        }
      }
    });
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors([]);
    setState((s) => ({ ...s, status: 'submitting' }));
    try {
      await apiService.intake.submitPublic(token, answers as Record<string, unknown>);
      setState({ status: 'submitted', payload: state.payload });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 410) setState({ status: 'expired', payload: state.payload });
      else if (status === 422) {
        const detail = err?.response?.data?.detail;
        setValidationErrors(
          Array.isArray(detail?.errors) ? detail.errors : ['Revisa los datos ingresados.']
        );
        setState((s) => ({ ...s, status: 'ready' }));
      } else {
        logger.error('Failed to submit public intake', err, 'ui');
        setState({
          status: 'error',
          errorMessage: 'No pudimos enviar tus respuestas. Intenta de nuevo en unos minutos.',
          payload: state.payload,
        });
      }
    }
  }, [answers, state.payload, token]);

  if (state.status === 'loading') {
    return <LoadingScreen />;
  }
  if (state.status === 'not_found') {
    return (
      <InfoScreen
        title="Cuestionario no encontrado"
        body="El link ya no es válido o fue copiado incorrectamente. Escribe a tu doctor para pedir un nuevo link."
      />
    );
  }
  if (state.status === 'expired') {
    return (
      <InfoScreen
        title="Este cuestionario ya no está disponible"
        body="Ya respondiste este cuestionario anteriormente, o la cita ha cerrado. Si crees que es un error, contacta a tu doctor."
      />
    );
  }
  if (state.status === 'submitted') {
    return (
      <InfoScreen
        title="¡Respuestas enviadas!"
        body="Gracias. Tu doctor recibirá esta información antes de tu consulta."
        icon={<CheckIcon sx={{ fontSize: 64, color: 'success.main' }} />}
      />
    );
  }

  const { payload } = state;
  if (!payload) return null;

  // Group questions by section, falling back to a single "default" bucket if
  // the backend didn't ship section metadata. Preserves the intended order
  // from `section_order`; any unknown section id at the end.
  const groups = groupQuestionsBySection(
    payload.questions,
    payload.section_order,
    payload.section_labels
  );

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Cuestionario pre-consulta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hola {payload.patient_first_name || ''}
            {payload.appointment_date
              ? ` — tu cita es el ${new Date(payload.appointment_date).toLocaleString('es-MX', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}`
              : ''}
            . Responde estas preguntas (2-3 min) antes de tu consulta.
          </Typography>
        </Box>

        <Alert severity="info">
          Tus respuestas son confidenciales y solo las verá tu doctor.
        </Alert>

        {validationErrors.length > 0 && (
          <Alert severity="warning">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Antes de enviar, revisa:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}

        {state.status === 'error' && state.errorMessage && (
          <Alert severity="error">{state.errorMessage}</Alert>
        )}

        {groups.map((group) => (
          <Box key={group.id}>
            {group.label && (
              <>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, fontWeight: 700 }}
                >
                  {group.label}
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </>
            )}
            <Stack spacing={2}>
              {group.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={setAnswer}
                  followupValue={answers[`${q.id}_detail`] ?? ''}
                  onFollowupChange={(v) => setAnswer(`${q.id}_detail`, v)}
                />
              ))}
            </Stack>
          </Box>
        ))}

        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={state.status === 'submitting'}
        >
          {state.status === 'submitting' ? 'Enviando…' : 'Enviar respuestas'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          CORTEX — expediente clínico electrónico
        </Typography>
      </Stack>
    </Container>
  );
};


interface QuestionGroup {
  id: string;
  label: string;
  questions: IntakeQuestion[];
}

function groupQuestionsBySection(
  questions: IntakeQuestion[],
  orderHint?: string[],
  labels?: Record<string, string>
): QuestionGroup[] {
  // If no questions carry section metadata, render flat (no labels).
  const hasSections = questions.some((q) => !!q.section);
  if (!hasSections) {
    return [{ id: '_flat', label: '', questions }];
  }
  const buckets = new Map<string, IntakeQuestion[]>();
  questions.forEach((q) => {
    const key = q.section || '_other';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(q);
  });
  const order: string[] = [];
  (orderHint || []).forEach((s) => {
    if (buckets.has(s)) order.push(s);
  });
  // Append any section present in questions but not in orderHint.
  buckets.forEach((_, key) => {
    if (!order.includes(key)) order.push(key);
  });
  return order.map((id) => ({
    id,
    label: (labels && labels[id]) || SECTION_LABELS_FALLBACK[id] || '',
    questions: buckets.get(id) || [],
  }));
}

// Fallback labels in case the backend didn't ship `section_labels`. The
// backend is the source of truth; these are only a safety net so the UI
// renders gracefully if the endpoint is behind a version.
const SECTION_LABELS_FALLBACK: Record<string, string> = {
  current_condition: 'Motivo de consulta',
  pathological_history: 'Antecedentes médicos',
  non_pathological_history: 'Hábitos',
  family_history: 'Antecedentes familiares',
  gynecological: 'Antecedentes gineco-obstétricos',
  other: 'Otros',
};


// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface QuestionFieldProps {
  question: IntakeQuestion;
  value: AnswerValue | undefined;
  onChange: (id: string, value: AnswerValue) => void;
  followupValue?: AnswerValue | undefined;
  onFollowupChange?: (value: AnswerValue) => void;
}

const QuestionField: React.FC<QuestionFieldProps> = ({
  question,
  value,
  onChange,
  followupValue,
  onFollowupChange,
}) => {
  const required = question.required ? ' *' : '';
  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <FormLabel sx={{ fontWeight: 600, color: 'text.primary', mb: 1, display: 'block' }}>
          {question.label}
          {required}
        </FormLabel>
        {question.help_text && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {question.help_text}
          </Typography>
        )}
        {question.type === 'text' && (
          <TextField
            fullWidth
            size="small"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(question.id, e.target.value)}
            inputProps={{ maxLength: question.max_length || 300 }}
          />
        )}
        {question.type === 'textarea' && (
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(question.id, e.target.value)}
            inputProps={{ maxLength: question.max_length || 800 }}
          />
        )}
        {question.type === 'select' && question.options && (
          <FormControl fullWidth size="small">
            <Select
              value={(value as string) ?? ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Selecciona una opción
              </MenuItem>
              {question.options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {question.type === 'yes_no' && (
          <>
            <RadioGroup
              row
              value={value === true ? 'yes' : value === false ? 'no' : ''}
              onChange={(e) => onChange(question.id, e.target.value === 'yes')}
            >
              <FormControlLabel value="yes" control={<Radio />} label="Sí" />
              <FormControlLabel value="no" control={<Radio />} label="No" />
            </RadioGroup>
            {value === true && question.followup && onFollowupChange && (
              <Box sx={{ mt: 1 }}>
                <FormLabel sx={{ display: 'block', mb: 0.5 }}>
                  {question.followup.label}
                </FormLabel>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  value={(followupValue as string) ?? ''}
                  onChange={(e) => onFollowupChange(e.target.value)}
                  inputProps={{ maxLength: question.followup.max_length || 400 }}
                />
              </Box>
            )}
          </>
        )}
        {question.type === 'scale_1_10' && (
          <Box sx={{ px: 1 }}>
            <Slider
              value={typeof value === 'number' ? value : 5}
              onChange={(_, v) => onChange(question.id, Array.isArray(v) ? v[0] : (v as number))}
              min={1}
              max={10}
              marks
              valueLabelDisplay="on"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};


const LoadingScreen: React.FC = () => (
  <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
    <LinearProgress />
    <Typography sx={{ mt: 2 }} color="text.secondary">
      Cargando cuestionario…
    </Typography>
  </Container>
);

interface InfoScreenProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
}

const InfoScreen: React.FC<InfoScreenProps> = ({ title, body, icon }) => (
  <Container maxWidth="sm" sx={{ py: 8 }}>
    <Card elevation={0} sx={{ textAlign: 'center', p: 4 }}>
      {icon && <Box sx={{ mb: 2 }}>{icon}</Box>}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {body}
      </Typography>
    </Card>
  </Container>
);

export default PublicIntakeForm;
