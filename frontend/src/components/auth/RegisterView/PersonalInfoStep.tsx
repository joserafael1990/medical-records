import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  FormHelperText
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { CountryCodeSelector } from '../../common/CountryCodeSelector';

interface PersonalInfoStepProps {
  formData: {
    first_name: string;
    paternal_surname: string;
    maternal_surname: string;
    curp: string;
    gender: string;
    birth_date: string;
    phone_country_code: string;
    phone_number: string;
  };
  onInputChange: (field: string, value: string) => void;
  fieldErrors: Record<string, string>;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  formData,
  onInputChange,
  fieldErrors
}) => {
  const handleDateChange = (date: any) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      onInputChange('birth_date', dateString);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" gutterBottom>
        Información Personal
      </Typography>
      
      <Grid container spacing={2}>
        {/* First Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nombre"
            value={formData.first_name}
            onChange={(e) => onInputChange('first_name', e.target.value)}
            error={!!fieldErrors.first_name}
            helperText={fieldErrors.first_name}
            fullWidth
            required
          />
        </Grid>
        
        {/* Paternal Surname */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Paterno"
            value={formData.paternal_surname}
            onChange={(e) => onInputChange('paternal_surname', e.target.value)}
            error={!!fieldErrors.paternal_surname}
            helperText={fieldErrors.paternal_surname}
            fullWidth
            required
          />
        </Grid>
        
        {/* Maternal Surname */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Materno"
            value={formData.maternal_surname}
            onChange={(e) => onInputChange('maternal_surname', e.target.value)}
            error={!!fieldErrors.maternal_surname}
            helperText={fieldErrors.maternal_surname}
            fullWidth
          />
        </Grid>
        
        {/* CURP */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="CURP"
            value={formData.curp}
            onChange={(e) => onInputChange('curp', e.target.value.toUpperCase())}
            error={!!fieldErrors.curp}
            helperText={fieldErrors.curp || 'Clave Única de Registro de Población'}
            fullWidth
            required
          />
        </Grid>
        
        {/* Gender and Birth Date in same row */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!fieldErrors.gender}>
            <InputLabel>Género</InputLabel>
            <Select
              value={formData.gender}
              onChange={(e) => onInputChange('gender', e.target.value)}
              label="Género"
            >
              <MenuItem value="M">Masculino</MenuItem>
              <MenuItem value="F">Femenino</MenuItem>
              <MenuItem value="O">Otro</MenuItem>
            </Select>
            {fieldErrors.gender && (
              <FormHelperText>{fieldErrors.gender}</FormHelperText>
            )}
          </FormControl>
        </Grid>
        
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
                  error: !!fieldErrors.birth_date,
                  helperText: fieldErrors.birth_date
                }
              }}
            />
          </LocalizationProvider>
        </Grid>
        
        {/* Phone */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Box sx={{ flex: '0 0 200px', minWidth: 200 }}>
              <CountryCodeSelector
                value={formData.phone_country_code}
                onChange={(code) => onInputChange('phone_country_code', code)}
                label="Código de país *"
                error={!!fieldErrors.phone_country_code}
                helperText={fieldErrors.phone_country_code}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                size="small"
                label="Número telefónico *"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/\D/g, '');
                  onInputChange('phone_number', value);
                }}
                required
                placeholder="Ej: 5551234567"
                error={!!fieldErrors.phone_number}
                helperText={fieldErrors.phone_number}
                inputProps={{
                  autoComplete: 'tel',
                  'data-form-type': 'other'
                }}
                autoComplete="tel"
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
