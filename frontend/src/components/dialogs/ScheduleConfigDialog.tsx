import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { apiService } from '../../services/api';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';

interface ScheduleConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface TimeBlock {
  id?: number;
  start_time: string;
  end_time: string;
}

interface ScheduleTemplate {
  id?: number;
  day_of_week: number;
  time_blocks: TimeBlock[];
  is_active: boolean;
}

interface WeeklySchedule {
  monday?: ScheduleTemplate;
  tuesday?: ScheduleTemplate;
  wednesday?: ScheduleTemplate;
  thursday?: ScheduleTemplate;
  friday?: ScheduleTemplate;
  saturday?: ScheduleTemplate;
  sunday?: ScheduleTemplate;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', index: 0 },
  { key: 'tuesday', label: 'Martes', index: 1 },
  { key: 'wednesday', label: 'Miércoles', index: 2 },
  { key: 'thursday', label: 'Jueves', index: 3 },
  { key: 'friday', label: 'Viernes', index: 4 },
  { key: 'saturday', label: 'Sábado', index: 5 },
  { key: 'sunday', label: 'Domingo', index: 6 }
];

const ScheduleConfigDialog: React.FC<ScheduleConfigDialogProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    monday: { day_of_week: 0, time_blocks: [], is_active: false },
    tuesday: { day_of_week: 1, time_blocks: [], is_active: false },
    wednesday: { day_of_week: 2, time_blocks: [], is_active: false },
    thursday: { day_of_week: 3, time_blocks: [], is_active: false },
    friday: { day_of_week: 4, time_blocks: [], is_active: false },
    saturday: { day_of_week: 5, time_blocks: [], is_active: false },
    sunday: { day_of_week: 6, time_blocks: [], is_active: false }
  });
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  
  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(error);

  useEffect(() => {
    if (open) {
      loadWeeklySchedule();
    }
  }, [open]);

  const loadWeeklySchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/api/schedule/templates/weekly');
      console.log('📅 loadWeeklySchedule response:', response);
      console.log('📅 response.data:', response.data);
      console.log('📅 response.data type:', typeof response.data);
      console.log('📅 response.data keys:', response.data ? Object.keys(response.data) : 'null');
      
      // Get the actual data - it might be in response.data or response directly
      const responseData = response.data || response;
      console.log('📅 responseData:', responseData);
      console.log('📅 responseData type:', typeof responseData);
      console.log('📅 responseData keys:', responseData ? Object.keys(responseData) : 'null');
      
      // Merge with default values to ensure all days are present
      const defaultSchedule = {
        monday: { day_of_week: 0, time_blocks: [], is_active: false },
        tuesday: { day_of_week: 1, time_blocks: [], is_active: false },
        wednesday: { day_of_week: 2, time_blocks: [], is_active: false },
        thursday: { day_of_week: 3, time_blocks: [], is_active: false },
        friday: { day_of_week: 4, time_blocks: [], is_active: false },
        saturday: { day_of_week: 5, time_blocks: [], is_active: false },
        sunday: { day_of_week: 6, time_blocks: [], is_active: false }
      };
      
      const mergedSchedule = { ...defaultSchedule, ...responseData };
      console.log('📅 mergedSchedule:', mergedSchedule);
      console.log('📅 mergedSchedule monday:', mergedSchedule.monday);
      console.log('📅 mergedSchedule monday time_blocks:', mergedSchedule.monday?.time_blocks);
      console.log('📅 mergedSchedule monday is_active:', mergedSchedule.monday?.is_active);
      setWeeklySchedule(mergedSchedule);
      
      // Verificar si ya existe algún horario configurado con datos válidos
      const hasSchedule = Object.values(mergedSchedule).some(schedule => 
        schedule !== null && 
        schedule.time_blocks && 
        schedule.time_blocks.some(block => block.start_time && block.end_time)
      );
      setHasExistingSchedule(hasSchedule);
      
    } catch (err: any) {
      console.error('📅 Error loading weekly schedule:', err);
      setError('Error cargando configuración de horarios');
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultSchedule = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await apiService.post('/api/schedule/generate-weekly-template');
      
      // Usar directamente la respuesta del servidor
      setWeeklySchedule(response.data);
      
      // Verificar si ya existe algún horario configurado con datos válidos
      const hasSchedule = Object.values(response.data).some(schedule => 
        schedule !== null && 
        schedule.time_blocks && 
        schedule.time_blocks.some(block => block.start_time && block.end_time)
      );
      setHasExistingSchedule(hasSchedule);
      
      setSuccess('Horario por defecto generado exitosamente');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generando horario por defecto');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = async (dayIndex: number, scheduleData: Partial<ScheduleTemplate>, shouldReload: boolean = false) => {
    try {
      console.log('📅 updateDaySchedule called:', { dayIndex, scheduleData, shouldReload });
      setError(null);
      
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      console.log('📅 existingSchedule in updateDaySchedule:', existingSchedule);
      
      if (existingSchedule?.id) {
        console.log('📅 Updating existing schedule with id:', existingSchedule.id);
        // Actualizar existente
        const response = await apiService.put(`/api/schedule/templates/${existingSchedule.id}`, scheduleData);
        
        // Update local state immediately for fast UI response
        const responseData = response.data || response;
        setWeeklySchedule(prev => ({
          ...prev,
          [dayKey]: responseData
        }));
        
        // Only reload if explicitly requested (for complex operations like time block changes)
        if (shouldReload) {
          await loadWeeklySchedule();
        }
      } else {
        console.log('📅 Creating new schedule for day:', dayIndex);
        // Crear nuevo con un bloque de tiempo por defecto
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
        console.log('📅 newSchedule data:', newSchedule);
        
        const response = await apiService.post('/api/schedule/templates', newSchedule);
        console.log('📅 create schedule response:', response);
        
        // Update local state with the response data
        const responseData = response.data || response;
        console.log('📅 responseData for local update:', responseData);
        setWeeklySchedule(prev => ({
          ...prev,
          [dayKey]: responseData
        }));
        
        // Don't reload immediately - let the local state update handle the UI
        // await loadWeeklySchedule();
      }
      
      setSuccess('Horario actualizado exitosamente');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Error actualizando horario');
    }
  };

  const addTimeBlock = async (dayIndex: number) => {
    try {
      console.log('📅 addTimeBlock called for dayIndex:', dayIndex);
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      console.log('📅 existingSchedule in addTimeBlock:', existingSchedule);
      
      if (existingSchedule) {
        const newTimeBlock: TimeBlock = {
          start_time: '09:00',
          end_time: '17:00'
        };
        
        const updatedTimeBlocks = [...(existingSchedule.time_blocks || []), newTimeBlock];

        // Guardar cambios en el servidor primero, NO actualizar estado local aún
        // updateDaySchedule ya maneja la actualización del estado local con la respuesta del servidor
        await updateDaySchedule(dayIndex, {
          day_of_week: dayIndex,
          time_blocks: updatedTimeBlocks,
          is_active: existingSchedule.is_active
        }, false);
      }
    } catch (error) {
      console.error('Error in addTimeBlock:', error);
      setError('Error al agregar horario. Por favor, intente nuevamente.');
    }
  };

  const removeTimeBlock = async (dayIndex: number, blockIndex: number) => {
    try {
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      
      if (existingSchedule && existingSchedule.time_blocks) {
        const updatedTimeBlocks = existingSchedule.time_blocks.filter((_, index) => index !== blockIndex);

        // Guardar cambios en el servidor primero, NO actualizar estado local aún
        // updateDaySchedule ya maneja la actualización del estado local con la respuesta del servidor
        await updateDaySchedule(dayIndex, {
          day_of_week: dayIndex,
          time_blocks: updatedTimeBlocks,
          is_active: existingSchedule.is_active
        }, false);
      }
    } catch (error) {
      console.error('Error in removeTimeBlock:', error);
      setError('Error al eliminar horario. Por favor, intente nuevamente.');
    }
  };

  const updateTimeBlock = (dayIndex: number, blockIndex: number, field: 'start_time' | 'end_time', value: string) => {
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
      
      // Solo actualizar estado local durante edición (no guardar en servidor aún)
      setWeeklySchedule(prev => ({
        ...prev,
        [dayKey]: updatedSchedule
      }));
    }
  };

  const saveTimeBlockChanges = async (dayIndex: number) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
    const existingSchedule = weeklySchedule[dayKey];
    
    if (existingSchedule) {
      // Guardar cambios en el servidor
      await updateDaySchedule(dayIndex, {
        day_of_week: dayIndex,
        time_blocks: existingSchedule.time_blocks,
        is_active: existingSchedule.is_active
      }, false); // No need to reload since we already have the correct local state
    }
  };

  const toggleDayActive = async (dayIndex: number, isActive: boolean) => {
    try {
      console.log('📅 toggleDayActive called:', { dayIndex, isActive });
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      console.log('📅 existingSchedule:', existingSchedule);
      
      await updateDaySchedule(dayIndex, { 
        is_active: isActive,
        day_of_week: dayIndex,
        time_blocks: existingSchedule?.time_blocks || []
      });
    } catch (error) {
      console.error('📅 Error in toggleDayActive:', error);
      setError('Error al cambiar estado del horario');
    }
  };

  const formatTime = (timeString?: string): Date | null => {
    if (!timeString) return null;
    
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    } catch {
      return null;
    }
  };

  const formatTimeToString = (date: Date | null): string => {
    if (!date) return '';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderDayConfiguration = (day: typeof DAYS_OF_WEEK[0]) => {
    console.log('📅 renderDayConfiguration called for day:', day.key);
    console.log('📅 weeklySchedule:', weeklySchedule);
    const dayKey = day.key as keyof WeeklySchedule;
    const schedule = weeklySchedule[dayKey];
    console.log('📅 schedule for', dayKey, ':', schedule);
    const isActive = schedule?.is_active ?? false;
    const timeBlocks = schedule?.time_blocks || [];
    console.log('📅 renderDayConfiguration - isActive:', isActive, 'timeBlocks:', timeBlocks);
    console.log('📅 renderDayConfiguration - timeBlocks.length:', timeBlocks.length);

    return (
      <Card 
        key={day.key} 
        sx={{ 
          mb: 2,
          border: isActive ? '2px solid' : '1px solid',
          borderColor: isActive ? 'primary.main' : 'divider',
          backgroundColor: isActive ? 'primary.50' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 2,
            transform: 'translateY(-1px)'
          }
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          {/* Header del día */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mr: 2 }}>
                {day.label}
              </Typography>
              
              {/* Estado visual más claro */}
              {isActive ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label="Disponible"
                    color="primary"
                    size="small"
                    icon={<TimeIcon />}
                    variant="filled"
                  />
                  {timeBlocks.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {timeBlocks.length} horario{timeBlocks.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Chip
                  label="No disponible"
                  color="default"
                  size="small"
                  variant="outlined"
                />
              )}
              
              {/* Mostrar resumen de horarios */}
              {isActive && timeBlocks.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                  {timeBlocks.map((block, index) => {
                    // Solo mostrar horarios que tengan valores válidos
                    if (block.start_time && block.end_time) {
                      return (
                        <Chip
                          key={index}
                          label={`${block.start_time} - ${block.end_time}`}
                          variant="outlined"
                          size="small"
                          sx={{ backgroundColor: 'white' }}
                        />
                      );
                    }
                    return null;
                  })}
                </Box>
              )}
            </Box>
            
            {/* Botones de acción más claros */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {!isActive ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => toggleDayActive(day.index, true)}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Agregar Horarios
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => addTimeBlock(day.index)}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Nuevo Horario
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    onClick={() => toggleDayActive(day.index, false)}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Desactivar
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {/* Configuración de horarios (solo si está activo) */}
          {isActive && (
            <Box sx={{ mt: 2 }}>
              {timeBlocks.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>¡Agrega tu primer horario!</strong><br />
                    Haz click en "Nuevo Horario" para definir cuándo atiendes este día.
                  </Typography>
                </Alert>
              )}

              {timeBlocks.map((block, blockIndex) => (
                <Card key={blockIndex} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', backgroundColor: 'background.default' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                        Horario {blockIndex + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeTimeBlock(day.index, blockIndex)}
                        disabled={timeBlocks.length === 1}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'error.50'
                          }
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                          <TimePicker
                            label="Hora de inicio"
                            value={formatTime(block.start_time)}
                            onChange={(newValue) => {
                              if (newValue) {
                                  updateTimeBlock(day.index, blockIndex, 'start_time', formatTimeToString(newValue));
                              }
                            }}
                            closeOnSelect={true}
                            openTo="hours"
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                                onBlur: () => {
                                  // Save to server when user finishes editing
                                  saveTimeBlockChanges(day.index);
                                }
                              },
                              actionBar: {
                                actions: []
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                          <TimePicker
                            label="Hora de fin"
                            value={formatTime(block.end_time)}
                            onChange={(newValue) => {
                              if (newValue) {
                                  updateTimeBlock(day.index, blockIndex, 'end_time', formatTimeToString(newValue));
                              }
                            }}
                            closeOnSelect={true}
                            openTo="hours"
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                                onBlur: () => {
                                  // Save to server when user finishes editing
                                  saveTimeBlockChanges(day.index);
                                }
                              },
                              actionBar: {
                                actions: []
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              
              {timeBlocks.length > 0 && timeBlocks.some(block => block.start_time && block.end_time) && (
                <Alert severity="success" icon={<TimeIcon />} sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Resumen para {day.label}:</strong><br />
                    Los pacientes podrán agendar citas de {timeBlocks
                      .filter(block => block.start_time && block.end_time)
                      .map((block, index) => (
                        <span key={index}>
                          {block.start_time} a {block.end_time}
                          {index < timeBlocks.filter(b => b.start_time && b.end_time).length - 1 ? ', ' : ''}
                        </span>
                      ))}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  const handleSave = async () => {
    try {
      console.log('📅 handleSave called');
      setError(null);
      setSuccess(null);
      
      // Save all active schedules to backend
      const activeSchedules = Object.entries(weeklySchedule).filter(([_, schedule]) => 
        schedule && schedule.is_active
      );
      
      console.log('📅 Active schedules to save:', activeSchedules);
      
      for (const [dayKey, schedule] of activeSchedules) {
        if (schedule && schedule.id) {
          console.log(`📅 Saving schedule for ${dayKey}:`, schedule);
          // The schedule should already be saved, but we can trigger a final sync
          await updateDaySchedule(schedule.day_of_week, {
            day_of_week: schedule.day_of_week,
            time_blocks: schedule.time_blocks || [],
            is_active: schedule.is_active
          }, false);
        }
      }
      
      setSuccess('Horarios guardados exitosamente');
      
      if (onSave) {
        onSave();
      }
      
      // Close after a short delay to show success message
      setTimeout(() => {
        handleClose();
      }, 1000);
      
    } catch (error) {
      console.error('📅 Error in handleSave:', error);
      setError('Error al guardar los horarios');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ScheduleIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            Configuración de Horarios
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Box ref={errorRef} sx={{ mb: 2, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
            <Typography color="white">{error}</Typography>
          </Box>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Cargando configuración...</Typography>
          </Box>
        ) : (
          <>
            {!hasExistingSchedule && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ¡Configura tu horario de trabajo!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Parece que aún no has configurado tus horarios de trabajo. 
                    Puedes generar un horario por defecto (Lunes a Viernes, 9:00-18:00) 
                    o configurar manualmente cada día.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={generateDefaultSchedule}
                    disabled={saving}
                  >
                    {saving ? 'Generando...' : 'Generar Horario Por Defecto'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>¿Cómo funciona?</strong><br />
                  • Para cada día, haz click en <strong>"Agregar Horarios"</strong> para activarlo<br />
                  • Puedes tener múltiples horarios por día (ej: mañana y tarde)<br />
                  • Los pacientes solo podrán agendar en los horarios que configures
                </Typography>
              </Alert>
            </Box>

            <Box>
              {DAYS_OF_WEEK.map(renderDayConfiguration)}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadWeeklySchedule}
          disabled={loading}
        >
          Recargar
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading || saving}
        >
          Guardar y Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleConfigDialog;
