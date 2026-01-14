import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton
} from '@mui/material';
import {
  AccessTime,
  Add as AddIcon,
  Cancel
} from '@mui/icons-material';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
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

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', index: 0 },
  { key: 'tuesday', label: 'Martes', index: 1 },
  { key: 'wednesday', label: 'Miércoles', index: 2 },
  { key: 'thursday', label: 'Jueves', index: 3 },
  { key: 'friday', label: 'Viernes', index: 4 },
  { key: 'saturday', label: 'Sábado', index: 5 },
  { key: 'sunday', label: 'Domingo', index: 6 }
];

interface ScheduleStepProps {
  scheduleData: WeeklyScheduleData;
  onUpdateDaySchedule: (dayIndex: number, isActive: boolean) => void;
  onAddTimeBlock: (dayIndex: number) => void;
  onRemoveTimeBlock: (dayIndex: number, blockIndex: number) => void;
  onUpdateTimeBlock: (dayIndex: number, blockIndex: number, field: 'start_time' | 'end_time', value: string) => void;
  formatTime: (timeString?: string) => Date | null;
  formatTimeToString: (date: Date | null) => string;
}

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  scheduleData,
  onUpdateDaySchedule,
  onAddTimeBlock,
  onRemoveTimeBlock,
  onUpdateTimeBlock,
  formatTime,
  formatTimeToString
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Horarios de Atención
      </Typography>
      
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
        {DAYS_OF_WEEK.map(day => {
          const dayKey = day.key as keyof WeeklyScheduleData;
          const schedule = scheduleData[dayKey];
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
                          icon={<AccessTime />}
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
                        {timeBlocks.map((block, index) => (
                          <Chip
                            key={index}
                            label={`${block.start_time} - ${block.end_time}`}
                            variant="outlined"
                            size="small"
                            sx={{ backgroundColor: 'white' }}
                          />
                        ))}
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
                        onClick={() => onUpdateDaySchedule(day.index, true)}
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
                          onClick={() => onAddTimeBlock(day.index)}
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
                          onClick={() => onUpdateDaySchedule(day.index, false)}
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
                              onClick={() => onRemoveTimeBlock(day.index, blockIndex)}
                              disabled={timeBlocks.length === 1}
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'error.50'
                                }
                              }}
                            >
                              <Cancel />
                            </IconButton>
                          </Box>
                          
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                            <Box>
                              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                                <TimePicker
                                  label="Hora de inicio"
                                  value={formatTime(block.start_time)}
                                  onChange={(newValue) => {
                                    if (newValue) {
                                      onUpdateTimeBlock(day.index, blockIndex, 'start_time', formatTimeToString(newValue));
                                    }
                                  }}
                                  closeOnSelect={true}
                                  openTo="hours"
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true
                                    },
                                    actionBar: {
                                      actions: []
                                    }
                                  }}
                                />
                              </LocalizationProvider>
                            </Box>
                            <Box>
                              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                                <TimePicker
                                  label="Hora de fin"
                                  value={formatTime(block.end_time)}
                                  onChange={(newValue) => {
                                    if (newValue) {
                                      onUpdateTimeBlock(day.index, blockIndex, 'end_time', formatTimeToString(newValue));
                                    }
                                  }}
                                  closeOnSelect={true}
                                  openTo="hours"
                                  slotProps={{
                                    textField: {
                                      size: "small",
                                      fullWidth: true
                                    },
                                    actionBar: {
                                      actions: []
                                    }
                                  }}
                                />
                              </LocalizationProvider>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {timeBlocks.length > 0 && (
                      <Alert severity="success" icon={<AccessTime />} sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Resumen para {day.label}:</strong><br />
                          Los pacientes podrán agendar citas de {timeBlocks.map((block, index) => (
                            <span key={index}>
                              {block.start_time} a {block.end_time}
                              {index < timeBlocks.length - 1 ? ', ' : ''}
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
        })}
      </Box>
    </Box>
  );
};
