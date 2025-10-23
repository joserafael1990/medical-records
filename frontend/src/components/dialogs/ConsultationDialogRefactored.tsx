import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Save as SaveIcon
} from '@mui/icons-material';

import { useConsultationDialog } from '../../hooks/useConsultationDialog';
import { VitalSignsSection } from './ConsultationDialog/VitalSignsSection';
import { ClinicalStudiesSection } from './ConsultationDialog/ClinicalStudiesSection';
import { PrescriptionsSection } from './ConsultationDialog/PrescriptionsSection';

interface ConsultationDialogRefactoredProps {
  open: boolean;
  onClose: () => void;
  consultation?: any;
  onSuccess?: () => void;
}

export const ConsultationDialogRefactored: React.FC<ConsultationDialogRefactoredProps> = ({
  open,
  onClose,
  consultation,
  onSuccess
}) => {
  const {
    formData,
    isLoading,
    isSubmitting,
    errors,
    handleInputChange,
    handleVitalSignsChange,
    handleAddStudy,
    handleRemoveStudy,
    handleAddPrescription,
    handleRemovePrescription,
    handleSubmit,
    handleReset,
    patients,
    appointments,
    studies
  } = useConsultationDialog(consultation, onSuccess);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSave = async () => {
    await handleSubmit(onSuccess);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Cargando datos...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {consultation ? 'Editar Consulta' : 'Nueva Consulta'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Patient and Appointment Selection */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <PersonIcon color="primary" />
            <Typography variant="h6">Información del Paciente</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth error={!!errors.patient_id}>
              <InputLabel>Paciente</InputLabel>
              <Select
                value={formData.patient_id}
                onChange={(e) => handleInputChange('patient_id', e.target.value)}
                label="Paciente"
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.paternal_surname} {patient.maternal_surname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Cita</InputLabel>
              <Select
                value={formData.appointment_id || ''}
                onChange={(e) => handleInputChange('appointment_id', e.target.value)}
                label="Cita"
              >
                <MenuItem value="">Sin cita específica</MenuItem>
                {appointments.map((appointment) => (
                  <MenuItem key={appointment.id} value={appointment.id}>
                    {new Date(appointment.date_time).toLocaleString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Chief Complaint */}
          <TextField
            label="Motivo de Consulta *"
            multiline
            rows={3}
            value={formData.chief_complaint}
            onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
            error={!!errors.chief_complaint}
            helperText={errors.chief_complaint}
            fullWidth
          />

          {/* Medical History */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Antecedentes Familiares"
              multiline
              rows={3}
              value={formData.family_history}
              onChange={(e) => handleInputChange('family_history', e.target.value)}
              fullWidth
            />
            <TextField
              label="Antecedentes Personales Patológicos"
              multiline
              rows={3}
              value={formData.personal_pathological_history}
              onChange={(e) => handleInputChange('personal_pathological_history', e.target.value)}
              fullWidth
            />
          </Box>

          <TextField
            label="Antecedentes Personales No Patológicos"
            multiline
            rows={3}
            value={formData.personal_non_pathological_history}
            onChange={(e) => handleInputChange('personal_non_pathological_history', e.target.value)}
            fullWidth
          />

          {/* Physical Examination */}
          <TextField
            label="Examen Físico *"
            multiline
            rows={4}
            value={formData.physical_examination}
            onChange={(e) => handleInputChange('physical_examination', e.target.value)}
            error={!!errors.physical_examination}
            helperText={errors.physical_examination}
            fullWidth
          />

          {/* Vital Signs */}
          <VitalSignsSection
            vitalSigns={formData.vital_signs}
            onVitalSignsChange={handleVitalSignsChange}
            errors={errors}
          />

          {/* Clinical Studies */}
          <ClinicalStudiesSection
            studies={formData.clinical_studies}
            availableStudies={studies}
            onAddStudy={handleAddStudy}
            onRemoveStudy={handleRemoveStudy}
            errors={errors}
          />

          {/* Prescriptions */}
          <PrescriptionsSection
            prescriptions={formData.prescriptions}
            availableMedications={[]} // TODO: Implement medications hook
            onAddPrescription={handleAddPrescription}
            onRemovePrescription={handleRemovePrescription}
            errors={errors}
          />

          {/* Diagnosis */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Diagnóstico Principal *"
              multiline
              rows={2}
              value={formData.primary_diagnosis}
              onChange={(e) => handleInputChange('primary_diagnosis', e.target.value)}
              error={!!errors.primary_diagnosis}
              helperText={errors.primary_diagnosis}
              fullWidth
            />
            <TextField
              label="Diagnóstico Secundario"
              multiline
              rows={2}
              value={formData.secondary_diagnosis}
              onChange={(e) => handleInputChange('secondary_diagnosis', e.target.value)}
              fullWidth
            />
          </Box>

          {/* Treatment Plan */}
          <TextField
            label="Plan de Tratamiento *"
            multiline
            rows={4}
            value={formData.treatment_plan}
            onChange={(e) => handleInputChange('treatment_plan', e.target.value)}
            error={!!errors.treatment_plan}
            helperText={errors.treatment_plan}
            fullWidth
          />

          {/* Follow-up Instructions */}
          <TextField
            label="Instrucciones de Seguimiento"
            multiline
            rows={3}
            value={formData.follow_up_instructions}
            onChange={(e) => handleInputChange('follow_up_instructions', e.target.value)}
            fullWidth
          />

          {/* Additional Notes */}
          <TextField
            label="Notas Adicionales"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Consulta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
