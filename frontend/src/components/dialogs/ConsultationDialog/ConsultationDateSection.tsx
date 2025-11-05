import React from 'react';
import {
  Box,
  Typography
} from '@mui/material';
import {
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface ConsultationDateSectionProps {
  date: string | null;
  onChange: (newValue: Date | null) => void;
}

export const ConsultationDateSection: React.FC<ConsultationDateSectionProps> = ({
  date,
  onChange
}) => {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarIcon sx={{ fontSize: 20 }} />
        Fecha de Consulta
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <DatePicker
          label="Fecha"
          value={date ? new Date(date) : null}
          maxDate={new Date()}
          onChange={onChange}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true
            }
          }}
        />
      </LocalizationProvider>
    </Box>
  );
};

