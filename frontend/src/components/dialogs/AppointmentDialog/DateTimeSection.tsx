import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import {
  Event as EventIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface DateTimeSectionProps {
  selectedDate: string;
  selectedTime: string;
  availableTimes: Array<{ time: string; duration_minutes: number }>;
  loadingTimes: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  hasDateError: boolean;
  dateErrorMessage: string;
  validationError: string;
  isReadOnly: boolean;
  formatTimeToAMPM: (time: string) => string;
}

export const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  selectedDate,
  selectedTime,
  availableTimes,
  loadingTimes,
  onDateChange,
  onTimeChange,
  hasDateError,
  dateErrorMessage,
  validationError,
  isReadOnly,
  formatTimeToAMPM
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {/* Date Selection */}
      <Box sx={{ flex: 1, minWidth: 250 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon sx={{ fontSize: 20 }} />
          Fecha - obligatorio
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Seleccionar fecha - obligatorio"
            value={selectedDate ? new Date(selectedDate) : null}
            minDate={new Date()}
            onChange={(newValue) => {
              if (newValue) {
                const isoDate = newValue.toISOString().split('T')[0] + 'T00:00';
                onDateChange(isoDate);
              } else {
                onDateChange('');
              }
            }}
            disabled={isReadOnly}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                error: hasDateError,
                helperText: hasDateError ? dateErrorMessage : 'Selecciona una fecha para ver horarios disponibles'
              }
            }}
          />
        </LocalizationProvider>
      </Box>

      {/* Time Selection */}
      <Box sx={{ flex: 1, minWidth: 250 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ fontSize: 20 }} />
          Hora Disponible - obligatorio
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
          {loadingTimes && <CircularProgress size={16} />}
        </Typography>
        <FormControl 
          fullWidth 
          size="small" 
          error={hasDateError || (validationError && (!selectedTime || selectedTime.trim() === ''))}
          required
        >
          <InputLabel>Seleccionar horario - obligatorio</InputLabel>
          <Select
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            label="Seleccionar horario - obligatorio"
            disabled={!selectedDate || loadingTimes || isReadOnly}
          >
            {/* Show available times */}
            {availableTimes.map((timeSlot) => (
              <MenuItem key={timeSlot.time} value={timeSlot.time}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography>{formatTimeToAMPM(timeSlot.time)}</Typography>
                  <Chip 
                    label={`${timeSlot.duration_minutes} min`} 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                  />
                </Box>
              </MenuItem>
            ))}
            
            {/* Show original appointment time if it's not in available times */}
            {selectedTime && !availableTimes.find(slot => slot.time === selectedTime) && (
              <MenuItem key={selectedTime} value={selectedTime}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography>{formatTimeToAMPM(selectedTime)}</Typography>
                  <Chip 
                    label="Cita existente" 
                    size="small" 
                    variant="outlined" 
                    color="warning"
                  />
                </Box>
              </MenuItem>
            )}
          </Select>
          {!loadingTimes && selectedDate && availableTimes.length === 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              No hay horarios disponibles para esta fecha
            </Alert>
          )}
          {!selectedDate && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Selecciona primero una fecha
            </Alert>
          )}
          {validationError && (!selectedTime || selectedTime.trim() === '') && selectedDate && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {availableTimes.length > 0 
                ? 'Debe seleccionar un horario disponible' 
                : 'No hay horarios disponibles para esta fecha'
              }
            </Typography>
          )}
        </FormControl>
      </Box>
    </Box>
  );
};

