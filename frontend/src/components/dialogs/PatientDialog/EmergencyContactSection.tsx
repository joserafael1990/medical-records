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
  Emergency as EmergencyIcon
} from '@mui/icons-material';

interface EmergencyRelationship {
  code: string;
  name: string;
}

interface EmergencyContactSectionProps {
  formData: {
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: string;
  };
  onInputChange: (field: string, value: any) => void;
  emergencyRelationships: EmergencyRelationship[];
  errors: Record<string, string>;
}

export const EmergencyContactSection: React.FC<EmergencyContactSectionProps> = ({
  formData,
  onInputChange,
  emergencyRelationships,
  errors
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <EmergencyIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Contacto de Emergencia
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        {/* Emergency Contact Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nombre del Contacto"
            value={formData.emergency_contact_name}
            onChange={(e) => onInputChange('emergency_contact_name', e.target.value)}
            error={!!errors.emergency_contact_name}
            helperText={errors.emergency_contact_name}
            fullWidth
          />
        </Grid>
        
        {/* Emergency Contact Phone */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono del Contacto"
            type="tel"
            value={formData.emergency_contact_phone}
            onChange={(e) => onInputChange('emergency_contact_phone', e.target.value)}
            error={!!errors.emergency_contact_phone}
            helperText={errors.emergency_contact_phone}
            fullWidth
            placeholder="+52 55 1234 5678"
          />
        </Grid>
        
        {/* Emergency Contact Relationship */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.emergency_contact_relationship}>
            <InputLabel>Relación</InputLabel>
            <Select
              value={formData.emergency_contact_relationship}
              onChange={(e) => onInputChange('emergency_contact_relationship', e.target.value)}
              label="Relación"
            >
              {emergencyRelationships.map((relationship) => (
                <MenuItem key={relationship.code} value={relationship.code}>
                  {relationship.name}
                </MenuItem>
              ))}
            </Select>
            {errors.emergency_contact_relationship && <FormHelperText>{errors.emergency_contact_relationship}</FormHelperText>}
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};
