import React, { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Appointment } from '../../types';

interface AgendaViewProps {
  appointments: Appointment[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  agendaView: 'daily' | 'weekly';
  setAgendaView: (view: 'daily' | 'weekly') => void;
  handleNewAppointment: () => void;
  handleEditAppointment: (appointment: Appointment) => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({
  appointments,
  selectedDate,
  setSelectedDate,
  agendaView,
  setAgendaView,
  handleNewAppointment,
  handleEditAppointment
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Agenda Médica
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={agendaView === 'daily' ? 'contained' : 'outlined'}
            onClick={() => setAgendaView('daily')}
            size="small"
          >
            Diaria
          </Button>
          <Button
            variant={agendaView === 'weekly' ? 'contained' : 'outlined'}
            onClick={() => setAgendaView('weekly')}
            size="small"
          >
            Semanal
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewAppointment}
            sx={{ borderRadius: '12px' }}
          >
            Nueva Cita
          </Button>
        </Box>
      </Box>

      {/* Date Selector */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CalendarIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6">
            {selectedDate.toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setSelectedDate(new Date())}
            sx={{ ml: 'auto' }}
          >
            Hoy
          </Button>
        </Box>
      </Paper>

      {/* Appointments List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <Card key={appointment.id} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <TimeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {new Date(appointment.date_time).toLocaleTimeString('es-MX', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                    <Chip 
                      label={appointment.status} 
                      size="small"
                      color={appointment.status === 'confirmed' ? 'success' : 'default'}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                    {appointment.patient_name || 'Paciente'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {appointment.reason || appointment.appointment_type}
                  </Typography>
                  {appointment.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Notas: {appointment.notes}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={() => handleEditAppointment(appointment)}
                    size="small"
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
              </Box>
            </Card>
          ))
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CalendarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No hay citas programadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Programa una nueva cita para comenzar
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default memo(AgendaView);
