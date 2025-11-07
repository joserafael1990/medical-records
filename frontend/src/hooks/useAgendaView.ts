import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseBackendDate } from '../utils/formatters';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';

export interface UseAgendaViewProps {
  appointments?: any[];
  selectedDate?: Date;
  setSelectedDate?: (date: Date) => void;
  agendaView?: 'daily' | 'weekly' | 'monthly';
  setAgendaView?: (view: 'daily' | 'weekly' | 'monthly') => void;
  forceRefresh?: () => void;
}

export interface UseAgendaViewReturn {
  // State
  localSelectedDate: Date;
  setLocalSelectedDate: (date: Date) => void;
  sendingWhatsApp: number | null;
  currentDate: Date;
  isToday: boolean;
  filteredAppointments: any[];
  dateRangeTitle: string;

  // Handlers
  handleSendWhatsAppReminder: (appointment: any) => Promise<void>;
  handleDateNavigation: (direction: 'prev' | 'next') => void;
  goToToday: () => void;

  // Utilities
  getStatusColor: (status: string) => 'success' | 'error' | 'primary' | 'default';
  getStatusLabel: (status: string) => string;
  getFilteredAppointments: (date: Date, view: 'daily' | 'weekly' | 'monthly') => any[];
  getDateRangeTitle: () => string;
  getWeekDays: () => Date[];
  getCalendarDays: () => Date[];
  getWeeks: () => Date[][];
  getDayAppointments: (day: Date) => any[];
}

export const useAgendaView = (
  props: UseAgendaViewProps
): UseAgendaViewReturn => {
  const {
    appointments = [],
    selectedDate = new Date(),
    setSelectedDate,
    agendaView = 'daily',
    setAgendaView,
    forceRefresh
  } = props;

  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate || new Date());
  const { showSuccess, showError } = useToast();
  const [sendingWhatsApp, setSendingWhatsApp] = useState<number | null>(null);

  // Actualizar fecha local cuando cambie la prop
  useEffect(() => {
    setLocalSelectedDate(selectedDate);
  }, [selectedDate]);

  // Asegurar que si la fecha seleccionada es hoy, se muestren las citas de hoy
  useEffect(() => {
    const today = new Date();
    const isSelectedDateToday = isSameDay(localSelectedDate, today);
    
    if (isSelectedDateToday && agendaView === 'daily' && forceRefresh) {
      const timeoutId = setTimeout(() => {
        forceRefresh();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Función para enviar recordatorio por WhatsApp
  const handleSendWhatsAppReminder = useCallback(async (appointment: any) => {
    if (!appointment.id) {
      showError('No se puede enviar WhatsApp: Cita sin ID');
      return;
    }

    setSendingWhatsApp(appointment.id);
    try {
      logger.debug('Sending WhatsApp reminder', { appointmentId: appointment.id }, 'api');
      await apiService.whatsapp.sendAppointmentReminder(appointment.id);
      showSuccess('Recordatorio enviado por WhatsApp exitosamente');
    } catch (error: any) {
      logger.error('Error sending WhatsApp reminder', error, 'api');
      
      const errorDetail = error.detail || error.response?.data?.detail || 'Error al enviar recordatorio por WhatsApp';
      const statusCode = error.status || error.response?.status;
      
      if (errorDetail.includes('more than 24 hours') || errorDetail.includes('24 hours have passed')) {
        showError('No se puede enviar el mensaje porque han pasado más de 24 horas desde la última interacción del paciente con WhatsApp. El paciente debe enviar un mensaje primero para reanudar la conversación.');
      } else if (statusCode === 503) {
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
  }, [showSuccess, showError]);

  const getStatusColor = useCallback((status: string): 'success' | 'error' | 'primary' | 'default' => {
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
  }, []);

  const getStatusLabel = useCallback((status: string): string => {
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
  }, []);

  // Función para obtener citas filtradas por vista
  const getFilteredAppointments = useCallback((date: Date, view: 'daily' | 'weekly' | 'monthly'): any[] => {
    switch (view) {
      case 'daily':
        return appointments.filter(apt => {
          const aptDate = parseBackendDate(apt.date_time);
          return isSameDay(aptDate, date);
        });
      case 'weekly':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
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
  }, [appointments]);

  const currentDate = useMemo(() => {
    return localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
  }, [localSelectedDate]);

  const isToday = useMemo(() => {
    return isSameDay(currentDate, new Date());
  }, [currentDate]);

  const filteredAppointments = useMemo(() => {
    return getFilteredAppointments(currentDate, agendaView);
  }, [currentDate, agendaView, getFilteredAppointments]);

  // Navegación de fechas
  const handleDateNavigation = useCallback((direction: 'prev' | 'next') => {
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
  }, [currentDate, agendaView, setSelectedDate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setLocalSelectedDate(today);
    setSelectedDate?.(today);
  }, [setSelectedDate]);

  // Obtener rango de fechas para el título
  const getDateRangeTitle = useCallback((): string => {
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
  }, [localSelectedDate, agendaView]);

  const dateRangeTitle = useMemo(() => {
    return getDateRangeTitle();
  }, [getDateRangeTitle]);

  // Helper functions for rendering
  const getWeekDays = useCallback((): Date[] => {
    const currentDate = localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  }, [localSelectedDate]);

  const getCalendarDays = useCallback((): Date[] => {
    const currentDate = localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [localSelectedDate]);

  const getWeeks = useCallback((): Date[][] => {
    const calendarDays = getCalendarDays();
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [getCalendarDays]);

  const getDayAppointments = useCallback((day: Date): any[] => {
    return appointments.filter(apt => 
      isSameDay(parseBackendDate(apt.date_time), day)
    );
  }, [appointments]);

  return {
    // State
    localSelectedDate,
    setLocalSelectedDate,
    sendingWhatsApp,
    currentDate,
    isToday,
    filteredAppointments,
    dateRangeTitle,

    // Handlers
    handleSendWhatsAppReminder,
    handleDateNavigation,
    goToToday,

    // Utilities
    getStatusColor,
    getStatusLabel,
    getFilteredAppointments,
    getDateRangeTitle,
    getWeekDays,
    getCalendarDays,
    getWeeks,
    getDayAppointments
  };
};

