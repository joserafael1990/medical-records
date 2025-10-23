import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface PersonalInfoStepProps {
  formData: {
    first_name: string;
    paternal_surname: string;
    maternal_surname: string;
    curp: string;
    gender: string;
    birth_date: string;
    phone: string;
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
            inputProps={{ maxLength: 18 }}
          />
        </Grid>
        
        {/* Gender */}
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
                  error: !!fieldErrors.birth_date,
                  helperText: fieldErrors.birth_date
                }
              }}
            />
          </LocalizationProvider>
        </Grid>
        
        {/* Phone */}
        <Grid item xs={12}>
          <TextField
            label="Teléfono"
            type="tel"
            value={formData.phone}
            onChange={(e) => onInputChange('phone', e.target.value)}
            error={!!fieldErrors.phone}
            helperText={fieldErrors.phone}
            fullWidth
            required
            placeholder="+52 55 1234 5678"
          />
        </Grid>
      </Grid>
    </Box>
  );
};
