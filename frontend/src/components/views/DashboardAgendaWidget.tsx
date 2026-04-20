/**
 * Dashboard agenda quick-view widget.
 *
 * Replaces the old "Próximas citas" card. Shows a compact list of
 * appointments filtered by Day / Week / Month, toggled with three
 * MUI buttons (matching AgendaView's existing pattern).
 *
 * Kept intentionally compact: a dashboard widget, not a full calendar.
 * If the filter produces more than `VISIBLE_LIMIT` results, a "Ver todas
 * en agenda" CTA sends the user to the full AgendaView.
 */

import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { format, isSameDay, isSameMonth, isSameWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatTime } from '../../utils/formatters';

type AgendaView = 'daily' | 'weekly' | 'monthly';

interface AgendaWidgetAppointment {
  id?: number | string;
  date_time: string;
  patient_name?: string;
  patient?: { name?: string };
  appointment_type_name?: string;
  status?: string;
}

interface DashboardAgendaWidgetProps {
  appointments: AgendaWidgetAppointment[];
  onNewAppointment?: () => void;
  /** Called when the user clicks "Ver todas en agenda" — should navigate
   *  to the full AgendaView. Optional: if omitted the CTA is hidden. */
  onViewAllInAgenda?: () => void;
}

const VISIBLE_LIMIT = 8;

const VIEW_LABELS: Record<AgendaView, string> = {
  daily: 'Hoy',
  weekly: 'Esta semana',
  monthly: 'Este mes',
};

const EMPTY_STATE_COPY: Record<AgendaView, string> = {
  daily: 'No tienes citas programadas para hoy',
  weekly: 'No tienes citas programadas para esta semana',
  monthly: 'No tienes citas programadas para este mes',
};

export const DashboardAgendaWidget: React.FC<DashboardAgendaWidgetProps> = ({
  appointments,
  onNewAppointment,
  onViewAllInAgenda,
}) => {
  const [view, setView] = useState<AgendaView>('daily');
  const today = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const pool = [...appointments].sort(
      (a, b) =>
        new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
    );
    return pool.filter((apt) => {
      const when = new Date(apt.date_time);
      if (Number.isNaN(when.getTime())) return false;
      if (view === 'daily') return isSameDay(when, today);
      if (view === 'weekly') return isSameWeek(when, today, { weekStartsOn: 1 });
      return isSameMonth(when, today);
    });
  }, [appointments, today, view]);

  const visible = filtered.slice(0, VISIBLE_LIMIT);
  const extra = Math.max(0, filtered.length - VISIBLE_LIMIT);

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          sx={{ mb: 2 }}
        >
          <Typography
            variant="h5"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}
          >
            <CalendarIcon color="primary" />
            Agenda
          </Typography>
          <ViewToggle active={view} onChange={setView} />
        </Stack>

        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {EMPTY_STATE_COPY[view]}
            </Typography>
            {onNewAppointment && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onNewAppointment}
              >
                Programar nueva cita
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Stack
              divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}
              sx={{
                maxHeight: 440,
                overflowY: 'auto',
                pr: 1,
              }}
            >
              {visible.map((apt) => (
                <AppointmentRow
                  key={apt.id || `${apt.date_time}-${apt.patient_name}`}
                  appointment={apt}
                  today={today}
                  showFullDate={view !== 'daily'}
                />
              ))}
            </Stack>
            {(extra > 0 || onViewAllInAgenda) && (
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={onViewAllInAgenda}
                  disabled={!onViewAllInAgenda}
                >
                  {extra > 0
                    ? `Ver ${extra} más en agenda`
                    : 'Ver todas en agenda'}
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};


// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------


const ViewToggle: React.FC<{
  active: AgendaView;
  onChange: (v: AgendaView) => void;
}> = ({ active, onChange }) => (
  <Stack direction="row" spacing={1} role="tablist" aria-label="Rango de agenda">
    {(Object.keys(VIEW_LABELS) as AgendaView[]).map((key) => (
      <Button
        key={key}
        size="small"
        variant={active === key ? 'contained' : 'outlined'}
        onClick={() => onChange(key)}
        role="tab"
        aria-selected={active === key}
      >
        {VIEW_LABELS[key]}
      </Button>
    ))}
  </Stack>
);


const AppointmentRow: React.FC<{
  appointment: AgendaWidgetAppointment;
  today: Date;
  showFullDate: boolean;
}> = ({ appointment, today, showFullDate }) => {
  const apptDate = new Date(appointment.date_time);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayLabel = isSameDay(apptDate, today)
    ? 'Hoy'
    : isSameDay(apptDate, tomorrow)
    ? 'Mañana'
    : format(apptDate, showFullDate ? 'EEE d MMM' : 'EEE d MMM', { locale: es });

  const patientName =
    appointment.patient_name || appointment.patient?.name || 'Paciente';
  const statusKey = (appointment.status || '').toLowerCase();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Avatar sx={{ bgcolor: 'primary.main' }}>
        {patientName[0]?.toUpperCase() || 'P'}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ color: 'text.primary' }} noWrap>
          {patientName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <Box
            component="span"
            sx={{
              fontWeight: 600,
              color: isSameDay(apptDate, today) ? 'primary.main' : 'text.secondary',
            }}
          >
            {dayLabel}
          </Box>
          {' · '}
          {formatTime(appointment.date_time)}
          {appointment.appointment_type_name
            ? ` · ${appointment.appointment_type_name}`
            : ''}
        </Typography>
      </Box>
      <Chip
        label={
          statusKey === 'confirmada'
            ? 'Confirmada'
            : statusKey === 'por_confirmar'
            ? 'Por confirmar'
            : appointment.status || '—'
        }
        color={
          statusKey === 'confirmada'
            ? 'success'
            : statusKey === 'por_confirmar'
            ? 'primary'
            : 'default'
        }
        size="small"
      />
    </Box>
  );
};

export default DashboardAgendaWidget;
