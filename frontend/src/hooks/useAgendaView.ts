import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, addWeeks, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseBackendDate } from '../utils/formatters';

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
  currentDate: Date;
  isToday: boolean;
  filteredAppointments: any[];
  dateRangeTitle: string;

  // Handlers
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


  const getStatusColor = useCallback((status: string): 'success' | 'error' | 'primary' | 'default' => {
    switch (status) {
      case 'confirmada':
        return 'success';
      case 'por_confirmar':
        return 'primary';
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
      case 'confirmada':
        return 'Confirmada';
      case 'por_confirmar':
        return 'Por confirmar';
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
    if (!appointments || appointments.length === 0) {
      return [];
    }

    try {
      switch (view) {
        case 'daily':
          return appointments.filter(apt => {
            try {
              const dateField = apt.date_time || apt.appointment_date;
              if (!dateField) return false;
              const aptDate = parseBackendDate(dateField);
              if (isNaN(aptDate.getTime())) return false;
              return isSameDay(aptDate, date);
            } catch (error) {
              console.warn('Error parsing appointment date:', apt, error);
              return false;
            }
          });
        case 'weekly':
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
          return appointments.filter(apt => {
            try {
              const dateField = apt.date_time || apt.appointment_date;
              if (!dateField) return false;
              const aptDate = parseBackendDate(dateField);
              if (isNaN(aptDate.getTime())) return false;
              return aptDate >= weekStart && aptDate <= weekEnd;
            } catch (error) {
              console.warn('Error parsing appointment date:', apt, error);
              return false;
            }
          });
        case 'monthly':
          const monthStart = startOfMonth(date);
          const monthEnd = endOfMonth(date);
          return appointments.filter(apt => {
            try {
              const dateField = apt.date_time || apt.appointment_date;
              if (!dateField) return false;
              const aptDate = parseBackendDate(dateField);
              if (isNaN(aptDate.getTime())) return false;
              return aptDate >= monthStart && aptDate <= monthEnd;
            } catch (error) {
              console.warn('Error parsing appointment date:', apt, error);
              return false;
            }
          });
        default:
          return appointments;
      }
    } catch (error) {
      console.error('Error in getFilteredAppointments:', error);
      return [];
    }
  }, [appointments]);

  const currentDate = useMemo(() => {
    return localSelectedDate && !isNaN(localSelectedDate.getTime()) ? localSelectedDate : new Date();
  }, [localSelectedDate]);

  const isToday = useMemo(() => {
    return isSameDay(currentDate, new Date());
  }, [currentDate]);

  const filteredAppointments = useMemo(() => {
    const filtered = getFilteredAppointments(currentDate, agendaView);
    // Debug logging
    if (appointments.length > 0 && filtered.length === 0) {
      console.log('🔍 Debug: Appointments exist but none filtered', {
        totalAppointments: appointments.length,
        currentDate: currentDate.toISOString(),
        agendaView,
        sampleAppointment: appointments[0],
        sampleDateField: appointments[0]?.date_time || appointments[0]?.appointment_date
      });
    }
    return filtered;
  }, [currentDate, agendaView, getFilteredAppointments, appointments]);

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
    if (!appointments || appointments.length === 0) {
      return [];
    }
    
    return appointments.filter(apt => {
      try {
        const dateField = apt.date_time || apt.appointment_date;
        if (!dateField) return false;
        const aptDate = parseBackendDate(dateField);
        if (isNaN(aptDate.getTime())) return false;
        return isSameDay(aptDate, day);
      } catch (error) {
        console.warn('Error parsing appointment date in getDayAppointments:', apt, error);
        return false;
      }
    });
  }, [appointments]);

  return {
    // State
    localSelectedDate,
    setLocalSelectedDate,
    currentDate,
    isToday,
    filteredAppointments,
    dateRangeTitle,

    // Handlers
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

