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
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface LocationInfoSectionProps {
  formData: {
    address_country_id: string;
    address_state_id: string;
    birth_city: string;
    birth_state_id: string;
    birth_country_id: string;
  };
  onInputChange: (field: string, value: any) => void;
  countries: Array<{id: number, name: string}>;
  states: Array<{id: number, name: string}>;
  birthStates: Array<{id: number, name: string}>;
  errors: Record<string, string>;
}

export const LocationInfoSection: React.FC<LocationInfoSectionProps> = ({
  formData,
  onInputChange,
  countries,
  states,
  birthStates,
  errors
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Información de Ubicación
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {/* Address Country */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.address_country_id}>
            <InputLabel>País de Residencia</InputLabel>
            <Select
              value={formData.address_country_id}
              onChange={(e) => onInputChange('address_country_id', e.target.value)}
              label="País de Residencia"
            >
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.id.toString()}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
            {errors.address_country_id && <FormHelperText>{errors.address_country_id}</FormHelperText>}
          </FormControl>
        </Grid>
        
        {/* Address State */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.address_state_id}>
            <InputLabel>Estado de Residencia</InputLabel>
            <Select
              value={formData.address_state_id}
              onChange={(e) => onInputChange('address_state_id', e.target.value)}
              label="Estado de Residencia"
              disabled={!formData.address_country_id || states.length === 0}
            >
              {states.map((state) => (
                <MenuItem key={state.id} value={state.id.toString()}>
                  {state.name}
                </MenuItem>
              ))}
            </Select>
            {errors.address_state_id && <FormHelperText>{errors.address_state_id}</FormHelperText>}
          </FormControl>
        </Grid>
        
        {/* Birth City */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Ciudad de Nacimiento"
            value={formData.birth_city}
            onChange={(e) => onInputChange('birth_city', e.target.value)}
            error={!!errors.birth_city}
            helperText={errors.birth_city}
            fullWidth
          />
        </Grid>
        
        {/* Birth Country */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.birth_country_id}>
            <InputLabel>País de Nacimiento</InputLabel>
            <Select
              value={formData.birth_country_id}
              onChange={(e) => onInputChange('birth_country_id', e.target.value)}
              label="País de Nacimiento"
            >
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.id.toString()}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
            {errors.birth_country_id && <FormHelperText>{errors.birth_country_id}</FormHelperText>}
          </FormControl>
        </Grid>
        
        {/* Birth State */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.birth_state_id}>
            <InputLabel>Estado de Nacimiento</InputLabel>
            <Select
              value={formData.birth_state_id}
              onChange={(e) => onInputChange('birth_state_id', e.target.value)}
              label="Estado de Nacimiento"
              disabled={!formData.birth_country_id || birthStates.length === 0}
            >
              {birthStates.map((state) => (
                <MenuItem key={state.id} value={state.id.toString()}>
                  {state.name}
                </MenuItem>
              ))}
            </Select>
            {errors.birth_state_id && <FormHelperText>{errors.birth_state_id}</FormHelperText>}
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};
