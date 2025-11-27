import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Tooltip,
  IconButton,
  Button
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { AppointmentReminderFormData } from '../../types';
import { logger } from '../../utils/logger';

interface RemindersConfigProps {
  reminders: AppointmentReminderFormData[];
  onChange: (reminders: AppointmentReminderFormData[]) => void;
  appointmentDate?: string; // ISO date string to calculate reminder times
  disabled?: boolean;
  renderActionButton?: (addReminderButton: React.ReactNode) => React.ReactNode;
}

export const RemindersConfig: React.FC<RemindersConfigProps> = ({
  reminders,
  onChange,
  appointmentDate,
  disabled = false,
  renderActionButton
}) => {
  // Initialize with up to 3 reminder slots
  const [reminderSlots, setReminderSlots] = useState<Array<AppointmentReminderFormData & { id: string }>>(() => {
    // If reminders are provided, use them; otherwise create empty slots
    if (reminders && reminders.length > 0) {
      return reminders.map((r, index) => ({
        ...r,
        id: `reminder-${r.reminder_number || index + 1}`
      }));
    }
    // Create 3 empty slots (values in minutes for internal storage)
    return [
      { id: 'reminder-1', reminder_number: 1, offset_minutes: 1440, enabled: false }, // 24 hours (1440 min)
      { id: 'reminder-2', reminder_number: 2, offset_minutes: 360, enabled: false }, // 6 hours (360 min)
      { id: 'reminder-3', reminder_number: 3, offset_minutes: 60, enabled: false } // 1 hour (60 min)
    ];
  });

  // Track if we're updating from internal state (to prevent infinite loops)
  const isInternalUpdateRef = useRef(false);

  // Update reminderSlots when reminders prop changes (only from external sources)
  useEffect(() => {
    // Skip if this is an internal update
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (reminders && reminders.length > 0) {
      // Create a map of existing reminders by reminder_number
      const remindersMap = new Map(reminders.map(r => [r.reminder_number, r]));
      
      // Create 3 slots, filling with existing reminders or defaults
      const slots = [1, 2, 3].map(num => {
        const existing = remindersMap.get(num);
        if (existing) {
          return {
            ...existing,
            id: `reminder-${num}`
          };
        }
        // Default values for each slot (values in minutes for internal storage)
        return {
          id: `reminder-${num}`,
          reminder_number: num,
          offset_minutes: num === 1 ? 1440 : num === 2 ? 360 : 60, // 24h, 6h, 1h
          enabled: false
        };
      });
      
      setReminderSlots(slots);
    } else if (reminders && reminders.length === 0) {
      // Only reset if all slots are currently disabled (to avoid clearing user input)
      const allDisabled = reminderSlots.every(r => !r.enabled);
      if (allDisabled) {
        // Reset to default empty slots (values in minutes for internal storage)
        setReminderSlots([
          { id: 'reminder-1', reminder_number: 1, offset_minutes: 1440, enabled: false }, // 24 hours
          { id: 'reminder-2', reminder_number: 2, offset_minutes: 360, enabled: false }, // 6 hours
          { id: 'reminder-3', reminder_number: 3, offset_minutes: 60, enabled: false } // 1 hour
        ]);
      }
    }
  }, [reminders]);

  // Calculate reminder time display
  const getReminderTimeDisplay = (offsetMinutes: number): string => {
    if (!appointmentDate) {
      return '';
    }

    try {
      const appointmentDt = new Date(appointmentDate);
      const reminderDt = new Date(appointmentDt.getTime() - offsetMinutes * 60 * 1000);
      
      const now = new Date();
      const diffMs = reminderDt.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} día${diffDays > 1 ? 's' : ''} antes`;
      } else if (diffHours > 0) {
        return `${diffHours} hora${diffHours > 1 ? 's' : ''} antes`;
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} antes`;
      }
    } catch (error) {
      logger.error('Error calculating reminder time', error, 'ui');
      return '';
    }
  };

  // Format offset minutes to human-readable
  const formatOffset = (minutes: number): string => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} día${days > 1 ? 's' : ''}`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }
  };

  const handleReminderChange = (index: number, field: keyof AppointmentReminderFormData, value: any) => {
    const updated = [...reminderSlots];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setReminderSlots(updated);
    
    // Mark as internal update to prevent useEffect from resetting
    isInternalUpdateRef.current = true;
    
    // Notify parent with only enabled reminders
    const enabledReminders = updated
      .filter(r => r.enabled)
      .map(r => ({
        reminder_number: r.reminder_number,
        offset_minutes: r.offset_minutes,
        enabled: r.enabled
      }));
    
    onChange(enabledReminders);
  };

  const handleDeleteReminder = (reminderNumber: number) => {
    const updated = reminderSlots.map(r => {
      if (r.reminder_number === reminderNumber) {
        return {
          ...r,
          enabled: false,
          offset_minutes: reminderNumber === 1 ? 1440 : reminderNumber === 2 ? 360 : 60 // Reset to defaults: 24h, 6h, 1h
        };
      }
      return r;
    });
    setReminderSlots(updated);
    
    // Mark as internal update to prevent useEffect from resetting
    isInternalUpdateRef.current = true;
    
    // Notify parent with only enabled reminders
    const enabledReminders = updated
      .filter(r => r.enabled)
      .map(r => ({
        reminder_number: r.reminder_number,
        offset_minutes: r.offset_minutes,
        enabled: r.enabled
      }));
    
    onChange(enabledReminders);
  };

  const handleAddReminder = () => {
    // Find the next available reminder number (1, 2, or 3)
    const enabledNumbers = reminderSlots.filter(r => r.enabled).map(r => r.reminder_number);
    const availableNumbers = [1, 2, 3].filter(num => !enabledNumbers.includes(num));
    
    if (availableNumbers.length === 0) {
      return; // Already at max
    }
    
    const nextNumber = availableNumbers[0];
    // Default offset: 0 (empty fields)
    const defaultOffset = 0;
    
    const updated = reminderSlots.map(r => {
      if (r.reminder_number === nextNumber) {
        return {
          ...r,
          enabled: true,
          offset_minutes: defaultOffset
        };
      }
      return r;
    });
    
    setReminderSlots(updated);
    
    // Mark as internal update to prevent useEffect from resetting
    isInternalUpdateRef.current = true;
    
    // Notify parent with enabled reminders
    const enabledReminders = updated
      .filter(r => r.enabled)
      .map(r => ({
        reminder_number: r.reminder_number,
        offset_minutes: r.offset_minutes,
        enabled: r.enabled
      }));
    
    onChange(enabledReminders);
  };

  const enabledCount = useMemo(() => {
    return reminderSlots.filter(r => r.enabled).length;
  }, [reminderSlots]);

  // Get only enabled reminders for display
  const enabledReminders = useMemo(() => {
    return reminderSlots.filter(r => r.enabled).sort((a, b) => a.reminder_number - b.reminder_number);
  }, [reminderSlots]);

  // Find the index in reminderSlots for a given reminder number
  const findReminderIndex = (reminderNumber: number): number => {
    return reminderSlots.findIndex(r => r.reminder_number === reminderNumber);
  };

  const canAddMore = enabledCount < 3;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Recordatorios Automáticos
        {enabledCount > 0 && (
          <Chip
            label={`${enabledCount} activo${enabledCount > 1 ? 's' : ''}`}
            size="small"
            color="primary"
            sx={{ ml: 1 }}
          />
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Configura hasta 3 recordatorios automáticos por WhatsApp. Cada recordatorio se enviará automáticamente antes de la cita.
      </Typography>

      {enabledReminders.length === 0 ? (
        <Box sx={{ mb: 2 }}>
          {renderActionButton ? (
            renderActionButton(
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddReminder}
                disabled={disabled || !canAddMore}
                size="small"
              >
                Agregar recordatorio
              </Button>
            )
          ) : (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddReminder}
              disabled={disabled || !canAddMore}
              size="small"
            >
              Agregar recordatorio
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {enabledReminders.map((reminder) => {
              const index = findReminderIndex(reminder.reminder_number);
              return (
                <Grid size={{ xs: 12 }} key={reminder.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      bgcolor: 'background.paper',
                      transition: 'all 0.2s'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimeIcon fontSize="small" color="primary" />
                          <Typography variant="subtitle2">
                            Recordatorio {reminder.reminder_number}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteReminder(reminder.reminder_number)}
                            disabled={disabled}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 4 }}>
                            <TextField
                              label="Días"
                              type="number"
                              value={Math.floor(reminder.offset_minutes / 1440) || ''}
                              onChange={(e) => {
                                const days = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                                const currentHours = Math.floor((reminder.offset_minutes % 1440) / 60);
                                const currentMinutes = reminder.offset_minutes % 60;
                                const totalMinutes = days * 1440 + currentHours * 60 + currentMinutes;
                                if (totalMinutes >= 0) {
                                  handleReminderChange(index, 'offset_minutes', totalMinutes);
                                }
                              }}
                              disabled={disabled}
                              fullWidth
                              size="small"
                              inputProps={{ 
                                min: 0, 
                                step: 1,
                                style: { 
                                  MozAppearance: 'textfield',
                                  WebkitAppearance: 'none'
                                }
                              }}
                              sx={{
                                '& input[type=number]': {
                                  MozAppearance: 'textfield',
                                },
                                '& input[type=number]::-webkit-outer-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                                '& input[type=number]::-webkit-inner-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <TextField
                              label="Horas"
                              type="number"
                              value={Math.floor((reminder.offset_minutes % 1440) / 60) || ''}
                              onChange={(e) => {
                                const hours = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                                const currentDays = Math.floor(reminder.offset_minutes / 1440);
                                const currentMinutes = reminder.offset_minutes % 60;
                                const totalMinutes = currentDays * 1440 + hours * 60 + currentMinutes;
                                if (totalMinutes >= 0) {
                                  handleReminderChange(index, 'offset_minutes', totalMinutes);
                                }
                              }}
                              disabled={disabled}
                              fullWidth
                              size="small"
                              inputProps={{ 
                                min: 0, 
                                max: 23, 
                                step: 1,
                                style: { 
                                  MozAppearance: 'textfield',
                                  WebkitAppearance: 'none'
                                }
                              }}
                              sx={{
                                '& input[type=number]': {
                                  MozAppearance: 'textfield',
                                },
                                '& input[type=number]::-webkit-outer-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                                '& input[type=number]::-webkit-inner-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                              }}
                            />
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <TextField
                              label="Minutos"
                              type="number"
                              value={reminder.offset_minutes % 60 || ''}
                              onChange={(e) => {
                                const minutes = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                                const currentDays = Math.floor(reminder.offset_minutes / 1440);
                                const currentHours = Math.floor((reminder.offset_minutes % 1440) / 60);
                                const totalMinutes = currentDays * 1440 + currentHours * 60 + minutes;
                                if (totalMinutes >= 0) {
                                  handleReminderChange(index, 'offset_minutes', totalMinutes);
                                }
                              }}
                              disabled={disabled}
                              fullWidth
                              size="small"
                              inputProps={{ 
                                min: 0, 
                                max: 59, 
                                step: 1,
                                style: { 
                                  MozAppearance: 'textfield',
                                  WebkitAppearance: 'none'
                                }
                              }}
                              sx={{
                                '& input[type=number]': {
                                  MozAppearance: 'textfield',
                                },
                                '& input[type=number]::-webkit-outer-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                                '& input[type=number]::-webkit-inner-spin-button': {
                                  WebkitAppearance: 'none',
                                  margin: 0,
                                },
                              }}
                            />
                          </Grid>
                        </Grid>
                        {appointmentDate && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Fecha y hora de envío: {(() => {
                              try {
                                const appointmentDt = new Date(appointmentDate);
                                const reminderDt = new Date(appointmentDt.getTime() - reminder.offset_minutes * 60 * 1000);
                                return reminderDt.toLocaleString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } catch {
                                return 'Fecha inválida';
                              }
                            })()}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          
          {canAddMore && enabledReminders.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddReminder}
                disabled={disabled}
                size="small"
              >
                Agregar otro recordatorio
              </Button>
            </Box>
          )}
        </>
      )}

      {enabledCount >= 3 && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
          Máximo 3 recordatorios activos. Elimina uno para agregar otro.
        </Typography>
      )}
    </Box>
  );
};

