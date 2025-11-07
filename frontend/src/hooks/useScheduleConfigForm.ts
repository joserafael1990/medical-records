import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';
import { useToast } from '../components/common/ToastNotification';

export interface TimeBlock {
  id?: number;
  start_time: string;
  end_time: string;
}

export interface ScheduleTemplate {
  id?: number;
  day_of_week: number;
  time_blocks: TimeBlock[];
  is_active: boolean;
}

export interface WeeklySchedule {
  monday?: ScheduleTemplate;
  tuesday?: ScheduleTemplate;
  wednesday?: ScheduleTemplate;
  thursday?: ScheduleTemplate;
  friday?: ScheduleTemplate;
  saturday?: ScheduleTemplate;
  sunday?: ScheduleTemplate;
}

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', index: 0 },
  { key: 'tuesday', label: 'Martes', index: 1 },
  { key: 'wednesday', label: 'Miércoles', index: 2 },
  { key: 'thursday', label: 'Jueves', index: 3 },
  { key: 'friday', label: 'Viernes', index: 4 },
  { key: 'saturday', label: 'Sábado', index: 5 },
  { key: 'sunday', label: 'Domingo', index: 6 }
];

export interface UseScheduleConfigFormProps {
  open: boolean;
  onScheduleUpdated?: () => void;
}

export interface UseScheduleConfigFormReturn {
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  weeklySchedule: WeeklySchedule;
  hasExistingSchedule: boolean;
  loadWeeklySchedule: () => Promise<void>;
  generateDefaultSchedule: () => Promise<void>;
  updateDaySchedule: (dayIndex: number, scheduleData: Partial<ScheduleTemplate>, shouldReload?: boolean) => Promise<void>;
  addTimeBlock: (dayIndex: number) => Promise<void>;
  removeTimeBlock: (dayIndex: number, blockIndex: number) => Promise<void>;
  updateTimeBlock: (dayIndex: number, blockIndex: number, field: 'start_time' | 'end_time', value: string) => void;
  saveTimeBlockChanges: (dayIndex: number) => Promise<void>;
  toggleDayActive: (dayIndex: number, isActive: boolean) => Promise<void>;
  formatTime: (timeString?: string) => Date | null;
  formatTimeToString: (date: Date | null) => string;
  handleSave: () => Promise<void>;
  handleClose: () => void;
}

const getDefaultSchedule = (): WeeklySchedule => ({
  monday: { day_of_week: 0, time_blocks: [], is_active: false },
  tuesday: { day_of_week: 1, time_blocks: [], is_active: false },
  wednesday: { day_of_week: 2, time_blocks: [], is_active: false },
  thursday: { day_of_week: 3, time_blocks: [], is_active: false },
  friday: { day_of_week: 4, time_blocks: [], is_active: false },
  saturday: { day_of_week: 5, time_blocks: [], is_active: false },
  sunday: { day_of_week: 6, time_blocks: [], is_active: false }
});

