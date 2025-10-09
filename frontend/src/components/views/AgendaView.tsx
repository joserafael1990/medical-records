import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgendaViewProps {
  appointments?: any[];
  selectedDate?: Date;
  setSelectedDate?: (date: Date) => void;
  agendaView?: 'daily' | 'weekly' | 'monthly';
  setAgendaView?: (view: 'daily' | 'weekly' | 'monthly') => void;
  handleNewAppointment?: () => void;
  handleEditAppointment?: (appointment: any) => void;
  refreshAppointments?: () => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({
  appointments = [],
  selectedDate = new Date(),
  setSelectedDate,
  agendaView = 'daily',
  setAgendaView,
  handleNewAppointment,
  handleEditAppointment,
  refreshAppointments
}) => {
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date_time);
    return aptDate.toDateString() === selectedDate.toDateString();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon />
          Agenda Médica
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewAppointment}
          sx={{ borderRadius: 2 }}
        >
          Nueva Cita
        </Button>
      </Box>

      {/* Date and View Controls */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TodayIcon color="primary" />
              <Typography variant="h6">
                {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy")}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={agendaView === 'daily' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setAgendaView?.('daily')}
              >
                Día
              </Button>
              <Button
                variant={agendaView === 'weekly' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setAgendaView?.('weekly')}
              >
                Semana
              </Button>
              <Button
                variant={agendaView === 'monthly' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setAgendaView?.('monthly')}
              >
                Mes
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Appointments Summary */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Citas de Hoy
              </Typography>
              <Typography variant="h3" color="primary">
                {todayAppointments.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Confirmadas
              </Typography>
              <Typography variant="h3" color="success.main">
                {todayAppointments.filter(apt => apt.status === 'confirmed').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Canceladas
              </Typography>
              <Typography variant="h3" color="error.main">
                {todayAppointments.filter(apt => apt.status === 'cancelled').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Appointments List */}
      <Card sx={{ boxShadow: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon />
            Citas del Día
          </Typography>
          
          {todayAppointments.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="body1" color="text.secondary">
                No hay citas programadas para hoy
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewAppointment}
                sx={{ mt: 2 }}
              >
                Programar Primera Cita
              </Button>
            </Paper>
          ) : (
            <List>
              {todayAppointments.map((appointment, index) => (
                <ListItem
                  key={appointment.id || index}
                  sx={{
                    border: 1,
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    mb: 1,
                    boxShadow: 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 2
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {appointment.patient?.first_name} {appointment.patient?.last_name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(appointment.status)}
                          color={getStatusColor(appointment.status) as any}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <TimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                          {format(new Date(appointment.date_time), 'HH:mm')}
                        </Typography>
                        {appointment.reason && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Motivo: {appointment.reason}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditAppointment?.(appointment)}
                      >
                        Editar
                      </Button>
                      {appointment.status === 'confirmed' && (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => {
                            // Lógica para cancelar cita
                            console.log('Cancelar cita:', appointment.id);
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AgendaView;

