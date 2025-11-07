import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { DocumentSelector } from '../../common/DocumentSelector';
import { PhoneNumberInput } from '../../common/PhoneNumberInput';

interface PersonalInfoStepProps {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  personalDocument: { document_id: number | null; document_value: string };
  gender: string;
  birthDate: string;
  phoneCountryCode: string;
  phoneNumber: string;
  onFirstNameChange: (value: string) => void;
  onPaternalSurnameChange: (value: string) => void;
  onMaternalSurnameChange: (value: string) => void;
  onPersonalDocumentChange: (doc: { document_id: number | null; document_value: string }) => void;
  onGenderChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onPhoneCountryCodeChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  hasAttemptedContinue: boolean;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  firstName,
  paternalSurname,
  maternalSurname,
  personalDocument,
  gender,
  birthDate,
  phoneCountryCode,
  phoneNumber,
  onFirstNameChange,
  onPaternalSurnameChange,
  onMaternalSurnameChange,
  onPersonalDocumentChange,
  onGenderChange,
  onBirthDateChange,
  onPhoneCountryCodeChange,
  onPhoneNumberChange,
  hasAttemptedContinue
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Información Personal
      </Typography>
      
      <TextField
        fullWidth
        margin="normal"
        label="Nombre(s)"
        value={firstName}
        onChange={(e) => onFirstNameChange(e.target.value)}
        required
      />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px' }}>
          <TextField
            fullWidth
            margin="normal"
            label="Apellido Paterno"
            value={paternalSurname}
            onChange={(e) => onPaternalSurnameChange(e.target.value)}
            required
          />
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <TextField
            fullWidth
            margin="normal"
            label="Apellido Materno"
            value={maternalSurname}
            onChange={(e) => onMaternalSurnameChange(e.target.value)}
          />
        </Box>
      </Box>

      {/* Documento Personal */}
      <Box sx={{ mb: 2 }}>
        <DocumentSelector
          documentType="personal"
          value={personalDocument}
          onChange={onPersonalDocumentChange}
          required
          error={hasAttemptedContinue && (!personalDocument?.document_id || !personalDocument?.document_value)}
          helperText={hasAttemptedContinue ? "Seleccione un documento personal e ingrese su valor" : undefined}
        />
      </Box>

      {/* Género y Fecha de Nacimiento en la misma fila */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px' }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel required>Género</InputLabel>
            <Select
              value={gender}
              onChange={(e) => onGenderChange(e.target.value)}
              label="Género"
              required
            >
              <MenuItem value="M">Masculino</MenuItem>
              <MenuItem value="F">Femenino</MenuItem>
              <MenuItem value="O">Otro</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DatePicker
              label="Fecha de Nacimiento *"
              value={birthDate ? new Date(birthDate) : null}
              maxDate={new Date()}
              onChange={(newValue) => {
                if (newValue) {
                  const dateValue = newValue.toISOString().split('T')[0];
                  onBirthDateChange(dateValue);
                } else {
                  onBirthDateChange('');
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                  required: true
                }
              }}
            />
          </LocalizationProvider>
        </Box>
      </Box>

      {/* Código de país y Teléfono unificado */}
      <Box sx={{ mt: 2, mb: 1 }}>
        <PhoneNumberInput
          countryCode={phoneCountryCode}
          phoneNumber={phoneNumber}
          onCountryCodeChange={onPhoneCountryCodeChange}
          onPhoneNumberChange={(number) => {
            // Solo permitir números
            const value = number.replace(/\D/g, '');
            onPhoneNumberChange(value);
          }}
          label="Número telefónico *"
          required
          placeholder="Ej: 222 123 4567"
          fullWidth
        />
      </Box>
    </Box>
  );
};
