import React, { useState } from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Button,
  Avatar,
  Chip,
  Paper,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Patient } from '../../../types';

interface PatientSelectorProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onPatientChange: (patient: Patient | null) => void;
  onNewPatient: () => void;
  onEditPatient?: (patient: Patient) => void;
  formatPatientNameWithAge: (patient: Patient) => string;
  errors: Record<string, string>;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  patients,
  selectedPatient,
  onPatientChange,
  onNewPatient,
  onEditPatient,
  formatPatientNameWithAge,
  errors
}) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Seleccionar Paciente
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Autocomplete
          options={patients || []}
          getOptionLabel={formatPatientNameWithAge}
          value={selectedPatient}
          onChange={(event, newValue) => onPatientChange(newValue)}
          onInputChange={(event, newInputValue) => setSearchValue(newInputValue)}
          inputValue={searchValue}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar paciente"
              placeholder="Escribe el nombre del paciente..."
              error={!!errors.patient_id}
              helperText={errors.patient_id}
              fullWidth
            />
          )}
          renderOption={(props, patient) => (
            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {patient.first_name.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {formatPatientNameWithAge(patient)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {patient.primary_phone} • {patient.email}
                </Typography>
              </Box>
            </Box>
          )}
          sx={{ flex: 1 }}
        />
        
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          onClick={onNewPatient}
          sx={{ minWidth: 'auto' }}
        >
          Nuevo
        </Button>
      </Box>
      
      {selectedPatient && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {selectedPatient.first_name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {formatPatientNameWithAge(selectedPatient)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedPatient.primary_phone} • {selectedPatient.email}
                </Typography>
              </Box>
            </Box>
            
            {onEditPatient && (
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => onEditPatient(selectedPatient)}
              >
                Editar
              </Button>
            )}
          </Box>
          
          {selectedPatient.medical_conditions && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Condiciones médicas: {selectedPatient.medical_conditions}
              </Typography>
            </Box>
          )}
          
          {selectedPatient.allergies && (
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={`Alergias: ${selectedPatient.allergies}`}
                size="small"
                color="warning"
                variant="outlined"
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
