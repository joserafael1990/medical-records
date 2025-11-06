import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { MedicalServices as MedicalServicesIcon } from '@mui/icons-material';

interface AppointmentTypeSectionProps {
  appointmentType: string;
  onAppointmentTypeChange: (value: string) => void;
  hasError: boolean;
  errorMessage: string;
  isReadOnly: boolean;
  show: boolean;
}

export const AppointmentTypeSection: React.FC<AppointmentTypeSectionProps> = ({
  appointmentType,
  onAppointmentTypeChange,
  hasError,
  errorMessage,
  isReadOnly,
  show
}) => {
  if (!show) return null;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MedicalServicesIcon sx={{ fontSize: 20 }} />
        Tipo de Consulta - obligatorio
        <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
      </Typography>
      <FormControl fullWidth size="small" error={hasError}>
        <Select
          value={appointmentType || ''}
          onChange={(e) => onAppointmentTypeChange(e.target.value)}
          disabled={isReadOnly}
          displayEmpty
        >
          <MenuItem value="" disabled>
            <em>Seleccione una opción</em>
          </MenuItem>
          <MenuItem value="primera vez">Primera vez</MenuItem>
          <MenuItem value="seguimiento">Seguimiento</MenuItem>
        </Select>
        {hasError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
            {errorMessage}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
};

