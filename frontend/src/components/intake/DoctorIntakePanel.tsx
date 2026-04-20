/**
 * Doctor-facing intake panel embedded in the appointment dialog.
 *
 * Shows:
 * - a "Send questionnaire" button (disabled when the patient has no
 *   `primary_phone` — tooltip explains why)
 * - the patient's submitted responses once they exist
 * - a "resend" action if the patient hasn't submitted yet
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  AssignmentInd as FormIcon,
  AccessTime as PendingIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import type {
  IntakeAppointmentResponse,
  IntakeQuestion,
} from '../../services/ApiService';
import { logger } from '../../utils/logger';

interface DoctorIntakePanelProps {
  appointmentId: number;
  patientHasPhone: boolean;
}

const ERROR_COPY: Record<string, string> = {
  patient_missing_phone:
    'El paciente no tiene número de WhatsApp registrado. Agrégalo en su ficha.',
  appointment_already_closed: 'La cita ya cerró, no se puede enviar el cuestionario.',
  whatsapp_send_failed:
    'No se pudo enviar por WhatsApp. Revisa la conexión o vuelve a intentar.',
  appointment_not_found_or_unauthorized: 'No tienes permiso sobre esta cita.',
  already_submitted: 'El paciente ya respondió el cuestionario.',
};

export const DoctorIntakePanel: React.FC<DoctorIntakePanelProps> = ({
  appointmentId,
  patientHasPhone,
}) => {
  const [state, setState] = useState<IntakeAppointmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{
    severity: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiService.intake.getForAppointment(appointmentId);
      setState(resp);
    } catch (err) {
      logger.error('Failed to load intake for appointment', err, 'ui');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSend = useCallback(async () => {
    setSending(true);
    setBanner(null);
    try {
      const res = await apiService.intake.sendToAppointment(appointmentId);
      if (res.sent) {
        setBanner({
          severity: 'success',
          text: 'Cuestionario enviado al paciente por WhatsApp.',
        });
        await refresh();
      } else {
        setBanner({
          severity: 'warning',
          text: ERROR_COPY[res.error || ''] || 'No se pudo enviar el cuestionario.',
        });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setBanner({
        severity: 'error',
        text: typeof detail === 'string' ? detail : 'Error al enviar el cuestionario.',
      });
    } finally {
      setSending(false);
    }
  }, [appointmentId, refresh]);

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Cargando cuestionario pre-consulta…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const questions = state?.questions || [];
  const answers = (state?.answers || {}) as Record<string, unknown>;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FormIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Cuestionario pre-consulta
          </Typography>
          {state?.has_response && (
            <StatusChip submitted={state.submitted} submittedAt={state.submitted_at} />
          )}
        </Box>

        {banner && (
          <Alert severity={banner.severity} sx={{ mb: 1 }} onClose={() => setBanner(null)}>
            {banner.text}
          </Alert>
        )}

        {!state?.has_response && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Envía al paciente un cuestionario breve para tener contexto antes de la
              consulta.
            </Typography>
            <SendButton
              onClick={handleSend}
              disabled={!patientHasPhone || sending}
              loading={sending}
              disabledReason={
                !patientHasPhone
                  ? 'El paciente no tiene número de WhatsApp registrado.'
                  : undefined
              }
            />
          </Stack>
        )}

        {state?.has_response && !state.submitted && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Ya se envió el cuestionario, el paciente aún no responde.
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleSend}
              disabled={!patientHasPhone || sending}
            >
              Reenviar link por WhatsApp
            </Button>
          </Stack>
        )}

        {state?.has_response && state.submitted && (
          <>
            <Divider sx={{ my: 1 }} />
            <AnswersList questions={questions} answers={answers} />
          </>
        )}
      </CardContent>
    </Card>
  );
};


const SendButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  disabledReason?: string;
}> = ({ onClick, disabled, loading, disabledReason }) => {
  const btn = (
    <span>
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
        onClick={onClick}
        disabled={disabled}
      >
        Enviar cuestionario
      </Button>
    </span>
  );
  if (disabledReason) {
    return <Tooltip title={disabledReason}>{btn}</Tooltip>;
  }
  return btn;
};


const StatusChip: React.FC<{ submitted: boolean; submittedAt?: string | null }> = ({
  submitted,
  submittedAt,
}) => {
  if (submitted) {
    return (
      <Chip
        size="small"
        color="success"
        icon={<DoneIcon />}
        label={
          submittedAt
            ? `Respondido ${new Date(submittedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`
            : 'Respondido'
        }
      />
    );
  }
  return <Chip size="small" color="warning" icon={<PendingIcon />} label="Pendiente" />;
};


const AnswersList: React.FC<{
  questions: IntakeQuestion[];
  answers: Record<string, unknown>;
}> = ({ questions, answers }) => (
  <Stack spacing={1.5}>
    {questions.map((q) => {
      const raw = answers[q.id];
      if (raw === undefined || raw === null || raw === '') return null;
      return (
        <Box key={q.id}>
          <Typography variant="caption" color="text.secondary">
            {q.label}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {formatAnswer(q, raw, answers)}
          </Typography>
        </Box>
      );
    })}
  </Stack>
);


function formatAnswer(
  q: IntakeQuestion,
  value: unknown,
  allAnswers: Record<string, unknown>
): string {
  if (q.type === 'yes_no') {
    const base = value === true ? 'Sí' : 'No';
    if (q.id === 'q7_recent_procedures' && value === true) {
      const detail = allAnswers.q7_recent_procedures_detail;
      return detail ? `${base} — ${detail}` : base;
    }
    return base;
  }
  if (q.type === 'select' && q.options) {
    return q.options.find((o) => o.value === value)?.label || String(value);
  }
  if (q.type === 'scale_1_10') return `${value} / 10`;
  return String(value);
}

export default DoctorIntakePanel;