export const useScheduleConfigForm = (
  props: UseScheduleConfigFormProps
): UseScheduleConfigFormReturn => {
  const { open, onScheduleUpdated } = props;
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(getDefaultSchedule());
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);

  const loadWeeklySchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      logger.debug('Loading weekly schedule', undefined, 'api');
      const response = await apiService.appointments.api.get('/api/schedule/templates/weekly');
      
      const responseData = response.data || response;
      const defaultSchedule = getDefaultSchedule();
      const mergedSchedule = { ...defaultSchedule, ...responseData };
      
      logger.debug('Weekly schedule loaded', { schedule: mergedSchedule }, 'api');
      setWeeklySchedule(mergedSchedule);
      
      const hasSchedule = Object.values(mergedSchedule).some(schedule => 
        schedule !== null && 
        schedule.time_blocks && 
        schedule.time_blocks.some(block => block.start_time && block.end_time)
      );
      setHasExistingSchedule(hasSchedule);
      
    } catch (err: any) {
      logger.error('Error loading weekly schedule', err, 'api');
      setError('Error cargando configuración de horarios');
      showError('Error cargando configuración de horarios');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const generateDefaultSchedule = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      
      logger.debug('Generating default schedule', undefined, 'api');
      const response = await apiService.appointments.api.post('/api/schedule/generate-weekly-template');
      
      setWeeklySchedule(response.data);
      
      const hasSchedule = Object.values(response.data).some(schedule => 
        schedule !== null && 
        schedule.time_blocks && 
        schedule.time_blocks.some(block => block.start_time && block.end_time)
      );
      setHasExistingSchedule(hasSchedule);
      
      setSuccess('Horario por defecto generado exitosamente');
      showSuccess('Horario por defecto generado exitosamente');
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error generando horario por defecto';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [showSuccess, showError]);

  const updateDaySchedule = useCallback(async (
    dayIndex: number,
    scheduleData: Partial<ScheduleTemplate>,
    shouldReload: boolean = false
  ) => {
    try {
      logger.debug('Updating day schedule', { dayIndex, scheduleData }, 'api');
      setError(null);
      
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      
      if (existingSchedule?.id) {
        logger.debug('Updating existing schedule', { id: existingSchedule.id }, 'api');
        const response = await apiService.appointments.api.put(
          `/api/schedule/templates/${existingSchedule.id}`,
          scheduleData
        );
        
        const responseData = response.data || response;
        setWeeklySchedule(prev => ({
          ...prev,
          [dayKey]: responseData
        }));
        
        if (shouldReload) {
          await loadWeeklySchedule();
        }
      } else {
        logger.debug('Creating new schedule', { dayIndex }, 'api');
        const newSchedule = {
          day_of_week: dayIndex,
          time_blocks: [
            {
              start_time: '09:00',
              end_time: '18:00'
            }
          ],
          is_active: true,
          ...scheduleData
        };
        
        const response = await apiService.appointments.api.post('/api/schedule/templates', newSchedule);
        const responseData = response.data || response;
        
        setWeeklySchedule(prev => ({
          ...prev,
          [dayKey]: responseData
        }));
      }
      
      setSuccess('Horario actualizado exitosamente');
      showSuccess('Horario actualizado exitosamente');
      
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 'Error actualizando horario';
      setError(errorMessage);
      showError(errorMessage);
    }
  }, [weeklySchedule, loadWeeklySchedule, onScheduleUpdated, showSuccess, showError]);

  const addTimeBlock = useCallback(async (dayIndex: number) => {
    try {
      logger.debug('Adding time block', { dayIndex }, 'api');
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      
      if (existingSchedule) {
        const newTimeBlock: TimeBlock = {
          start_time: '09:00',
          end_time: '17:00'
        };
        
        const updatedTimeBlocks = [...(existingSchedule.time_blocks || []), newTimeBlock];

        await updateDaySchedule(dayIndex, {
          day_of_week: dayIndex,
          time_blocks: updatedTimeBlocks,
          is_active: existingSchedule.is_active
        }, false);
      }
    } catch (error) {
      logger.error('Error in addTimeBlock', error, 'api');
      const errorMessage = 'Error al agregar horario. Por favor, intente nuevamente.';
      setError(errorMessage);
      showError(errorMessage);
    }
  }, [weeklySchedule, updateDaySchedule, showError]);

  const removeTimeBlock = useCallback(async (dayIndex: number, blockIndex: number) => {
    try {
      logger.debug('Removing time block', { dayIndex, blockIndex }, 'api');
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      
      if (existingSchedule && existingSchedule.time_blocks) {
        const updatedTimeBlocks = existingSchedule.time_blocks.filter((_, index) => index !== blockIndex);

        await updateDaySchedule(dayIndex, {
          day_of_week: dayIndex,
          time_blocks: updatedTimeBlocks,
          is_active: existingSchedule.is_active
        }, false);
      }
    } catch (error) {
      logger.error('Error in removeTimeBlock', error, 'api');
      const errorMessage = 'Error al eliminar horario. Por favor, intente nuevamente.';
      setError(errorMessage);
      showError(errorMessage);
    }
  }, [weeklySchedule, updateDaySchedule, showError]);

  const updateTimeBlock = useCallback((
    dayIndex: number,
    blockIndex: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
    const existingSchedule = weeklySchedule[dayKey];
    
    if (existingSchedule && existingSchedule.time_blocks) {
      const updatedTimeBlocks = existingSchedule.time_blocks.map((block, index) => {
        if (index === blockIndex) {
          return { ...block, [field]: value };
        }
        return block;
      });
      
      const updatedSchedule = {
        ...existingSchedule,
        time_blocks: updatedTimeBlocks
      };
      
      setWeeklySchedule(prev => ({
        ...prev,
        [dayKey]: updatedSchedule
      }));
    }
  }, [weeklySchedule]);

  const saveTimeBlockChanges = useCallback(async (dayIndex: number) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
    const existingSchedule = weeklySchedule[dayKey];
    
    if (existingSchedule) {
      await updateDaySchedule(dayIndex, {
        day_of_week: dayIndex,
        time_blocks: existingSchedule.time_blocks,
        is_active: existingSchedule.is_active
      }, false);
    }
  }, [weeklySchedule, updateDaySchedule]);

  const toggleDayActive = useCallback(async (dayIndex: number, isActive: boolean) => {
    try {
      logger.debug('Toggling day active', { dayIndex, isActive }, 'api');
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      
      await updateDaySchedule(dayIndex, { 
        is_active: isActive,
        day_of_week: dayIndex,
        time_blocks: existingSchedule?.time_blocks || []
      });
    } catch (error) {
      logger.error('Error in toggleDayActive', error, 'api');
      const errorMessage = 'Error al cambiar estado del horario';
      setError(errorMessage);
      showError(errorMessage);
    }
  }, [weeklySchedule, updateDaySchedule, showError]);

  const formatTime = useCallback((timeString?: string): Date | null => {
    if (!timeString) return null;
    
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    } catch {
      return null;
    }
  }, []);

  const formatTimeToString = useCallback((date: Date | null): string => {
    if (!date) return '';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  const handleSave = useCallback(async () => {
    try {
      logger.debug('Saving all schedules', undefined, 'api');
      setError(null);
      setSuccess(null);
      
      const activeSchedules = Object.entries(weeklySchedule).filter(([_, schedule]) => 
        schedule && schedule.is_active
      );
      
      logger.debug('Active schedules to save', { count: activeSchedules.length }, 'api');
      
      for (const [dayKey, schedule] of activeSchedules) {
        if (schedule && schedule.id) {
          await updateDaySchedule(schedule.day_of_week, {
            day_of_week: schedule.day_of_week,
            time_blocks: schedule.time_blocks || [],
            is_active: schedule.is_active
          }, false);
        }
      }
      
      setSuccess('Horarios guardados exitosamente');
      showSuccess('Horarios guardados exitosamente');
      
    } catch (err: any) {
      logger.error('Error saving schedules', err, 'api');
      const errorMessage = 'Error al guardar los horarios';
      setError(errorMessage);
      showError(errorMessage);
    }
  }, [weeklySchedule, updateDaySchedule, showSuccess, showError]);

  const handleClose = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  useEffect(() => {
    if (open) {
      loadWeeklySchedule();
    }
  }, [open, loadWeeklySchedule]);

  return {
    loading,
    saving,
    error,
    success,
    weeklySchedule,
    hasExistingSchedule,
    loadWeeklySchedule,
    generateDefaultSchedule,
    updateDaySchedule,
    addTimeBlock,
    removeTimeBlock,
    updateTimeBlock,
    saveTimeBlockChanges,
    toggleDayActive,
    formatTime,
    formatTimeToString,
    handleSave,
    handleClose
  };
};


