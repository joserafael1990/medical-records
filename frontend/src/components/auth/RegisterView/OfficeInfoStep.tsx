import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  InputAdornment
} from '@mui/material';
import { PhoneNumberInput } from '../../common/PhoneNumberInput';

interface Country {
  id: number;
  name: string;
}

interface State {
  id: number;
  name: string;
}

interface OfficeInfoStepProps {
  officeName: string;
  officeAddress: string;
  officeCountry: string;
  officeStateId: string;
  officeCity: string;
  officePhoneCountryCode: string;
  officePhoneNumber: string;
  officeMapsUrl: string;
  appointmentDuration: string;
  selectedOfficeCountry: string;
  countries: Country[];
  filteredOfficeStates: State[];
  onOfficeNameChange: (value: string) => void;
  onOfficeAddressChange: (value: string) => void;
  onOfficeCountryChange: (value: string) => void;
  onOfficeStateIdChange: (value: string) => void;
  onOfficeCityChange: (value: string) => void;
  onOfficePhoneCountryCodeChange: (value: string) => void;
  onOfficePhoneNumberChange: (value: string) => void;
  onOfficeMapsUrlChange: (value: string) => void;
  onAppointmentDurationChange: (value: string) => void;
  onSelectedOfficeCountryChange: (value: string) => void;
}

export const OfficeInfoStep: React.FC<OfficeInfoStepProps> = ({
  officeName,
  officeAddress,
  officeCountry,
  officeStateId,
  officeCity,
  officePhoneCountryCode,
  officePhoneNumber,
  officeMapsUrl,
  appointmentDuration,
  selectedOfficeCountry,
  countries,
  filteredOfficeStates,
  onOfficeNameChange,
  onOfficeAddressChange,
  onOfficeCountryChange,
  onOfficeStateIdChange,
  onOfficeCityChange,
  onOfficePhoneCountryCodeChange,
  onOfficePhoneNumberChange,
  onOfficeMapsUrlChange,
  onAppointmentDurationChange,
  onSelectedOfficeCountryChange
}) => {
  const handleOfficeCountryChange = (countryName: string) => {
    onSelectedOfficeCountryChange(countryName);
    onOfficeCountryChange(countryName);
    onOfficeStateIdChange(''); // Reset state when country changes
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Datos del Consultorio
      </Typography>
      
      {/* 1. Dirección */}
      <TextField
        fullWidth
        margin="normal"
        label="Nombre del Consultorio"
        value={officeName}
        onChange={(e) => onOfficeNameChange(e.target.value)}
        placeholder="Consultorio Médico Dr. García"
        helperText="Nombre que aparecerá en las citas"
        required
      />

      <TextField
        fullWidth
        margin="normal"
        label="Dirección"
        multiline
        rows={2}
        value={officeAddress}
        onChange={(e) => onOfficeAddressChange(e.target.value)}
        placeholder="Av. Reforma 123, Col. Centro"
        helperText="Calle, número, colonia"
        required
      />

      {/* 2. País y Estado */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px' }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>País</InputLabel>
            <Select
              value={selectedOfficeCountry}
              onChange={(e) => handleOfficeCountryChange(e.target.value)}
              label="País"
            >
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.name}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Estado</InputLabel>
            <Select
              value={officeStateId}
              onChange={(e) => onOfficeStateIdChange(e.target.value)}
              label="Estado"
              disabled={!selectedOfficeCountry || filteredOfficeStates.length === 0}
            >
              {filteredOfficeStates.map((state) => (
                <MenuItem key={state.id} value={String(state.id)}>
                  {state.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {!selectedOfficeCountry 
                ? "Primero selecciona un país" 
                : filteredOfficeStates.length === 0 
                ? "No hay estados disponibles"
                : "Estado/Provincia"
              }
            </FormHelperText>
          </FormControl>
        </Box>
      </Box>

      {/* 3. Ciudad y Duración de Consulta */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px' }}>
          <TextField
            fullWidth
            margin="normal"
            label="Ciudad"
            value={officeCity}
            onChange={(e) => onOfficeCityChange(e.target.value)}
            placeholder="Ciudad de México"
            helperText="Ciudad del consultorio"
            required
          />
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <TextField
            fullWidth
            margin="normal"
            label="Duración de Consulta"
            value={appointmentDuration}
            onChange={(e) => {
              // Solo permitir números
              const value = e.target.value.replace(/[^0-9]/g, '');
              onAppointmentDurationChange(value);
            }}
            placeholder="30"
            helperText="Tiempo en minutos (ej: 30)"
            inputProps={{ maxLength: 3 }}
            required
            InputProps={{
              endAdornment: <InputAdornment position="end">min</InputAdornment>
            }}
          />
        </Box>
      </Box>

      {/* 4. Teléfono del Consultorio */}
      <Box sx={{ mt: 2, mb: 1 }}>
        <PhoneNumberInput
          countryCode={officePhoneCountryCode}
          phoneNumber={officePhoneNumber}
          onCountryCodeChange={onOfficePhoneCountryCodeChange}
          onPhoneNumberChange={(number) => {
            // Solo permitir números
            const value = number.replace(/\D/g, '');
            onOfficePhoneNumberChange(value);
          }}
          label="Número telefónico del Consultorio *"
          required
          placeholder="Ej: 222 123 4567"
          fullWidth
        />
      </Box>

      {/* 5. URL de Google Maps */}
      <TextField
        fullWidth
        margin="normal"
        label="URL de Google Maps"
        value={officeMapsUrl}
        onChange={(e) => onOfficeMapsUrlChange(e.target.value)}
        placeholder="https://maps.google.com/..."
        helperText="Enlace de Google Maps para ubicar el consultorio (opcional)"
      />
    </Box>
  );
};
