import React, { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { Patient, ConsultationFormData } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: ConsultationFormData;
  setFormData: (data: ConsultationFormData | ((prev: ConsultationFormData) => ConsultationFormData)) => void;
  onSubmit: () => void;
  patients: Patient[];
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
}

const ConsultationDialog: React.FC<ConsultationDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  patients,
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting
}) => {
  const handleClose = () => {
    onClose();
    setFormErrorMessage('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? 'Editar Consulta' : 'Nueva Consulta'}
      </DialogTitle>

      {/* Error Message Ribbon */}
      {formErrorMessage && (
        <ErrorRibbon 
          message={formErrorMessage} 
          onClose={() => setFormErrorMessage('')} 
        />
      )}

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          
          {/* Patient Selection - Only for new consultations */}
          {!isEditing && (
            <FormControl fullWidth>
              <InputLabel>Paciente</InputLabel>
              <Select
                value={formData.patient_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
                label="Paciente"
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.paternal_surname} {patient.maternal_surname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* NOM-004 Required Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Información de la Consulta (NOM-004)
            </Typography>

            <TextField
              label="Motivo de la Consulta *"
              multiline
              rows={2}
              value={formData.chief_complaint}
              onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
              fullWidth
              helperText="Razón principal por la que el paciente acude a consulta"
            />

            <TextField
              label="Historia de la Enfermedad Actual *"
              multiline
              rows={3}
              value={formData.history_present_illness}
              onChange={(e) => setFormData(prev => ({ ...prev, history_present_illness: e.target.value }))}
              fullWidth
              helperText="Descripción detallada de los síntomas actuales"
            />

            <TextField
              label="Exploración Física *"
              multiline
              rows={3}
              value={formData.physical_examination}
              onChange={(e) => setFormData(prev => ({ ...prev, physical_examination: e.target.value }))}
              fullWidth
              helperText="Hallazgos del examen físico"
            />
          </Box>

          {/* Diagnosis Section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Diagnóstico
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Diagnóstico Principal *"
                value={formData.primary_diagnosis}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Código CIE-10"
                value={formData.primary_diagnosis_cie10}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_diagnosis_cie10: e.target.value }))}
                sx={{ flex: 1 }}
                helperText="Ej: G44.2"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Diagnósticos Secundarios"
                value={formData.secondary_diagnoses}
                onChange={(e) => setFormData(prev => ({ ...prev, secondary_diagnoses: e.target.value }))}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Códigos CIE-10 Secundarios"
                value={formData.secondary_diagnoses_cie10}
                onChange={(e) => setFormData(prev => ({ ...prev, secondary_diagnoses_cie10: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>

          {/* Treatment Section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Tratamiento y Seguimiento
            </Typography>

            <TextField
              label="Plan de Tratamiento *"
              multiline
              rows={3}
              value={formData.treatment_plan}
              onChange={(e) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
              fullWidth
              helperText="Medicamentos, procedimientos y recomendaciones"
            />

            <TextField
              label="Plan Terapéutico"
              multiline
              rows={2}
              value={formData.therapeutic_plan}
              onChange={(e) => setFormData(prev => ({ ...prev, therapeutic_plan: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Indicaciones de Seguimiento *"
              multiline
              rows={2}
              value={formData.follow_up_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
              fullWidth
              helperText="Cuándo regresar, signos de alarma, etc."
            />

            <TextField
              label="Pronóstico"
              value={formData.prognosis}
              onChange={(e) => setFormData(prev => ({ ...prev, prognosis: e.target.value }))}
              fullWidth
            />
          </Box>

          {/* Additional Studies */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Estudios Adicionales
            </Typography>

            <TextField
              label="Resultados de Laboratorio"
              multiline
              rows={2}
              value={formData.laboratory_results}
              onChange={(e) => setFormData(prev => ({ ...prev, laboratory_results: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Estudios de Imagen"
              multiline
              rows={2}
              value={formData.imaging_studies}
              onChange={(e) => setFormData(prev => ({ ...prev, imaging_studies: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Interconsultas"
              multiline
              rows={2}
              value={formData.interconsultations}
              onChange={(e) => setFormData(prev => ({ ...prev, interconsultations: e.target.value }))}
              fullWidth
              helperText="Especialistas consultados o por consultar"
            />
          </Box>

          {/* Doctor Information */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Información del Médico
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Nombre del Médico *"
                value={formData.doctor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, doctor_name: e.target.value }))}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Cédula Profesional *"
                value={formData.doctor_professional_license}
                onChange={(e) => setFormData(prev => ({ ...prev, doctor_professional_license: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              label="Especialidad *"
              value={formData.doctor_specialty}
              onChange={(e) => setFormData(prev => ({ ...prev, doctor_specialty: e.target.value }))}
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={isSubmitting}
        >
          {isEditing ? 'Actualizar Consulta' : 'Crear Consulta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ConsultationDialog);
