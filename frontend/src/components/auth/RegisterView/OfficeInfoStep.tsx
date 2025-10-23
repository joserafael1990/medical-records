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
import {
  Business as BusinessIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface OfficeInfoStepProps {
  formData: {
    office_address: string;
    office_country: string;
    office_state_id: string;
    office_city: string;
    office_phone: string;
    appointment_duration: string;
  };
  onInputChange: (field: string, value: string) => void;
  countries: any[];
  states: any[];
  selectedOfficeCountry: string;
  onCountryChange: (country: string) => void;
  fieldErrors: Record<string, string>;
}

const APPOINTMENT_DURATIONS = [
  { value: '15', label: '15 minutos' },
  { value: '20', label: '20 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1.5 horas' },
  { value: '120', label: '2 horas' }
];

export const OfficeInfoStep: React.FC<OfficeInfoStepProps> = ({
  formData,
  onInputChange,
  countries,
  states,
  selectedOfficeCountry,
  onCountryChange,
  fieldErrors
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <BusinessIcon color="primary" />
        <Typography variant="h6">
          Información del Consultorio
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {/* Office Address */}
        <Grid item xs={12}>
          <TextField
            label="Dirección del Consultorio"
            value={formData.office_address}
            onChange={(e) => onInputChange('office_address', e.target.value)}
            error={!!fieldErrors.office_address}
            helperText={fieldErrors.office_address}
            fullWidth
            required
            multiline
            rows={2}
            placeholder="Calle, número, colonia, delegación/municipio"
          />
        </Grid>
        
        {/* Country */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!fieldErrors.office_country}>
            <InputLabel>País</InputLabel>
            <Select
              value={selectedOfficeCountry}
              onChange={(e) => onCountryChange(e.target.value)}
              label="País"
            >
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.name}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.office_country && (
              <Typography variant="caption" color="error">
                {fieldErrors.office_country}
              </Typography>
            )}
          </FormControl>
        </Grid>
        
        {/* State */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!fieldErrors.office_state_id}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={formData.office_state_id}
              onChange={(e) => onInputChange('office_state_id', e.target.value)}
              label="Estado"
              disabled={!selectedOfficeCountry || states.length === 0}
            >
              {states.map((state) => (
                <MenuItem key={state.id} value={state.id}>
                  {state.name}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.office_state_id && (
              <Typography variant="caption" color="error">
                {fieldErrors.office_state_id}
              </Typography>
            )}
          </FormControl>
        </Grid>
        
        {/* City */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Ciudad"
            value={formData.office_city}
            onChange={(e) => onInputChange('office_city', e.target.value)}
            error={!!fieldErrors.office_city}
            helperText={fieldErrors.office_city}
            fullWidth
            required
          />
        </Grid>
        
        {/* Office Phone */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono del Consultorio"
            type="tel"
            value={formData.office_phone}
            onChange={(e) => onInputChange('office_phone', e.target.value)}
            error={!!fieldErrors.office_phone}
            helperText={fieldErrors.office_phone}
            fullWidth
            required
            placeholder="+52 55 1234 5678"
          />
        </Grid>
        
        {/* Appointment Duration */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!fieldErrors.appointment_duration}>
            <InputLabel>Duración de Citas</InputLabel>
            <Select
              value={formData.appointment_duration}
              onChange={(e) => onInputChange('appointment_duration', e.target.value)}
              label="Duración de Citas"
            >
              {APPOINTMENT_DURATIONS.map((duration) => (
                <MenuItem key={duration.value} value={duration.value}>
                  {duration.label}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.appointment_duration && (
              <Typography variant="caption" color="error">
                {fieldErrors.appointment_duration}
              </Typography>
            )}
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Office Summary */}
      {formData.office_address && formData.office_city && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocationIcon color="primary" />
            <Typography variant="body2" fontWeight="medium">
              Resumen del Consultorio
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {formData.office_address}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formData.office_city}, {selectedOfficeCountry}
          </Typography>
          {formData.office_phone && (
            <Typography variant="body2" color="text.secondary">
              Tel: {formData.office_phone}
            </Typography>
          )}
          {formData.appointment_duration && (
            <Typography variant="body2" color="text.secondary">
              Duración de citas: {APPOINTMENT_DURATIONS.find(d => d.value === formData.appointment_duration)?.label}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
