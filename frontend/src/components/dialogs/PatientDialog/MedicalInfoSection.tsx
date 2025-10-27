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
