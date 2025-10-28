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
  LocationOn as LocationOnIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  WhatsApp as WhatsAppIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { formatTime, parseBackendDate } from '../../utils/formatters';
import { es } from 'date-fns/locale';
import { apiService } from '../../services/api';
import { useToast } from '../common/ToastNotification';

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
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate || new Date());
  const { showSuccess, showError } = useToast();
  const [sendingWhatsApp, setSendingWhatsApp] = useState<number | null>(null);

  // Actualizar fecha local cuando cambie la prop
  React.useEffect(() => {
    setLocalSelectedDate(selectedDate);
  }, [selectedDate]);

  // Asegurar que si la fecha seleccionada es hoy, se muestren las citas de hoy
  React.useEffect(() => {
    const today = new Date();
    const isSelectedDateToday = isSameDay(localSelectedDate, today);
    
    if (isSelectedDateToday && agendaView === 'daily' && forceRefresh) {
      // Solo ejecutar una vez al montar el componente
      const timeoutId = setTimeout(() => {
        forceRefresh();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty dependency array - only run once on mount

  // Función para enviar recordatorio por WhatsApp
  const handleSendWhatsAppReminder = async (appointment: any) => {
    if (!appointment.id) {
      showError('No se puede enviar WhatsApp: Cita sin ID');
      return;
    }

    setSendingWhatsApp(appointment.id);
    try {
      await apiService.sendWhatsAppAppointmentReminder(appointment.id);
      showSuccess('Recordatorio enviado por WhatsApp exitosamente');
    } catch (error: any) {
      // Error logging removed to prevent console spam
      
      // Handle specific error cases
      const errorDetail = error.detail || error.response?.data?.detail || 'Error al enviar recordatorio por WhatsApp';
      const statusCode = error.status || error.response?.status;
      
      // Check for WhatsApp 24-hour window error
      if (errorDetail.includes('more than 24 hours') || errorDetail.includes('24 hours have passed')) {
        showError('No se puede enviar el mensaje porque han pasado más de 24 horas desde la última interacción del paciente con WhatsApp. El paciente debe enviar un mensaje primero para reanudar la conversación.');
      } else if (statusCode === 503) {
        // Use setTimeout to ensure the message is shown
        setTimeout(() => {
          showError('WhatsApp no está configurado. Contacta al administrador para configurar el servicio de WhatsApp.');
        }, 100);
      } else if (statusCode === 400) {
        showError('No se encontró el número de teléfono del paciente.');
      } else if (statusCode === 404) {
        showError('Cita no encontrada o sin acceso.');
      } else {
        showError(errorDetail);
      }
    } finally {
      setSendingWhatsApp(null);
    }
  };

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
        const dailyAppointments = appointments.filter(apt => {
          const aptDate = parseBackendDate(apt.date_time);
          const isSameDayResult = isSameDay(aptDate, date);
          return isSameDayResult;
        });
        return dailyAppointments;
      case 'weekly':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Domingo
        return appointments.filter(apt => {
          const aptDate = parseBackendDate(apt.date_time);
          return aptDate >= weekStart && aptDate <= weekEnd;
        });
      case 'monthly':
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        return appointments.filter(apt => {
          const aptDate = parseBackendDate(apt.date_time);
          return aptDate >= monthStart && aptDate <= monthEnd;
        });
      default:
        return appointments;
    }
  };

  const currentDate = localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
  
  // Detectar si la fecha seleccionada es hoy
  const isToday = isSameDay(currentDate, new Date());
  
  // Obtener citas filtradas
  const filteredAppointments = getFilteredAppointments(currentDate, agendaView);
  
  // Debug logs removed to prevent infinite logging

  // Navegación de fechas
  const handleDateNavigation = (direction: 'prev' | 'next') => {
    let newDate: Date;
    switch (agendaView) {
      case 'daily':
        newDate = addDays(currentDate, direction === 'next' ? 1 : -1);
        break;
      case 'weekly':
        newDate = addWeeks(currentDate, direction === 'next' ? 1 : -1);
        break;
      case 'monthly':
        newDate = addMonths(currentDate, direction === 'next' ? 1 : -1);
        break;
      default:
        newDate = currentDate;
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
    // Validar que localSelectedDate sea una fecha válida
    const currentDate = localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
    
    switch (agendaView) {
      case 'daily':
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      case 'weekly':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
      case 'monthly':
        return format(currentDate, 'MMMM yyyy', { locale: es });
      default:
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    }
  };

  // Renderizar vista semanal
  const renderWeeklyView = () => {
    const currentDate = localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
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
                  isSameDay(parseBackendDate(apt.date_time), day)
                );
                
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
                      {dayAppointments.map((appointment, index) => (
                        <Card key={index} sx={{ mb: 1, p: 1, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {formatTime(appointment.date_time)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {appointment.patient?.first_name} {appointment.patient?.paternal_surname}
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
                            {appointment.status === 'confirmed' && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendWhatsAppReminder(appointment);
                                }}
                                disabled={sendingWhatsApp === appointment.id}
                                sx={{ 
                                  color: 'primary.contrastText',
                                  p: 0.5,
                                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                }}
                              >
                                <WhatsAppIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                          </Box>
                        </Card>
                      ))}
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
    const currentDate = localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
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
                    isSameDay(parseBackendDate(apt.date_time), day)
                  );
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <TableCell 
                      key={day.toISOString()} 
                      sx={{ 
                        verticalAlign: 'top', 
                        minHeight: 100,
                        opacity: isCurrentMonth ? 1 : 0.3,
                        bgcolor: isToday ? 'primary.light' : 'transparent',
                        cursor: dayAppointments.length > 0 ? 'pointer' : 'default',
                        '&:hover': dayAppointments.length > 0 ? {
                          bgcolor: isToday ? 'primary.main' : 'action.hover'
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
                          fontWeight: isToday ? 'bold' : 'normal',
                          color: isToday ? 'primary.contrastText' : 'text.primary'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {dayAppointments.slice(0, 2).map((appointment, index) => (
                          <Box key={index} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={`${formatTime(appointment.date_time)} ${appointment.patient?.first_name}`}
                              size="small"
                              sx={{ 
                                fontSize: '0.65rem', 
                                height: 16,
                                flex: 1
                              }}
                            />
                            {appointment.status === 'confirmed' && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendWhatsAppReminder(appointment);
                                }}
                                disabled={sendingWhatsApp === appointment.id}
                                sx={{ 
                                  p: 0.25,
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <WhatsAppIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            )}
                          </Box>
                        ))}
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
        {filteredAppointments.map((appointment, index) => (
          <ListItem
            key={appointment.id || index}
            sx={{
              border: 1,
              borderColor: 'grey.200',
              borderRadius: 2,
              mb: 1,
              boxShadow: 1,
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: 2,
                backgroundColor: 'action.hover'
              }
            }}
            onClick={() => handleEditAppointment?.(appointment)}
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
                <Box component="div" sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" component="div">
                    <TimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {formatTime(appointment.date_time)}
                  </Typography>
                  {appointment.office && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} component="div">
                      <LocationOnIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {appointment.office.name}
                      {appointment.office.address && ` - ${appointment.office.address}`}
                      {appointment.office.is_virtual && appointment.office.virtual_url && (
                        <span style={{ color: '#1976d2' }}>
                          {' '}(Virtual: {appointment.office.virtual_url})
                        </span>
                      )}
                    </Typography>
                  )}
                  {appointment.reason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} component="div">
                      Motivo: {appointment.reason}
                    </Typography>
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {appointment.status === 'confirmed' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<WhatsAppIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendWhatsAppReminder(appointment);
                    }}
                    disabled={sendingWhatsApp === appointment.id}
                  >
                    {sendingWhatsApp === appointment.id ? 'Enviando...' : 'WhatsApp'}
                  </Button>
                )}
                {appointment.status === 'confirmed' && (
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
        ))}
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
              {forceRefresh && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={forceRefresh}
                  sx={{ ml: 1 }}
                >
                  Actualizar
                </Button>
              )}
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