import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Chip,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Restaurant as LunchIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { apiService } from '../../services/api';

interface ScheduleConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface ScheduleTemplate {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  consultation_duration: number;
  break_duration: number;
  lunch_start?: string;
  lunch_end?: string;
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
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);

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
      setWeeklySchedule(response.data);
      
      // Verificar si ya existe algún horario configurado
      const hasSchedule = Object.values(response.data).some(schedule => schedule !== null);
      setHasExistingSchedule(hasSchedule);
      
    } catch (err: any) {
      setError('Error cargando configuración de horarios');
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultSchedule = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await apiService.post('/api/schedule/generate-weekly-template');
      setSuccess('Horario por defecto generado exitosamente');
      
      // Recargar la configuración
      await loadWeeklySchedule();
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generando horario por defecto');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = async (dayIndex: number, scheduleData: Partial<ScheduleTemplate>) => {
    try {
      setError(null);
      
      const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklySchedule;
      const existingSchedule = weeklySchedule[dayKey];
      
      if (existingSchedule?.id) {
        // Actualizar existente
        const response = await apiService.put(`/api/schedule/templates/${existingSchedule.id}`, scheduleData);
        setWeeklySchedule(prev => ({
          ...prev,
          [dayKey]: response.data
        }));
      } else {
        // Crear nuevo
        const newSchedule = {
          day_of_week: dayIndex,
          start_time: '09:00',
          end_time: '18:00',
          consultation_duration: 30,
          break_duration: 0,
          is_active: true,
          ...scheduleData
        };
        
        const response = await apiService.post('/api/schedule/templates', newSchedule);
        setWeeklySchedule(prev => ({
          ...prev,
          [dayKey]: response.data
        }));
      }
      
      setSuccess('Horario actualizado exitosamente');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error actualizando horario');
    }
  };

  const toggleDayActive = async (dayIndex: number, isActive: boolean) => {
    await updateDaySchedule(dayIndex, { is_active: isActive });
  };

  const updateTimeField = async (dayIndex: number, field: string, value: string) => {
    await updateDaySchedule(dayIndex, { [field]: value });
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
    const dayKey = day.key as keyof WeeklySchedule;
    const schedule = weeklySchedule[dayKey];
    const isActive = schedule?.is_active ?? false;

    return (
      <Accordion key={day.key} expanded={isActive}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: isActive ? 'action.selected' : 'inherit',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => toggleDayActive(day.index, e.target.checked)}
                  color="primary"
                />
              }
              label=""
              sx={{ mr: 2 }}
            />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {day.label}
            </Typography>
            {isActive && schedule && (
              <Chip
                label={`${schedule.start_time} - ${schedule.end_time}`}
                variant="outlined"
                size="small"
                icon={<TimeIcon />}
              />
            )}
          </Box>
        </AccordionSummary>
        
        {isActive && (
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Horarios principales */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Horario de Trabajo
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                        <TimePicker
                          label="Hora de inicio"
                          value={formatTime(schedule?.start_time)}
                          onChange={(newValue) => {
                            if (newValue) {
                              updateTimeField(day.index, 'start_time', formatTimeToString(newValue));
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: "small",
                              fullWidth: true
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                        <TimePicker
                          label="Hora de fin"
                          value={formatTime(schedule?.end_time)}
                          onChange={(newValue) => {
                            if (newValue) {
                              updateTimeField(day.index, 'end_time', formatTimeToString(newValue));
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: "small",
                              fullWidth: true
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Configuración de consultas */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Configuración de Consultas
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Duración (min)"
                        type="number"
                        size="small"
                        fullWidth
                        value={schedule?.consultation_duration || 30}
                        onChange={(e) => {
                          updateDaySchedule(day.index, { 
                            consultation_duration: parseInt(e.target.value) || 30 
                          });
                        }}
                        inputProps={{ min: 15, max: 120, step: 5 }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField
                        label="Descanso (min)"
                        type="number"
                        size="small"
                        fullWidth
                        value={schedule?.break_duration || 0}
                        onChange={(e) => {
                          updateDaySchedule(day.index, { 
                            break_duration: parseInt(e.target.value) || 0 
                          });
                        }}
                        inputProps={{ min: 0, max: 30, step: 5 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Horario de almuerzo */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LunchIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">
                    Horario de Almuerzo (Opcional)
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <TimePicker
                        label="Inicio almuerzo"
                        value={formatTime(schedule?.lunch_start)}
                        onChange={(newValue) => {
                          updateTimeField(day.index, 'lunch_start', formatTimeToString(newValue));
                        }}
                        slotProps={{
                          textField: {
                            size: "small",
                            fullWidth: true
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <TimePicker
                        label="Fin almuerzo"
                        value={formatTime(schedule?.lunch_end)}
                        onChange={(newValue) => {
                          updateTimeField(day.index, 'lunch_end', formatTimeToString(newValue));
                        }}
                        slotProps={{
                          textField: {
                            size: "small",
                            fullWidth: true
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </AccordionDetails>
        )}
      </Accordion>
    );
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    handleClose();
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
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
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

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Configura tus horarios de trabajo para cada día de la semana. 
                Los pacientes podrán agendar citas únicamente en los horarios que tengas habilitados.
              </Typography>
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
