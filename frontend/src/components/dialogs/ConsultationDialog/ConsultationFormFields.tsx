import React from 'react';
import {
  Box,
  Typography,
  TextField
} from '@mui/material';
import {
  Notes as NotesIcon,
  MedicalServices as MedicalServicesIcon,
  LocalHospital as HospitalIcon,
  Favorite as HeartIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface ConsultationFormFieldsProps {
  formData: {
    chief_complaint: string;
    history_present_illness: string;
    family_history: string;
    perinatal_history: string;
    personal_pathological_history: string;
    personal_non_pathological_history: string;
    physical_examination: string;
    laboratory_results: string;
    treatment_plan: string;
    therapeutic_plan?: string;
    interconsultations?: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => void;
  shouldShowFirstTimeFields: () => boolean;
  error?: string | null;
}

export const ConsultationFormFields: React.FC<ConsultationFormFieldsProps> = ({
  formData,
  onChange,
  shouldShowFirstTimeFields,
  error
}) => {
  return (
    <>
      {/* Chief Complaint - Always shown */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotesIcon sx={{ fontSize: 20 }} />
          Motivo de Consulta
          <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
        </Typography>
        <TextField
          name="chief_complaint"
          label="Motivo de consulta"
          value={formData.chief_complaint}
          onChange={onChange}
          size="small"
          fullWidth
          multiline
          rows={2}
          required
          error={!!error && !formData.chief_complaint.trim()}
          helperText={error && !formData.chief_complaint.trim() ? 'Campo requerido' : ''}
        />
      </Box>

      {/* First-time consultation fields - shown conditionally */}
      {shouldShowFirstTimeFields() && (
        <>
          {/* History of Present Illness */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon sx={{ fontSize: 20 }} />
              Descripción de la Enfermedad Actual
            </Typography>
            <TextField
              name="history_present_illness"
              label="Descripción de la enfermedad actual"
              value={formData.history_present_illness}
              onChange={onChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Family History */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HeartIcon sx={{ fontSize: 20 }} />
              Antecedentes Familiares
            </Typography>
            <TextField
              name="family_history"
              label="Antecedentes familiares"
              value={formData.family_history}
              onChange={onChange}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Describa los antecedentes familiares relevantes del paciente..."
            />
          </Box>

          {/* Perinatal History */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HeartIcon sx={{ fontSize: 20 }} />
              Antecedentes Perinatales
            </Typography>
            <TextField
              name="perinatal_history"
              label="Antecedentes perinatales"
              value={formData.perinatal_history}
              onChange={onChange}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Describa los antecedentes perinatales relevantes del paciente..."
            />
          </Box>

          {/* Personal Pathological History */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HospitalIcon sx={{ fontSize: 20 }} />
              Antecedentes Patológicos
            </Typography>
            <TextField
              name="personal_pathological_history"
              label="Antecedentes patológicos"
              value={formData.personal_pathological_history}
              onChange={onChange}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Describa los antecedentes patológicos del paciente (enfermedades previas, cirugías, etc.)..."
            />
          </Box>

          {/* Personal Non-Pathological History */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Antecedentes No Patológicos
            </Typography>
            <TextField
              name="personal_non_pathological_history"
              label="Antecedentes no patológicos"
              value={formData.personal_non_pathological_history}
              onChange={onChange}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Describa los antecedentes no patológicos del paciente (hábitos, alimentación, ejercicio, etc.)..."
            />
          </Box>
        </>
      )}

      {/* Physical Examination */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon sx={{ fontSize: 20 }} />
          Exploración Física
        </Typography>
        <TextField
          name="physical_examination"
          label="Exploración física"
          value={formData.physical_examination}
          onChange={onChange}
          size="small"
          fullWidth
          multiline
          rows={3}
        />
      </Box>

      {/* Laboratory Results */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MedicalServicesIcon sx={{ fontSize: 20 }} />
          Resultados de Laboratorio
        </Typography>
        <TextField
          name="laboratory_results"
          label="Resultados de laboratorio"
          value={formData.laboratory_results || ''}
          onChange={onChange}
          size="small"
          fullWidth
          multiline
          rows={3}
          placeholder="Registre los resultados de análisis de laboratorio que el paciente trajo para la consulta..."
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Treatment Plan */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotesIcon sx={{ fontSize: 20 }} />
          Plan de Tratamiento
        </Typography>
        <TextField
          name="treatment_plan"
          label="Plan de tratamiento"
          value={formData.treatment_plan}
          onChange={onChange}
          size="small"
          fullWidth
          multiline
          rows={3}
        />
      </Box>
    </>
  );
};

