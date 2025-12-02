import React from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import {
  Person as PersonIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface PersonalInfoSectionProps {
  formData: {
    name: string;
    birth_date: string;
    gender: string;
    curp: string;
    rfc: string;
    civil_status: string;
  };
  onInputChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

const CIVIL_STATUS_OPTIONS = [
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Casado', label: 'Casado' },
  { value: 'Divorciado', label: 'Divorciado' },
  { value: 'Viudo', label: 'Viudo' },
  { value: 'Unión libre', label: 'Unión libre' }
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' }
];

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  formData,
  onInputChange,
  errors
}) => {
  const handleDateChange = (date: any) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      onInputChange('birth_date', dateString);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Información Personal
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {/* Full Name */}
        <Grid item xs={12}>
          <TextField
            label="Nombre Completo"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'Ingrese el nombre completo del paciente'}
            fullWidth
            required
          />
        </Grid>
        
        {/* Birth Date */}
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DatePicker
              label="Fecha de Nacimiento"
              value={formData.birth_date ? new Date(formData.birth_date) : null}
              onChange={handleDateChange}
              maxDate={new Date()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.birth_date,
                  helperText: errors.birth_date
                }
              }}
            />
          </LocalizationProvider>
        </Grid>
        
        {/* Gender */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.gender}>
            <InputLabel>Género</InputLabel>
            <Select
              value={formData.gender}
              onChange={(e) => onInputChange('gender', e.target.value)}
              label="Género"
            >
              {GENDER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
          </FormControl>
        </Grid>
        
        {/* Civil Status */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Estado Civil</InputLabel>
            <Select
              value={formData.civil_status}
              onChange={(e) => onInputChange('civil_status', e.target.value)}
              label="Estado Civil"
            >
              {CIVIL_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* CURP - Usado para búsquedas y visualización de pacientes */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="CURP"
            value={formData.curp}
            onChange={(e) => onInputChange('curp', e.target.value.toUpperCase())}
            error={!!errors.curp}
            helperText={errors.curp || 'Clave Única de Registro de Población'}
            fullWidth
            required
          />
        </Grid>
        
        {/* RFC - Usado para búsquedas y visualización de pacientes */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="RFC"
            value={formData.rfc}
            onChange={(e) => onInputChange('rfc', e.target.value.toUpperCase())}
            error={!!errors.rfc}
            helperText={errors.rfc || 'Registro Federal de Contribuyentes'}
            fullWidth
          />
        </Grid>
      </Grid>
    </Box>
  );
};
