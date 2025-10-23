import React from 'react';
import {
  Box,
  TextField,
  Grid,
  Typography
} from '@mui/material';
import {
  LocalHospital as MedicalIcon
} from '@mui/icons-material';

interface MedicalInfoSectionProps {
  formData: {
    chronic_conditions: string;
    current_medications: string;
    medical_history: string;
    insurance_provider: string;
    insurance_number: string;
  };
  onInputChange: (field: string, value: any) => void;
  errors: Record<string, string>;
}

export const MedicalInfoSection: React.FC<MedicalInfoSectionProps> = ({
  formData,
  onInputChange,
  errors
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <MedicalIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Información Médica
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {/* Chronic Conditions */}
        <Grid item xs={12}>
          <TextField
            label="Condiciones Crónicas"
            value={formData.chronic_conditions}
            onChange={(e) => onInputChange('chronic_conditions', e.target.value)}
            error={!!errors.chronic_conditions}
            helperText={errors.chronic_conditions || 'Diabetes, hipertensión, etc.'}
            fullWidth
            multiline
            rows={2}
          />
        </Grid>
        
        {/* Current Medications */}
        <Grid item xs={12}>
          <TextField
            label="Medicamentos Actuales"
            value={formData.current_medications}
            onChange={(e) => onInputChange('current_medications', e.target.value)}
            error={!!errors.current_medications}
            helperText={errors.current_medications || 'Medicamentos que toma actualmente'}
            fullWidth
            multiline
            rows={2}
          />
        </Grid>
        
        {/* Medical History */}
        <Grid item xs={12}>
          <TextField
            label="Historial Médico"
            value={formData.medical_history}
            onChange={(e) => onInputChange('medical_history', e.target.value)}
            error={!!errors.medical_history}
            helperText={errors.medical_history || 'Cirugías, hospitalizaciones, etc.'}
            fullWidth
            multiline
            rows={3}
          />
        </Grid>
        
        {/* Insurance Provider */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Aseguradora"
            value={formData.insurance_provider}
            onChange={(e) => onInputChange('insurance_provider', e.target.value)}
            error={!!errors.insurance_provider}
            helperText={errors.insurance_provider}
            fullWidth
            placeholder="IMSS, ISSSTE, Seguro privado, etc."
          />
        </Grid>
        
        {/* Insurance Number */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Número de Seguro"
            value={formData.insurance_number}
            onChange={(e) => onInputChange('insurance_number', e.target.value)}
            error={!!errors.insurance_number}
            helperText={errors.insurance_number}
            fullWidth
            placeholder="Número de afiliación"
          />
        </Grid>
      </Grid>
    </Box>
  );
};
