import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  Chip,
  IconButton,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Today as TodayIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  EventNote as EventNoteIcon
} from '@mui/icons-material';
import { Appointment } from '../../types';

interface AgendaViewProps {
  appointments: Appointment[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  agendaView: 'daily' | 'weekly' | 'monthly';
  setAgendaView: (view: 'daily' | 'weekly' | 'monthly') => void;
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
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  // Date navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (agendaView === 'daily') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (agendaView === 'weekly') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (agendaView === 'monthly') {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'confirmada':
        return 'success';
      case 'completed':
      case 'completada':
        return 'primary';
      case 'cancelled':
      case 'cancelada':
        return 'error';
      case 'no_show':
      case 'no se presentó':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get appointment type label
  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'Consulta';
      case 'follow_up': return 'Seguimiento';
      case 'emergency': return 'Urgencia';
      case 'routine_check': return 'Revisión';
      default: return type;
    }
  };

  // Generate week dates for weekly view
  const getWeekDates = () => {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = start.getDate() - day; // First day of week
    start.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  // Filter appointments by date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date_time).toISOString().split('T')[0];
      return aptDate === dateStr;
    });
  };

  // Sort appointments by time
  const sortAppointmentsByTime = (appointments: Appointment[]) => {
    return [...appointments].sort((a, b) => {
      return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    });
  };

  // Calculate appointment statistics based on current view and date range
  const calculateAppointmentStats = () => {
    let dateRange: Date[] = [];
    
    if (agendaView === 'daily') {
      dateRange = [selectedDate];
    } else if (agendaView === 'weekly') {
      dateRange = getWeekDates();
    } else if (agendaView === 'monthly') {
      // Get all days in the current month
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        dateRange.push(new Date(year, month, day));
      }
    }
    
    // Filter appointments within the date range
    const appointmentsInRange = appointments.filter(apt => {
      const aptDate = new Date(apt.date_time);
      return dateRange.some(date => 
        aptDate.toDateString() === date.toDateString()
      );
    });
    
    // Calculate stats by status
    const stats = {
      total: appointmentsInRange.length,
      scheduled: appointmentsInRange.filter(apt => 
        apt.status === 'scheduled' || apt.status === 'confirmed' || !apt.status
      ).length,
      completed: appointmentsInRange.filter(apt => apt.status === 'completed').length,
      cancelled: appointmentsInRange.filter(apt => 
        apt.status === 'cancelled' || apt.status === 'no_show'
      ).length,
      inProgress: appointmentsInRange.filter(apt => apt.status === 'in_progress').length
    };
    
    return stats;
  };

  const appointmentStats = calculateAppointmentStats();

  const handleAccordionChange = (panel: string) => (event: any, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const formatDateHeader = () => {
    if (agendaView === 'daily') {
      return selectedDate.toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
      });
    } else if (agendaView === 'weekly') {
      const weekDates = getWeekDates();
      const start = weekDates[0];
      const end = weekDates[6];
      return `${start.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('es-MX', { 
              year: 'numeric', 
              month: 'long' 
      });
    }
  };

  const renderDailyView = () => {
    const dayAppointments = sortAppointmentsByTime(getAppointmentsForDate(selectedDate));

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {dayAppointments.length > 0 ? (
          dayAppointments.map((appointment) => (
            <Card key={appointment.id} sx={{ 
              p: 3,
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: 1
              }
            }}>
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
                      color={getStatusColor(appointment.status)}
                    />
                    <Chip 
                      label={getAppointmentTypeLabel(appointment.appointment_type)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {appointment.patient_name || 'Paciente'}
                  </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Motivo:</strong> {appointment.reason || 'No especificado'}
                  </Typography>
                  {appointment.notes && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Notas:</strong> {appointment.notes}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Duración: {appointment.duration_minutes || 30} minutos
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Editar cita">
                  <IconButton
                    onClick={() => handleEditAppointment(appointment)}
                    size="small"
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon />
                  </IconButton>
                  </Tooltip>
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No tienes citas programadas para este día
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewAppointment}
              sx={{ borderRadius: '12px' }}
            >
              Programar Cita
            </Button>
          </Paper>
        )}
      </Box>
    );
  };

  const renderWeeklyView = () => {
    const weekDates = getWeekDates();
    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return (
      <Box>
        {weekDates.map((date, index) => {
          const dayAppointments = sortAppointmentsByTime(getAppointmentsForDate(date));
          const isToday = date.toDateString() === new Date().toDateString();
          const panelId = `panel-${index}`;

          return (
            <Accordion 
              key={index}
              expanded={expandedAccordion === panelId}
              onChange={handleAccordionChange(panelId)}
              sx={{ 
                mb: 1,
                '&:before': { display: 'none' },
                backgroundColor: isToday ? 'primary.light' : 'background.paper',
                opacity: isToday ? 1 : 0.9
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: isToday ? 'primary.main' : 'background.default',
                  color: isToday ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isToday ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {weekDays[date.getDay()]}
                    </Typography>
                    <Typography variant="body1">
                      {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </Typography>
                    {isToday && (
                      <Chip label="Hoy" size="small" sx={{ backgroundColor: 'primary.contrastText', color: 'primary.main' }} />
                    )}
                  </Box>
                  <Chip 
                    label={`${dayAppointments.length} cita${dayAppointments.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ 
                      backgroundColor: isToday ? 'primary.contrastText' : 'primary.main',
                      color: isToday ? 'primary.main' : 'primary.contrastText'
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                {dayAppointments.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Hora</TableCell>
                          <TableCell>Paciente</TableCell>
                          <TableCell>Motivo</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dayAppointments.map((appointment) => (
                          <TableRow key={appointment.id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {new Date(appointment.date_time).toLocaleTimeString('es-MX', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {appointment.patient_name || 'Paciente'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.reason || 'No especificado'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={appointment.status} 
                                size="small"
                                color={getStatusColor(appointment.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Editar cita">
                                <IconButton
                                  onClick={() => handleEditAppointment(appointment)}
                                  size="small"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <EventNoteIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No hay citas programadas
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  const renderMonthlyView = () => {
    // Get all days in the current month
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Create array of all days to display (including previous/next month padding)
    const days: (Date | null)[] = [];
    
    // Add padding days from previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Split days into weeks (arrays of 7 days)
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {/* Day headers */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <Box key={day} sx={{ p: 1, textAlign: 'center', fontWeight: 600, color: 'text.secondary' }}>
              {day}
            </Box>
          ))}
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weeks.flat().map((day, index) => {
            if (!day) {
              // Empty cell for padding
              return <Box key={`empty-${index}`} sx={{ height: 80 }} />;
            }
            
            const dayAppointments = getAppointmentsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            
            return (
              <Box
                key={day.toISOString()}
                sx={{
                  height: 80,
                  p: 1,
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isToday ? 'primary.50' : isSelected ? 'primary.100' : 'transparent',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
                onClick={() => setSelectedDate(day)}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'primary.main' : 'text.primary',
                    mb: 0.5
                  }}
                >
                  {day.getDate()}
                </Typography>
                
                {dayAppointments.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <Chip
                        key={apt.id}
                        label={new Date(apt.date_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.6rem',
                          bgcolor: 'success.light',
                          color: 'success.contrastText'
                        }}
                      />
                    ))}
                    {dayAppointments.length > 2 && (
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                        +{dayAppointments.length - 2} más
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Agenda Médica
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={agendaView === 'daily' ? 'contained' : 'outlined'}
            onClick={() => setAgendaView('daily')}
            size="small"
            sx={{ 
              borderRadius: '8px',
              bgcolor: agendaView === 'daily' ? 'primary.main' : 'transparent',
              color: agendaView === 'daily' ? 'white' : 'primary.main',
              borderColor: 'primary.main',
              '&:hover': {
                bgcolor: agendaView === 'daily' ? 'primary.dark' : 'primary.50'
              }
            }}
          >
            Diaria
          </Button>
          <Button
            variant={agendaView === 'weekly' ? 'contained' : 'outlined'}
            onClick={() => setAgendaView('weekly')}
            size="small"
            sx={{ 
              borderRadius: '8px',
              bgcolor: agendaView === 'weekly' ? 'primary.main' : 'transparent',
              color: agendaView === 'weekly' ? 'white' : 'primary.main',
              borderColor: 'primary.main',
              '&:hover': {
                bgcolor: agendaView === 'weekly' ? 'primary.dark' : 'primary.50'
              }
            }}
          >
            Semanal
          </Button>
          <Button
            variant={agendaView === 'monthly' ? 'contained' : 'outlined'}
            onClick={() => setAgendaView('monthly')}
            size="small"
            sx={{ 
              borderRadius: '8px',
              bgcolor: agendaView === 'monthly' ? 'primary.main' : 'transparent',
              color: agendaView === 'monthly' ? 'white' : 'primary.main',
              borderColor: 'primary.main',
              '&:hover': {
                bgcolor: agendaView === 'monthly' ? 'primary.dark' : 'primary.50'
              }
            }}
          >
            Mensual
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

      {/* Appointment Statistics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { 
            label: 'Total Citas', 
            value: appointmentStats.total, 
            color: 'primary',
            subtitle: agendaView === 'daily' ? 'hoy' : agendaView === 'weekly' ? 'esta semana' : 'este mes'
          },
          { 
            label: 'Programadas', 
            value: appointmentStats.scheduled, 
            color: 'info',
            subtitle: 'confirmadas'
          },
          { 
            label: 'En Progreso', 
            value: appointmentStats.inProgress, 
            color: 'warning',
            subtitle: 'en consulta'
          },
          { 
            label: 'Completadas', 
            value: appointmentStats.completed, 
            color: 'success',
            subtitle: 'finalizadas'
          },
          { 
            label: 'Canceladas', 
            value: appointmentStats.cancelled, 
            color: 'error',
            subtitle: 'no realizadas'
          }
        ].map((stat, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                boxShadow: 2,
                transform: 'translateY(-1px)',
                transition: 'all 0.2s ease-in-out'
              }
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: `${stat.color}.main`, mb: 0.5 }}>
              {stat.value}
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, mb: 0.25 }}>
              {stat.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stat.subtitle}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Date Navigation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {formatDateHeader()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={`${agendaView === 'daily' ? 'Día' : agendaView === 'weekly' ? 'Semana' : 'Mes'} anterior`}>
              <IconButton onClick={() => navigateDate('prev')} size="small">
                <PrevIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ir a hoy">
              <Button
                variant="outlined"
                size="small"
                onClick={goToToday}
                startIcon={<TodayIcon />}
                sx={{ borderRadius: '8px' }}
              >
                Hoy
              </Button>
            </Tooltip>
            <Tooltip title={`${agendaView === 'daily' ? 'Día' : agendaView === 'weekly' ? 'Semana' : 'Mes'} siguiente`}>
              <IconButton onClick={() => navigateDate('next')} size="small">
                <NextIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Appointments Content */}
      {agendaView === 'daily' ? renderDailyView() : agendaView === 'weekly' ? renderWeeklyView() : renderMonthlyView()}
    </Box>
  );
};

export default AgendaView;