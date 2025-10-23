import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface TimeBlock {
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  time_blocks: TimeBlock[];
}

interface WeeklyScheduleData {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

interface ScheduleStepProps {
  scheduleData: WeeklyScheduleData;
  onScheduleChange: (day: string, schedule: DaySchedule) => void;
  onTimeBlockChange: (day: string, blockIndex: number, field: string, value: string) => void;
  onAddTimeBlock: (day: string) => void;
  onRemoveTimeBlock: (day: string, blockIndex: number) => void;
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

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  scheduleData,
  onScheduleChange,
  onTimeBlockChange,
  onAddTimeBlock,
  onRemoveTimeBlock
}) => {
  const getDaySchedule = (day: string): DaySchedule => {
    return scheduleData[day as keyof WeeklyScheduleData] || {
      day_of_week: DAYS_OF_WEEK.find(d => d.key === day)?.index || 0,
      is_active: false,
      time_blocks: []
    };
  };

  const handleDayToggle = (day: string, isActive: boolean) => {
    const currentSchedule = getDaySchedule(day);
    onScheduleChange(day, {
      ...currentSchedule,
      is_active: isActive,
      time_blocks: isActive ? currentSchedule.time_blocks : []
    });
  };

  const handleTimeChange = (day: string, blockIndex: number, field: string, time: any) => {
    if (time) {
      const timeString = time.toFormat('HH:mm');
      onTimeBlockChange(day, blockIndex, field, timeString);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ScheduleIcon color="primary" />
        <Typography variant="h6">
          Horario de Atención
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configura tu horario de atención para cada día de la semana. Puedes agregar múltiples bloques de tiempo por día.
      </Typography>
      
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <Grid container spacing={2}>
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const daySchedule = getDaySchedule(key);
            
            return (
              <Grid item xs={12} key={key}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={daySchedule.is_active}
                            onChange={(e) => handleDayToggle(key, e.target.checked)}
                          />
                        }
                        label={
                          <Typography variant="h6">
                            {label}
                          </Typography>
                        }
                      />
                      
                      {daySchedule.is_active && (
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => onAddTimeBlock(key)}
                        >
                          Agregar Horario
                        </Button>
                      )}
                    </Box>
                    
                    {daySchedule.is_active ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {daySchedule.time_blocks.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No hay horarios configurados para este día
                          </Typography>
                        ) : (
                          daySchedule.time_blocks.map((block, blockIndex) => (
                            <Box key={blockIndex} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <TimeIcon color="action" />
                              
                              <TimePicker
                                label="Inicio"
                                value={block.start_time ? new Date(`2000-01-01T${block.start_time}`) : null}
                                onChange={(time) => handleTimeChange(key, blockIndex, 'start_time', time)}
                                slotProps={{
                                  textField: {
                                    size: 'small',
                                    sx: { minWidth: 120 }
                                  }
                                }}
                              />
                              
                              <Typography variant="body2" color="text.secondary">
                                hasta
                              </Typography>
                              
                              <TimePicker
                                label="Fin"
                                value={block.end_time ? new Date(`2000-01-01T${block.end_time}`) : null}
                                onChange={(time) => handleTimeChange(key, blockIndex, 'end_time', time)}
                                slotProps={{
                                  textField: {
                                    size: 'small',
                                    sx: { minWidth: 120 }
                                  }
                                }}
                              />
                              
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onRemoveTimeBlock(key, blockIndex)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        Día no laboral
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </LocalizationProvider>
      
      {/* Schedule Summary */}
      {Object.values(scheduleData).some(day => day?.is_active) && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            Resumen del Horario
          </Typography>
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const daySchedule = getDaySchedule(key);
            if (!daySchedule.is_active) return null;
            
            return (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label={label} size="small" color="primary" />
                <Typography variant="body2" color="text.secondary">
                  {daySchedule.time_blocks.length === 0
                    ? 'Sin horarios configurados'
                    : daySchedule.time_blocks.map(block => 
                        `${block.start_time} - ${block.end_time}`
                      ).join(', ')
                  }
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
