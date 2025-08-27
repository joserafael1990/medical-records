import React, { memo, useState, useEffect } from 'react';
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
  Typography,
  Grid,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Autocomplete,
  Alert,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Assignment as AssignmentIcon,
  Healing as HealingIcon,
  Medication as MedicationIcon,
  Science as ScienceIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { Patient, ConsultationFormData, ClinicalStudy } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import ClinicalStudiesSection from '../common/ClinicalStudiesSection';

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
  fieldErrors?: { [key: string]: string };
  onCreateNewPatient?: () => void; // Callback para crear nuevo paciente
  clinicalStudies?: ClinicalStudy[]; // Estudios clínicos
  onAddClinicalStudy?: () => void;
  onEditClinicalStudy?: (study: ClinicalStudy) => void;
  onDeleteClinicalStudy?: (studyId: string) => void;
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
  isSubmitting,
  fieldErrors = {},
  onCreateNewPatient,
  clinicalStudies = [],
  onAddClinicalStudy,
  onEditClinicalStudy,
  onDeleteClinicalStudy
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const steps = [
    {
      label: 'Información del Paciente',
      icon: <PersonIcon />,
      description: 'Selecciona el paciente y fecha de consulta'
    },
    {
      label: 'Evaluación Clínica',
      icon: <AssignmentIcon />,
      description: 'Motivo de consulta y exploración física'
    },
    {
      label: 'Diagnóstico',
      icon: <HealingIcon />,
      description: 'Diagnósticos principal y secundarios'
    },
    {
      label: 'Tratamiento',
      icon: <MedicationIcon />,
      description: 'Plan de tratamiento y seguimiento'
    },
    {
      label: 'Estudios Clínicos',
      icon: <ScienceIcon />,
      description: 'Órdenes de estudios, laboratorio, radiología y resultados'
    }
  ];

  useEffect(() => {
    if (formData.patient_id) {
      const patient = patients.find(p => p.id === formData.patient_id);
      setSelectedPatient(patient || null);
    }
  }, [formData.patient_id, patients]);

  const handleClose = () => {
    onClose();
    setFormErrorMessage('');
    setActiveStep(0);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handlePatientChange = (patient: Patient | null) => {
    if (patient) {
      setFormData(prev => ({ ...prev, patient_id: patient.id }));
      setSelectedPatient(patient);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return formData.patient_id && formData.date;
      case 1:
        return formData.chief_complaint && formData.history_present_illness && formData.physical_examination && 
               formData.family_history && formData.personal_pathological_history && formData.personal_non_pathological_history;
      case 2:
        return formData.primary_diagnosis;
      case 3:
        return formData.treatment_plan && formData.follow_up_instructions;
      default:
        return false;
    }
  };

  const canProceed = isStepValid(activeStep);
  
  // Para el último step, verificar que todos los steps obligatorios estén completos
  const canSubmit = activeStep === steps.length - 1 
    ? isStepValid(0) && isStepValid(1) && isStepValid(2) && isStepValid(3)
    : canProceed;

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Patient Selection */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(option) => option.full_name}
                  value={selectedPatient}
                  onChange={(_, newValue) => handlePatientChange(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Paciente"
                      required
                      error={!!fieldErrors.patient_id}
                      helperText={fieldErrors.patient_id}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {option.first_name[0]}{option.paternal_surname[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{option.full_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.phone} • {option.email}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Box>
              {onCreateNewPatient && (
                <Button
                  variant="outlined"
                  onClick={onCreateNewPatient}
                  startIcon={<PersonAddIcon />}
                  sx={{ 
                    mt: 0.5,
                    minWidth: 'fit-content',
                    px: 2
                  }}
                >
                  Nuevo
                </Button>
              )}
            </Box>

            {/* Selected Patient Info */}
            {selectedPatient && (
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    {selectedPatient.first_name[0]}{selectedPatient.paternal_surname[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedPatient.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPatient.phone} • {selectedPatient.email}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* Date and Time */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Fecha de Consulta"
                  type="date"
                  value={formData.date && formData.date.includes('T') ? formData.date.split('T')[0] : ''}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    const timeValue = formData.date && formData.date.includes('T') ? formData.date.split('T')[1] : '09:00';
                    setFormData(prev => ({ 
                      ...prev, 
                      date: `${dateValue}T${timeValue}` 
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  error={!!fieldErrors?.date}
                  helperText={fieldErrors?.date}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Hora"
                  type="time"
                  value={formData.date && formData.date.includes('T') ? formData.date.split('T')[1]?.substring(0, 5) : '09:00'}
                  onChange={(e) => {
                    const timeValue = e.target.value;
                    const dateValue = formData.date && formData.date.includes('T') ? formData.date.split('T')[0] : new Date().toISOString().split('T')[0];
                    setFormData(prev => ({ 
                      ...prev, 
                      date: `${dateValue}T${timeValue}` 
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />
              </Box>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Motivo de Consulta"
              multiline
              rows={3}
              value={formData.chief_complaint || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
              fullWidth
              required
              placeholder="¿Por qué viene el paciente a consulta?"
              error={!!fieldErrors.chief_complaint}
              helperText={fieldErrors.chief_complaint || "Describe el motivo principal de la consulta"}
            />

            <TextField
              label="Historia de la Enfermedad Actual"
              multiline
              rows={4}
              value={formData.history_present_illness || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, history_present_illness: e.target.value }))}
              fullWidth
              required
              placeholder="Evolución y características de la enfermedad actual..."
              error={!!fieldErrors.history_present_illness}
              helperText={fieldErrors.history_present_illness || "Describe cronológicamente la evolución de los síntomas"}
            />

            <TextField
              label="Exploración Física"
              multiline
              rows={4}
              value={formData.physical_examination || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, physical_examination: e.target.value }))}
              fullWidth
              required
              placeholder="Hallazgos de la exploración física..."
              error={!!fieldErrors.physical_examination}
              helperText={fieldErrors.physical_examination || "Incluye signos vitales, inspección, palpación, percusión y auscultación"}
            />

            <Divider sx={{ my: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Antecedentes Médicos
              </Typography>
            </Divider>

            <TextField
              label="Antecedentes Heredofamiliares"
              multiline
              rows={3}
              value={formData.family_history || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, family_history: e.target.value }))}
              fullWidth
              required
              placeholder="Enfermedades familiares relevantes (diabetes, hipertensión, cáncer, etc.)..."
              error={!!fieldErrors.family_history}
              helperText={fieldErrors.family_history || "Ej: Diabetes tipo 2 (abuelo paterno), hipertensión arterial (madre), cáncer de mama (tía materna)"}
            />

            <TextField
              label="Antecedentes Personales Patológicos"
              multiline
              rows={3}
              value={formData.personal_pathological_history || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, personal_pathological_history: e.target.value }))}
              fullWidth
              required
              placeholder="Enfermedades previas, cirugías, hospitalizaciones, uso de sustancias..."
              error={!!fieldErrors.personal_pathological_history}
              helperText={fieldErrors.personal_pathological_history || "Ej: Apendicectomía (2018), fractura de radio (2020), fumador 10 cigarrillos/día, 2 copas vino/semana"}
            />

            <TextField
              label="Antecedentes Personales No Patológicos"
              multiline
              rows={3}
              value={formData.personal_non_pathological_history || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, personal_non_pathological_history: e.target.value }))}
              fullWidth
              required
              placeholder="Hábitos: alimentación, ejercicio, sueño, trabajo, vivienda..."
              error={!!fieldErrors.personal_non_pathological_history}
              helperText={fieldErrors.personal_non_pathological_history || "Ej: Dieta balanceada, ejercicio 3x/semana, duerme 7hrs, trabaja oficina, vive casa propia, agua potable"}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HealingIcon color="primary" />
              Diagnóstico Principal
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: 2 }}>
                <TextField
                  label="Diagnóstico Principal"
                  value={formData.primary_diagnosis || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
                  fullWidth
                  required
                  placeholder="Diagnóstico principal"
                  error={!!fieldErrors.primary_diagnosis}
                  helperText={fieldErrors.primary_diagnosis}
                />
              </Box>

            </Box>

            <Divider />

            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HealingIcon color="secondary" />
              Diagnósticos Secundarios (Opcional)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box sx={{ flex: 2 }}>
                <TextField
                  label="Diagnósticos Secundarios"
                  value={formData.secondary_diagnoses || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_diagnoses: e.target.value }))}
                  fullWidth
                  placeholder="Diagnósticos secundarios"
                  helperText="Condiciones adicionales o comorbilidades"
                />
              </Box>

            </Box>

            <TextField
              label="Pronóstico"
              multiline
              rows={2}
              value={formData.prognosis || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, prognosis: e.target.value }))}
              fullWidth
              placeholder="Pronóstico esperado del paciente..."
              helperText="Evolución esperada de la condición"
            />
          </Box>
        );

      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Plan de Tratamiento"
              multiline
              rows={4}
              value={formData.treatment_plan || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
              fullWidth
              required
              placeholder="Medicamentos, dosis, frecuencia, duración..."
              error={!!fieldErrors.treatment_plan}
              helperText={fieldErrors.treatment_plan || "Incluye medicamentos, terapias, recomendaciones"}
            />

            <TextField
              label="Instrucciones de Seguimiento"
              multiline
              rows={3}
              value={formData.follow_up_instructions || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
              fullWidth
              required
              placeholder="Cuándo regresar, qué vigilar, recomendaciones..."
              error={!!fieldErrors.follow_up_instructions}
              helperText={fieldErrors.follow_up_instructions || "Próxima cita, signos de alarma, cuidados"}
            />

            <Divider />

            <Typography variant="h6">Información Adicional (Opcional)</Typography>

            <TextField
              label="Resultados de Laboratorio"
              multiline
              rows={2}
              value={formData.laboratory_results || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, laboratory_results: e.target.value }))}
              fullWidth
              placeholder="Resultados de estudios de laboratorio..."
            />

            <TextField
              label="Estudios de Imagen"
              multiline
              rows={2}
              value={formData.imaging_studies || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, imaging_studies: e.target.value }))}
              fullWidth
              placeholder="Resultados de estudios de imagen..."
            />

            <TextField
              label="Interconsultas"
              value={formData.interconsultations || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, interconsultations: e.target.value }))}
              fullWidth
              placeholder="Interconsultas solicitadas..."
            />
          </Box>
        );

      case 4:
        return (
          <Box sx={{ p: 0 }}>
            {onAddClinicalStudy && onEditClinicalStudy && onDeleteClinicalStudy ? (
              <ClinicalStudiesSection
                consultationId={formData.patient_id} // Temporal - usar consultation id cuando esté disponible
                patientId={formData.patient_id}
                studies={clinicalStudies}
                onAddStudy={onAddClinicalStudy}
                onEditStudy={onEditClinicalStudy}
                onDeleteStudy={onDeleteClinicalStudy}
                onViewFile={(fileUrl) => window.open(fileUrl, '_blank')}
                onDownloadFile={(fileUrl, fileName) => {
                  const link = document.createElement('a');
                  link.href = fileUrl;
                  link.download = fileName;
                  link.click();
                }}
              />
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Funcionalidad de estudios clínicos no disponible
                </Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isEditing ? 'Editar Consulta' : 'Nueva Consulta Médica'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {steps[activeStep].description}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Error Message */}
        <Collapse in={!!formErrorMessage}>
          <Alert severity="error" sx={{ m: 3, mb: 0 }}>
            {formErrorMessage}
          </Alert>
        </Collapse>

        <Box sx={{ display: 'flex', minHeight: '500px' }}>
          {/* Stepper Sidebar */}
          <Box sx={{ 
            width: 280, 
            bgcolor: 'grey.50', 
            borderRight: '1px solid', 
            borderColor: 'divider',
            p: 3
          }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          bgcolor: index <= activeStep ? 'primary.main' : 'grey.300',
                          color: 'white',
                          width: 32,
                          height: 32
                        }}
                      >
                        {index < activeStep ? <SaveIcon fontSize="small" /> : step.icon}
                      </Avatar>
                    )}
                  >
                    <Typography variant="body2" sx={{ fontWeight: index === activeStep ? 600 : 400 }}>
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Content Area */}
          <Box sx={{ flex: 1, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              {steps[activeStep].icon}
              {steps[activeStep].label}
            </Typography>
            
            {renderStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        justifyContent: 'space-between'
      }}>
        <Button 
          onClick={handleClose}
          disabled={isSubmitting}
          variant="outlined"
          sx={{ borderRadius: '8px' }}
        >
          Cancelar
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<BackIcon />}
            variant="outlined"
            sx={{ borderRadius: '8px' }}
          >
            Anterior
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button 
              onClick={onSubmit}
              disabled={isSubmitting || !canSubmit}
              variant="contained"
              startIcon={<SaveIcon />}
              sx={{ borderRadius: '8px', minWidth: 120 }}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              variant="contained"
              endIcon={<NextIcon />}
              sx={{ borderRadius: '8px' }}
            >
              Siguiente
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ConsultationDialog);