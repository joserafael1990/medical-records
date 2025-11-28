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
  LocationOn as LocationOnIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { format, isSameDay, isSameMonth, isPast } from 'date-fns';
import { formatTime, parseBackendDate } from '../../utils/formatters';
import { es } from 'date-fns/locale';
import { useAgendaView } from '../../hooks/useAgendaView';

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
  forceRefresh?: () => void;
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
  refreshAppointments,
  forceRefresh
}) => {
  // Use the custom hook for all agenda logic
  const agendaHook = useAgendaView({
    appointments,
    selectedDate,
    setSelectedDate,
    agendaView,
    setAgendaView,
    forceRefresh
  });

  const {
    localSelectedDate,
    currentDate,
    isToday,
    filteredAppointments,
    dateRangeTitle,
    handleDateNavigation,
    goToToday,
    getStatusColor,
    getStatusLabel,
    getWeekDays,
    getWeeks,
    getDayAppointments
  } = agendaHook;

  // Helper function to check if appointment time has passed
  const isAppointmentPast = (appointment: any): boolean => {
    const dateField = appointment.date_time || appointment.appointment_date;
    if (!dateField) return false;
    try {
      const appointmentDate = parseBackendDate(dateField);
      return isPast(appointmentDate);
    } catch (error) {
      return false;
    }
  };

  // Renderizar vista semanal
  const renderWeeklyView = () => {
    const weekDays = getWeekDays();
    
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
                const dayAppointments = getDayAppointments(day);
                
                return (
                  <TableCell 
                    key={day.toISOString()} 
                    sx={{ 
                      verticalAlign: 'top', 
                      minHeight: 200,
                      cursor: dayAppointments.length > 0 ? 'pointer' : 'default',
                      '&:hover': dayAppointments.length > 0 ? {
                        bgcolor: 'action.hover'
                      } : {}
                    }}
                    onClick={() => {
                      if (dayAppointments.length > 0 && setSelectedDate && setAgendaView) {
                        setSelectedDate(day);
                        setAgendaView('daily');
                      }
                    }}
                  >
                    <Box sx={{ minHeight: 150 }}>
                      {dayAppointments.map((appointment, index) => {
                        const isPast = isAppointmentPast(appointment);
                        return (
                          <Card 
                            key={index} 
                            sx={{ 
                              mb: 1, 
                              p: 1, 
                              bgcolor: isPast ? 'grey.300' : 'primary.light', 
                              color: isPast ? 'text.secondary' : 'primary.contrastText',
                              opacity: isPast ? 0.7 : 1
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {formatTime(appointment.date_time || appointment.appointment_date)}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {appointment.patient?.name}
                            </Typography>
                            {appointment.office && (
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', mt: 0.5 }}>
                                📍 {appointment.office.name}
                                {appointment.office.is_virtual && ' (Virtual)'}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <Chip
                                label={getStatusLabel(appointment.status)}
                                size="small"
                                sx={{ fontSize: '0.65rem', height: 16 }}
                              />
                            </Box>
                          </Card>
                        );
                      })}
                      {dayAppointments.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                          Sin citas
                        </Typography>
                      )}
                      {dayAppointments.length > 0 && (
                        <Typography variant="caption" color="primary" sx={{ 
                          display: 'block', 
                          textAlign: 'center', 
                          mt: 1, 
                          fontStyle: 'italic',
                          opacity: 0.7
                        }}>
                          Click para ver detalles
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
    const weeks = getWeeks();

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
                  const dayAppointments = getDayAppointments(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isTodayDate = isSameDay(day, new Date());
                  
                  return (
                    <TableCell 
                      key={day.toISOString()} 
                      sx={{ 
                        verticalAlign: 'top', 
                        minHeight: 100,
                        opacity: isCurrentMonth ? 1 : 0.3,
                        bgcolor: isTodayDate ? 'primary.light' : 'transparent',
                        cursor: dayAppointments.length > 0 ? 'pointer' : 'default',
                        '&:hover': dayAppointments.length > 0 ? {
                          bgcolor: isTodayDate ? 'primary.main' : 'action.hover'
                        } : {}
                      }}
                      onClick={() => {
                        if (dayAppointments.length > 0 && setSelectedDate && setAgendaView) {
                          setSelectedDate(day);
                          setAgendaView('daily');
                        }
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isTodayDate ? 'bold' : 'normal',
                          color: isTodayDate ? 'primary.contrastText' : 'text.primary'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {dayAppointments.slice(0, 2).map((appointment, index) => {
                          const isPast = isAppointmentPast(appointment);
                          return (
                            <Box key={index} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label={`${formatTime(appointment.date_time || appointment.appointment_date)} ${appointment.patient?.first_name || appointment.patient?.name}`}
                                size="small"
                                sx={{ 
                                  fontSize: '0.65rem', 
                                  height: 16,
                                  flex: 1,
                                  bgcolor: isPast ? 'grey.300' : undefined,
                                  color: isPast ? 'text.secondary' : undefined,
                                  opacity: isPast ? 0.7 : 1
                                }}
                              />
                            </Box>
                          );
                        })}
                        {dayAppointments.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{dayAppointments.length - 2} más
                          </Typography>
                        )}
                        {dayAppointments.length > 0 && (
                          <Typography variant="caption" color="primary" sx={{ 
                            display: 'block', 
                            textAlign: 'center', 
                            mt: 0.5, 
                            fontSize: '0.6rem',
                            opacity: 0.6
                          }}>
                            Click para ver
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
        {filteredAppointments.map((appointment, index) => {
          const isPast = isAppointmentPast(appointment);
          return (
            <ListItem
              key={appointment.id || index}
              sx={{
                border: 1,
                borderColor: isPast ? 'grey.400' : 'grey.200',
                borderRadius: 2,
                mb: 1,
                boxShadow: 1,
                cursor: 'pointer',
                bgcolor: isPast ? 'grey.100' : 'transparent',
                opacity: isPast ? 0.7 : 1,
                '&:hover': {
                  borderColor: isPast ? 'grey.400' : 'primary.main',
                  boxShadow: isPast ? 1 : 2,
                  backgroundColor: isPast ? 'grey.200' : 'action.hover'
                }
              }}
              onClick={() => handleEditAppointment?.(appointment)}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: isPast ? 'text.secondary' : 'text.primary' }}>
                      {appointment.patient?.name}
                    </Typography>
                    <Chip
                      label={getStatusLabel(appointment.status)}
                      color={getStatusColor(appointment.status) as any}
                      size="small"
                      sx={{ opacity: isPast ? 0.7 : 1 }}
                    />
                  </Box>
                }
                secondary={
                  <Box component="span" sx={{ mt: 1, display: 'block' }}>
                    <Typography variant="body2" color={isPast ? 'text.secondary' : 'text.secondary'} component="span" sx={{ display: 'block' }}>
                      <TimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      {formatTime(appointment.date_time || appointment.appointment_date)}
                    </Typography>
                    {appointment.office && (
                      <Typography variant="body2" color={isPast ? 'text.secondary' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }} component="span">
                        <LocationOnIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                        {appointment.office.name}
                        {appointment.office.address && ` - ${appointment.office.address}`}
                        {appointment.office.is_virtual && appointment.office.virtual_url && (
                          <span style={{ color: isPast ? '#757575' : '#1976d2' }}>
                            {' '}(Virtual: {appointment.office.virtual_url})
                          </span>
                        )}
                      </Typography>
                    )}
                  </Box>
                }
                secondaryTypographyProps={{ component: 'div' }}
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['por_confirmar', 'confirmada'].includes(appointment.status) && !isAppointmentPast(appointment) && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cancelAppointment && appointment.id) {
                          cancelAppointment(appointment.id);
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          <CalendarIcon sx={{ color: 'text.primary' }} />
          Citas
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
                  {dateRangeTitle}
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
                        {filteredAppointments.filter(apt => apt.status === 'confirmada').length}
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