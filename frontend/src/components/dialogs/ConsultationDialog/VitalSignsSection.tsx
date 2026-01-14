import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  MonitorHeart as MonitorHeartIcon,
  Thermostat as ThermostatIcon,
  Scale as ScaleIcon,
  Height as HeightIcon
} from '@mui/icons-material';

interface VitalSignsSectionProps {
  vitalSigns: {
    blood_pressure_systolic: number;
    blood_pressure_diastolic: number;
    heart_rate: number;
    temperature: number;
    weight: number;
    height: number;
    bmi: number;
  };
  onVitalSignsChange: (field: string, value: number) => void;
  errors: Record<string, string>;
}

export const VitalSignsSection: React.FC<VitalSignsSectionProps> = ({
  vitalSigns,
  onVitalSignsChange,
  errors
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MonitorHeartIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3">
            Signos Vitales
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Presión Sistólica"
              type="number"
              value={vitalSigns.blood_pressure_systolic || ''}
              onChange={(e) => onVitalSignsChange('blood_pressure_systolic', Number(e.target.value))}
              error={!!errors.blood_pressure_systolic}
              helperText={errors.blood_pressure_systolic}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Presión Diastólica"
              type="number"
              value={vitalSigns.blood_pressure_diastolic || ''}
              onChange={(e) => onVitalSignsChange('blood_pressure_diastolic', Number(e.target.value))}
              error={!!errors.blood_pressure_diastolic}
              helperText={errors.blood_pressure_diastolic}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Frecuencia Cardíaca"
              type="number"
              value={vitalSigns.heart_rate || ''}
              onChange={(e) => onVitalSignsChange('heart_rate', Number(e.target.value))}
              error={!!errors.heart_rate}
              helperText={errors.heart_rate}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Temperatura (°C)"
              type="number"
              value={vitalSigns.temperature || ''}
              onChange={(e) => onVitalSignsChange('temperature', Number(e.target.value))}
              error={!!errors.temperature}
              helperText={errors.temperature}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Estatura (cm)"
              type="number"
              value={vitalSigns.height || ''}
              onChange={(e) => onVitalSignsChange('height', Number(e.target.value))}
              error={!!errors.height}
              helperText={errors.height}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Peso (kg)"
              type="number"
              value={vitalSigns.weight || ''}
              onChange={(e) => onVitalSignsChange('weight', Number(e.target.value))}
              error={!!errors.weight}
              helperText={errors.weight}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="IMC"
              type="number"
              value={vitalSigns.bmi || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              size="small"
              helperText="Calculado automáticamente"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
