import React, { useState, useMemo } from 'react';
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
  ListItemSecondaryAction,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgendaViewProps {
  appointments?: any[];
  selectedDate?: Date;
  setSelectedDate?: (date: Date) => void;
  agendaView?: 'daily' | 'weekly' | 'monthly';
  setAgendaView?: (view: 'daily' | 'weekly' | 'monthly') => void;
  handleNewAppointment?: () => void;
  handleEditAppointment?: (appointment: any) => void;
  cancelAppointment?: (appointmentId: number) => Promise<void>;
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
  cancelAppointment,
  refreshAppointments
}) => {
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate);

  // Actualizar fecha local cuando cambie la prop
  React.useEffect(() => {
    setLocalSelectedDate(selectedDate);
  }, [selectedDate]);

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

  // Función para obtener citas filtradas por vista
  const getFilteredAppointments = (date: Date, view: 'daily' | 'weekly' | 'monthly') => {
    switch (view) {
      case 'daily':
        return appointments.filter(apt => {
          const aptDate = new Date(apt.date_time);
          return isSameDay(aptDate, date);
        });
      case 'weekly':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Domingo
        return appointments.filter(apt => {
          const aptDate = new Date(apt.date_time);
          return aptDate >= weekStart && aptDate <= weekEnd;
        });
      case 'monthly':
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        return appointments.filter(apt => {
          const aptDate = new Date(apt.date_time);
          return aptDate >= monthStart && aptDate <= monthEnd;
        });
      default:
        return appointments;
    }
  };

  const filteredAppointments = getFilteredAppointments(localSelectedDate, agendaView);

  // Navegación de fechas
  const handleDateNavigation = (direction: 'prev' | 'next') => {
    let newDate: Date;
    switch (agendaView) {
      case 'daily':
        newDate = addDays(localSelectedDate, direction === 'next' ? 1 : -1);
        break;
      case 'weekly':
        newDate = addWeeks(localSelectedDate, direction === 'next' ? 1 : -1);
        break;
      case 'monthly':
        newDate = addMonths(localSelectedDate, direction === 'next' ? 1 : -1);
        break;
      default:
        newDate = localSelectedDate;
    }
    setLocalSelectedDate(newDate);
    setSelectedDate?.(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setLocalSelectedDate(today);
    setSelectedDate?.(today);
  };

  // Obtener rango de fechas para el título
  const getDateRangeTitle = () => {
    switch (agendaView) {
      case 'daily':
        return format(localSelectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      case 'weekly':
        const weekStart = startOfWeek(localSelectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(localSelectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
      case 'monthly':
        return format(localSelectedDate, 'MMMM yyyy', { locale: es });
      default:
        return format(localSelectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    }
  };

  // Renderizar vista semanal
  const renderWeeklyView = () => {
    const weekStart = startOfWeek(localSelectedDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    
    return (
      <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              {weekDays.map(day => (
                <TableCell key={day.toISOString()} align="center" sx={{ fontWeight: 'bold' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {format(day, 'EEE', { locale: es })}
                    </Typography>
                    <Typography variant="h6">
                      {format(day, 'd')}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {weekDays.map(day => {
                const dayAppointments = appointments.filter(apt => 
                  isSameDay(new Date(apt.date_time), day)
                );
                
                return (
                  <TableCell key={day.toISOString()} sx={{ verticalAlign: 'top', minHeight: 200 }}>
                    <Box sx={{ minHeight: 150 }}>
                      {dayAppointments.map((appointment, index) => (
                        <Card key={index} sx={{ mb: 1, p: 1, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {format(new Date(appointment.date_time), 'HH:mm', { locale: es })}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {appointment.patient?.first_name} {appointment.patient?.paternal_surname}
                          </Typography>
                          <Chip
                            label={getStatusLabel(appointment.status)}
                            size="small"
                            sx={{ mt: 0.5, fontSize: '0.65rem', height: 16 }}
                          />
                        </Card>
                      ))}
                      {dayAppointments.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                          Sin citas
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Renderizar vista mensual
  const renderMonthlyView = () => {
    const monthStart = startOfMonth(localSelectedDate);
    const monthEnd = endOfMonth(localSelectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return (
      <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                <TableCell key={day} align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.map((week, weekIndex) => (
              <TableRow key={weekIndex}>
                {week.map(day => {
                  const dayAppointments = appointments.filter(apt => 
                    isSameDay(new Date(apt.date_time), day)
                  );
                  const isCurrentMonth = isSameMonth(day, localSelectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <TableCell 
                      key={day.toISOString()} 
                      sx={{ 
                        verticalAlign: 'top', 
                        minHeight: 100,
                        opacity: isCurrentMonth ? 1 : 0.3,
                        bgcolor: isToday ? 'primary.light' : 'transparent'
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isToday ? 'bold' : 'normal',
                          color: isToday ? 'primary.contrastText' : 'text.primary'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {dayAppointments.slice(0, 2).map((appointment, index) => (
                          <Chip
                            key={index}
                            label={`${format(new Date(appointment.date_time), 'HH:mm')} ${appointment.patient?.first_name}`}
                            size="small"
                            sx={{ 
                              mb: 0.5, 
                              fontSize: '0.65rem', 
                              height: 16,
                              display: 'block'
                            }}
                          />
                        ))}
                        {dayAppointments.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{dayAppointments.length - 2} más
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Renderizar vista diaria
  const renderDailyView = () => {
    return (
      <List>
        {filteredAppointments.map((appointment, index) => (
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
                    {appointment.patient?.first_name} {appointment.patient?.paternal_surname}
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
                    {format(new Date(appointment.date_time), 'HH:mm', { locale: es })}
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
                      console.log('🔄 Cancel button clicked for appointment:', appointment.id);
                      if (cancelAppointment && appointment.id) {
                        console.log('🔄 Calling cancelAppointment function...');
                        cancelAppointment(appointment.id);
                      } else {
                        console.log('❌ cancelAppointment function not available or appointment.id missing');
                      }
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
    );
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
              <IconButton onClick={() => handleDateNavigation('prev')} size="small">
                <ChevronLeftIcon />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 300, justifyContent: 'center' }}>
                <TodayIcon color="primary" />
                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                  {getDateRangeTitle()}
                </Typography>
              </Box>
              <IconButton onClick={() => handleDateNavigation('next')} size="small">
                <ChevronRightIcon />
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                onClick={goToToday}
                sx={{ ml: 1 }}
              >
                Hoy
              </Button>
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
                Citas {agendaView === 'daily' ? 'del Día' : agendaView === 'weekly' ? 'de la Semana' : 'del Mes'}
              </Typography>
              <Typography variant="h3" color="primary">
                {filteredAppointments.length}
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
                {filteredAppointments.filter(apt => apt.status === 'confirmed').length}
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
                {filteredAppointments.filter(apt => apt.status === 'cancelled').length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Appointments View */}
      <Card sx={{ boxShadow: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon />
            {agendaView === 'daily' ? 'Citas del Día' : agendaView === 'weekly' ? 'Citas de la Semana' : 'Citas del Mes'}
          </Typography>
          
          {filteredAppointments.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="body1" color="text.secondary">
                No hay citas programadas para {agendaView === 'daily' ? 'este día' : agendaView === 'weekly' ? 'esta semana' : 'este mes'}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewAppointment}
                sx={{ mt: 2 }}
              >
                Programar Nueva Cita
              </Button>
            </Paper>
          ) : (
            <>
              {agendaView === 'daily' && renderDailyView()}
              {agendaView === 'weekly' && renderWeeklyView()}
              {agendaView === 'monthly' && renderMonthlyView()}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AgendaView;