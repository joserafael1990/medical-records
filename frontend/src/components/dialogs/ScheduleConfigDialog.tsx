import React, { useEffect, useMemo, useState } from 'react';
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Grid } from '@mui/material';
import { apiService } from '../../services';
import { Office } from '../../types';
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
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { useScheduleConfigForm, DAYS_OF_WEEK, type WeeklySchedule, type ScheduleTemplate } from '../../hooks/useScheduleConfigForm';
import { preventBackdropClose } from '../../utils/dialogHelpers';

interface ScheduleConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  onScheduleUpdated?: () => void;
}

const ScheduleConfigDialog: React.FC<ScheduleConfigDialogProps> = ({
  open,
  onClose,
  onSave,
  onScheduleUpdated
}) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [officesError, setOfficesError] = useState<string | null>(null);

  // Load doctor's offices when the dialog opens so the user can pick which
  // consultorio to configure. Falls back to the first one if none is
  // selected yet.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiService.offices.getOffices();
        if (cancelled) return;
        const list = (data as Office[]) || [];
        setOffices(list);
        setOfficesError(null);
        setSelectedOfficeId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
      } catch (err) {
        if (!cancelled) setOfficesError('Error al cargar consultorios');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const formHook = useScheduleConfigForm({
    open,
    officeId: selectedOfficeId,
    onScheduleUpdated
  });

  const {
    loading,
    saving,
    error,
    success,
    weeklySchedule,
    hasExistingSchedule,
    loadWeeklySchedule,
    generateDefaultSchedule,
    copyScheduleFromOffice,
    addTimeBlock,
    removeTimeBlock,
    updateTimeBlock,
    saveTimeBlockChanges,
    toggleDayActive,
    formatTime,
    formatTimeToString,
    handleSave,
    handleClose
  } = formHook;

  // Offices the user could copy from: any other office that already has
  // at least one active day configured. We don't know that from here alone,
  // so we offer all other offices and let the copy operation no-op if the
  // source is empty.
  const otherOffices = useMemo(
    () => offices.filter((o) => o.id !== selectedOfficeId),
    [offices, selectedOfficeId]
  );

  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(error);

  const finalHandleClose = () => {
    handleClose();
    onClose();
  };

  const finalHandleSave = async () => {
    await handleSave();
    if (onSave) {
      onSave();
    }
    onClose();
  };

  const renderDayConfiguration = (day: typeof DAYS_OF_WEEK[0]) => {
    const dayKey = day.key as keyof WeeklySchedule;
    const schedule = weeklySchedule[dayKey];
    const isActive = schedule?.is_active ?? false;
    const timeBlocks = schedule?.time_blocks || [];

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
                      <IconButton aria-label="Cerrar"
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

  return (
    <Dialog
      open={open}
      onClose={preventBackdropClose(finalHandleClose)}
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
        <IconButton aria-label="Cerrar" onClick={finalHandleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {offices.length > 1 && (
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel id="schedule-office-select-label">Consultorio</InputLabel>
            <Select
              labelId="schedule-office-select-label"
              label="Consultorio"
              value={selectedOfficeId ?? ''}
              onChange={(e) => setSelectedOfficeId(Number(e.target.value))}
            >
              {offices.map((office) => (
                <MenuItem key={office.id} value={office.id}>
                  {office.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {officesError && (
          <Alert severity="error" sx={{ mb: 2 }}>{officesError}</Alert>
        )}

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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <Typography>Cargando horarios...</Typography>
          </Box>
        ) : (
          <>
            {!hasExistingSchedule && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Este consultorio no tiene horarios configurados aún.</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Elige cómo empezar:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={generateDefaultSchedule}
                    disabled={saving}
                  >
                    Generar horario por defecto (L–V 9–18)
                  </Button>
                  {otherOffices.map((office) => (
                    <Button
                      key={office.id}
                      variant="outlined"
                      size="small"
                      onClick={() => copyScheduleFromOffice(office.id)}
                      disabled={saving}
                    >
                      Copiar horario de {office.name}
                    </Button>
                  ))}
                </Box>
              </Alert>
            )}

            <Box sx={{ mt: 2 }}>
              {DAYS_OF_WEEK.map(day => renderDayConfiguration(day))}
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
          onClick={finalHandleSave}
          disabled={loading || saving}
        >
          Guardar y Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleConfigDialog;
