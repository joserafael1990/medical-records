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
import { DocumentSelector } from '../../common/DocumentSelector';

interface ProfessionalInfoStepProps {
  title: string;
  specialty: string;
  university: string;
  graduationYear: string;
  professionalDocument: { document_id: number | null; document_value: string };
  specialties: Array<{ id: number; name: string }>;
  onTitleChange: (value: string) => void;
  onSpecialtyChange: (value: string) => void;
  onUniversityChange: (value: string) => void;
  onGraduationYearChange: (value: string) => void;
  onProfessionalDocumentChange: (doc: { document_id: number | null; document_value: string }) => void;
  hasAttemptedContinue: boolean;
}

export const ProfessionalInfoStep: React.FC<ProfessionalInfoStepProps> = ({
  title,
  specialty,
  university,
  graduationYear,
  professionalDocument,
  specialties,
  onTitleChange,
  onSpecialtyChange,
  onUniversityChange,
  onGraduationYearChange,
  onProfessionalDocumentChange,
  hasAttemptedContinue
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Información Profesional
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: '120px', flex: '0 0 auto' }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Título</InputLabel>
            <Select
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              label="Título"
              required
            >
              <MenuItem value="Dr.">Dr.</MenuItem>
              <MenuItem value="Dra.">Dra.</MenuItem>
              <MenuItem value="Lic.">Lic.</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: '1 1 300px' }}>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Especialidad</InputLabel>
            <Select
              value={specialty}
              onChange={(e) => onSpecialtyChange(e.target.value)}
              label="Especialidad"
              required
              disabled={!specialties || specialties.length === 0}
            >
              {Array.isArray(specialties) && specialties.length > 0 ? (
                specialties.map((spec) => (
                  <MenuItem key={spec.id} value={spec.id.toString()}>
                    {spec.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No hay especialidades disponibles</MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px' }}>
          <TextField
            fullWidth
            margin="normal"
            label="Universidad"
            value={university}
            onChange={(e) => onUniversityChange(e.target.value)}
            required
          />
        </Box>
        <Box sx={{ flex: '1 1 250px' }}>
          <TextField
            fullWidth
            margin="normal"
            label="Año de Graduación"
            value={graduationYear}
            onChange={(e) => {
              // Solo permitir números
              const value = e.target.value.replace(/[^0-9]/g, '');
              onGraduationYearChange(value);
            }}
            placeholder="2020"
            helperText={`Solo números - Año entre 1950 y ${new Date().getFullYear()}`}
            inputProps={{ maxLength: 4 }}
            required
          />
        </Box>
      </Box>

      {/* Documento Profesional */}
      <Box sx={{ mb: 2 }}>
        <DocumentSelector
          documentType="professional"
          value={professionalDocument}
          onChange={onProfessionalDocumentChange}
          required
          error={hasAttemptedContinue && (!professionalDocument?.document_id || !professionalDocument?.document_value)}
          helperText={hasAttemptedContinue ? "Seleccione un documento profesional e ingrese su valor" : undefined}
        />
      </Box>
    </Box>
  );
};
