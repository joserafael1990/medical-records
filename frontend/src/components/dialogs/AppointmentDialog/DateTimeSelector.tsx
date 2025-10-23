import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface DateTimeSelectorProps {
  selectedDate: string;
  selectedTime: string;
  availableTimes: any[];
  loadingTimes: boolean;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  formatTimeToAMPM: (timeString: string) => string;
  errors: Record<string, string>;
  appointmentTypes: string[];
  appointmentType: string;
  onAppointmentTypeChange: (type: string) => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  selectedDate,
  selectedTime,
  availableTimes,
  loadingTimes,
  onDateChange,
  onTimeChange,
  formatTimeToAMPM,
  errors,
  appointmentTypes,
  appointmentType,
  onAppointmentTypeChange
}) => {
  const handleDateChange = (date: any) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      onDateChange(dateString);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Fecha y Hora
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Appointment Type */}
        <FormControl fullWidth error={!!errors.appointment_type}>
          <InputLabel>Tipo de Consulta</InputLabel>
          <Select
            value={appointmentType}
            onChange={(e) => onAppointmentTypeChange(e.target.value)}
            label="Tipo de Consulta"
          >
            {appointmentTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Date Picker */}
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Fecha de la cita"
            value={selectedDate ? new Date(selectedDate) : null}
            onChange={handleDateChange}
            minDate={new Date()}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.date_time,
                helperText: errors.date_time
              }
            }}
          />
        </LocalizationProvider>
        
        {/* Time Selector */}
        <FormControl fullWidth error={!!errors.time}>
          <InputLabel>Hora Disponible</InputLabel>
          <Select
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            label="Hora Disponible"
            disabled={!selectedDate || loadingTimes}
          >
            {loadingTimes ? (
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  Cargando horarios...
                </Box>
              </MenuItem>
            ) : availableTimes.length === 0 ? (
              <MenuItem disabled>
                No hay horarios disponibles para esta fecha
              </MenuItem>
            ) : (
              availableTimes.map((timeSlot) => (
                <MenuItem key={timeSlot.time} value={timeSlot.time}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon fontSize="small" />
                    {formatTimeToAMPM(timeSlot.time)}
                    {timeSlot.is_available === false && (
                      <Chip label="Ocupado" size="small" color="error" />
                    )}
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        
        {/* Selected Time Display */}
        {selectedTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
            <EventIcon color="primary" />
            <Typography variant="body2" color="primary.main">
              Cita programada para: {selectedDate} a las {formatTimeToAMPM(selectedTime)}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};
