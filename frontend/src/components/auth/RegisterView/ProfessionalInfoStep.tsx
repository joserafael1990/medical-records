import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Autocomplete
} from '@mui/material';
import {
  Work as WorkIcon,
  School as SchoolIcon
} from '@mui/icons-material';

interface ProfessionalInfoStepProps {
  formData: {
    title: string;
    specialty: string;
    university: string;
    graduation_year: string;
    professional_license: string;
  };
  onInputChange: (field: string, value: string) => void;
  specialties: any[];
  fieldErrors: Record<string, string>;
}

const TITLES = [
  'Dr.',
  'Dra.',
  'Lic.',
  'Licda.',
  'Ing.',
  'Inga.',
  'Mtro.',
  'Mtra.',
  'Prof.',
  'Profa.'
];

const UNIVERSITIES = [
  'UNAM - Universidad Nacional Autónoma de México',
  'IPN - Instituto Politécnico Nacional',
  'UAM - Universidad Autónoma Metropolitana',
  'UANL - Universidad Autónoma de Nuevo León',
  'UdeG - Universidad de Guadalajara',
  'UABC - Universidad Autónoma de Baja California',
  'UASLP - Universidad Autónoma de San Luis Potosí',
  'UACH - Universidad Autónoma de Chihuahua',
  'UAT - Universidad Autónoma de Tamaulipas',
  'UAZ - Universidad Autónoma de Zacatecas',
  'Otra'
];

export const ProfessionalInfoStep: React.FC<ProfessionalInfoStepProps> = ({
  formData,
  onInputChange,
  specialties,
  fieldErrors
}) => {
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <WorkIcon color="primary" />
        <Typography variant="h6">
          Información Profesional
        </Typography>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {/* Title */}
        <Box>
          <FormControl fullWidth error={!!fieldErrors.title}>
            <InputLabel>Título</InputLabel>
            <Select
              value={formData.title}
              onChange={(e) => onInputChange('title', e.target.value)}
              label="Título"
            >
              {TITLES.map((title) => (
                <MenuItem key={title} value={title}>
                  {title}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.title && (
              <Typography variant="caption" color="error">
                {fieldErrors.title}
              </Typography>
            )}
          </FormControl>
        </Box>
        
        {/* Specialty */}
        <Box>
          <Autocomplete
            options={specialties || []}
            getOptionLabel={(option) => option.name || option}
            value={specialties.find(s => s.name === formData.specialty) || null}
            onChange={(event, newValue) => {
              onInputChange('specialty', newValue?.name || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Especialidad"
                error={!!fieldErrors.specialty}
                helperText={fieldErrors.specialty}
                fullWidth
              />
            )}
          />
        </Box>
        
        {/* University */}
        <Box>
          <Autocomplete
            options={UNIVERSITIES}
            value={formData.university}
            onChange={(event, newValue) => {
              onInputChange('university', newValue || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Universidad"
                error={!!fieldErrors.university}
                helperText={fieldErrors.university}
                fullWidth
              />
            )}
          />
        </Box>
        
        {/* Graduation Year */}
        <Box>
          <FormControl fullWidth error={!!fieldErrors.graduation_year}>
            <InputLabel>Año de Graduación</InputLabel>
            <Select
              value={formData.graduation_year}
              onChange={(e) => onInputChange('graduation_year', e.target.value)}
              label="Año de Graduación"
            >
              {graduationYears.map((year) => (
                <MenuItem key={year} value={year.toString()}>
                  {year}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.graduation_year && (
              <Typography variant="caption" color="error">
                {fieldErrors.graduation_year}
              </Typography>
            )}
          </FormControl>
        </Box>
        
        {/* Professional License */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <TextField
            label="Cédula Profesional"
            value={formData.professional_license}
            onChange={(e) => onInputChange('professional_license', e.target.value)}
            error={!!fieldErrors.professional_license}
            helperText={fieldErrors.professional_license || 'Número de cédula profesional'}
            fullWidth
            required
            placeholder="Ej: 12345678"
          />
        </Box>
      </Box>
      
      {/* Professional Info Summary */}
      {formData.title && formData.specialty && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SchoolIcon color="primary" />
            <Typography variant="body2" fontWeight="medium">
              Resumen Profesional
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {formData.title} {formData.specialty}
          </Typography>
          {formData.university && (
            <Typography variant="caption" color="text.secondary">
              {formData.university} ({formData.graduation_year})
            </Typography>
          )}
          {formData.professional_license && (
            <Typography variant="caption" color="text.secondary" display="block">
              Cédula Profesional: {formData.professional_license}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
