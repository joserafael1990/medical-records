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
  Collapse,
  CircularProgress
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
  Save as SaveIcon,
  Biotech as BiotechIcon,
  LocalHospital as HospitalIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Patient, ConsultationFormData, ClinicalStudy } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import ClinicalStudiesSection from '../common/ClinicalStudiesSection';
import { apiService } from '../../services/api';

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
};

// Function to format patient name with age
const formatPatientNameWithAge = (patient: Patient): string => {
  console.log('🧑 Formateando paciente:', patient);
  const age = calculateAge(patient.birth_date);
  console.log('📅 Edad calculada:', age, 'para fecha:', patient.birth_date);
  const formattedName = `${patient.first_name} ${patient.paternal_surname} ${patient.maternal_surname} (${age} años)`;
  console.log('✨ Nombre final:', formattedName);
  return formattedName;
};

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
  selectedConsultation?: any; // ID de la consulta actual
  tempConsultationId?: string | null; // ID temporal para consultas nuevas
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
  onDeleteClinicalStudy,
  selectedConsultation,
  tempConsultationId
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [patientClinicalStudies, setPatientClinicalStudies] = useState<ClinicalStudy[]>([]);
  const [loadingPatientStudies, setLoadingPatientStudies] = useState(false);

  // Load patient clinical studies when patient is selected
  useEffect(() => {
    const loadPatientStudies = async () => {
      if (selectedPatient?.id) {
        setLoadingPatientStudies(true);
        try {
          const studies = await apiService.getClinicalStudiesByPatient(selectedPatient.id);
          setPatientClinicalStudies(studies);
        } catch (error) {
          console.error('Error loading patient clinical studies:', error);
          // Set sample data for demonstration if API fails
          const sampleStudies: ClinicalStudy[] = [
            {
              id: 'STUDY-001',
              patient_id: selectedPatient.id,
              consultation_id: 'CONS-001',
              study_type: 'quimica_clinica',
              study_name: 'Perfil lipídico',
              study_description: 'Análisis de colesterol y triglicéridos',
              ordered_date: '2024-08-20',
              status: 'pending',
              ordering_doctor: 'Dr. Juan Pérez',
              institution: 'Laboratorio Central',
              urgency: 'normal',
              clinical_indication: 'Control de dislipidemia',
              created_by: 'system',
              created_at: '2024-08-20'
            },
            {
              id: 'STUDY-002',
              patient_id: selectedPatient.id,
              consultation_id: 'CONS-002',
              study_type: 'radiologia_simple',
              study_name: 'Radiografía de tórax',
              study_description: 'Proyecciones PA y lateral',
              ordered_date: '2024-08-15',
              status: 'completed',
              results_text: 'Campos pulmonares libres, silueta cardiaca normal',
              interpretation: 'Estudio normal',
              ordering_doctor: 'Dr. Juan Pérez',
              performing_doctor: 'Dr. María García',
              institution: 'Hospital General',
              urgency: 'normal',
              clinical_indication: 'Dolor torácico',
              created_by: 'system',
              created_at: '2024-08-15'
            }
          ];
          setPatientClinicalStudies(sampleStudies);
        } finally {
          setLoadingPatientStudies(false);
        }
      } else {
        setPatientClinicalStudies([]);
      }
    };

    loadPatientStudies();
  }, [selectedPatient?.id]);

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
    setVisitedSteps(new Set([0]));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => {
      const newStep = prevActiveStep + 1;
      setVisitedSteps(prev => new Set(prev).add(newStep));
      return newStep;
    });
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Función para navegación directa a cualquier paso
  const handleStepClick = (step: number) => {
    setActiveStep(step);
    setVisitedSteps(prev => new Set(prev).add(step));
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
                  getOptionLabel={(option) => formatPatientNameWithAge(option)}
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
                        <Typography variant="body1">{formatPatientNameWithAge(option)}</Typography>
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

            {/* Enhanced Selected Patient Info */}
            {selectedPatient && (
              <Paper sx={{ p: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200', borderRadius: '12px' }}>
                {/* Header with Patient Basic Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem' }}>
                    {selectedPatient.first_name[0]}{selectedPatient.paternal_surname[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {selectedPatient.full_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon sx={{ fontSize: 16 }} />
                        {selectedPatient.phone || 'No registrado'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ fontSize: 16 }} />
                        {selectedPatient.email || 'No registrado'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BadgeIcon sx={{ fontSize: 16 }} />
                        {selectedPatient.id}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Medical Information Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                  {/* Demographic Info */}
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 18 }} />
                      Información Demográfica
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Edad:</Typography> {selectedPatient.age ? `${selectedPatient.age} años` : 'No registrada'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Género:</Typography> {selectedPatient.gender || 'No especificado'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Fecha Nac:</Typography> {selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString('es-ES') : 'No registrada'}
                    </Typography>
                    <Typography variant="body2">
                      <Typography component="span" sx={{ fontWeight: 600 }}>CURP:</Typography> {selectedPatient.curp || 'No registrada'}
                    </Typography>
                  </Box>

                  {/* Medical Info */}
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HealingIcon sx={{ fontSize: 18 }} />
                      Información Médica
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Tipo de Sangre:</Typography> 
                      {selectedPatient.blood_type ? (
                        <Chip 
                          label={selectedPatient.blood_type} 
                          size="small" 
                          color="error" 
                          variant="filled" 
                          sx={{ ml: 1, fontWeight: 600 }}
                        />
                      ) : ' No registrado'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Alergias:</Typography> {selectedPatient.allergies || 'Ninguna registrada'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Cond. Crónicas:</Typography> {selectedPatient.chronic_conditions || 'Ninguna registrada'}
                    </Typography>
                    <Typography variant="body2">
                      <Typography component="span" sx={{ fontWeight: 600 }}>Medicamentos:</Typography> {selectedPatient.current_medications || 'Ninguno registrado'}
                    </Typography>
                  </Box>

                  {/* Contact & Emergency */}
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon sx={{ fontSize: 18 }} />
                      Contacto de Emergencia
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Nombre:</Typography> {selectedPatient.emergency_contact_name || 'No registrado'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Teléfono:</Typography> {selectedPatient.emergency_contact_phone || 'No registrado'}
                    </Typography>
                    <Typography variant="body2">
                      <Typography component="span" sx={{ fontWeight: 600 }}>Relación:</Typography> {selectedPatient.emergency_contact_relationship || 'No especificada'}
                    </Typography>
                  </Box>

                  {/* Insurance & Address */}
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HospitalIcon sx={{ fontSize: 18 }} />
                      Seguro y Ubicación
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Seguro:</Typography> {selectedPatient.insurance_type || 'No registrado'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>No. Seguro:</Typography> {selectedPatient.insurance_number || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Dirección:</Typography> {selectedPatient.address || 'No registrada'}
                    </Typography>
                    <Typography variant="body2">
                      <Typography component="span" sx={{ fontWeight: 600 }}>Estado Civil:</Typography> {selectedPatient.civil_status || 'No especificado'}
                    </Typography>
                  </Box>
                </Box>

                {/* Medical History Expandable */}
                {(selectedPatient.previous_hospitalizations || selectedPatient.surgical_history) && (
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px', border: '1px solid #e0e0e0', mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'secondary.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon sx={{ fontSize: 18 }} />
                      Historial Médico
                    </Typography>
                    {selectedPatient.previous_hospitalizations && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <Typography component="span" sx={{ fontWeight: 600 }}>Hospitalizaciones Previas:</Typography> {selectedPatient.previous_hospitalizations}
                      </Typography>
                    )}
                    {selectedPatient.surgical_history && (
                      <Typography variant="body2">
                        <Typography component="span" sx={{ fontWeight: 600 }}>Historial Quirúrgico:</Typography> {selectedPatient.surgical_history}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Quick Actions */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Chip 
                    label={`Estado: ${selectedPatient.status === 'active' ? 'Activo' : 'Inactivo'}`} 
                    size="small" 
                    color={selectedPatient.status === 'active' ? 'success' : 'default'} 
                    variant="filled"
                  />
                  {selectedPatient.age && (
                    <Chip 
                      label={selectedPatient.age < 18 ? 'Menor de Edad' : 'Adulto'} 
                      size="small" 
                      color={selectedPatient.age < 18 ? 'warning' : 'info'} 
                      variant="outlined"
                    />
                  )}
                  {selectedPatient.allergies && (
                    <Chip 
                      icon={<WarningIcon />}
                      label="Alergias" 
                      size="small" 
                      color="error" 
                      variant="outlined"
                    />
                  )}
                  {selectedPatient.chronic_conditions && (
                    <Chip 
                      icon={<InfoIcon />}
                      label="Cond. Crónicas" 
                      size="small" 
                      color="warning" 
                      variant="outlined"
                    />
                  )}
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

            {/* Patient Clinical Studies Section */}
            {selectedPatient && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: 'primary.main'
                }}>
                  <BiotechIcon sx={{ fontSize: 20, mr: 1 }} />
                  Estudios Clínicos Solicitados
                </Typography>
                
                {loadingPatientStudies ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ ml: 2 }}>
                      Cargando estudios clínicos...
                    </Typography>
                  </Box>
                ) : patientClinicalStudies.length > 0 ? (
                  <Paper sx={{ p: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {patientClinicalStudies.map((study, index) => (
                        <Box 
                          key={study.id} 
                          sx={{ 
                            p: 2, 
                            bgcolor: 'white', 
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            position: 'relative'
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {study.study_name}
                            </Typography>
                            <Chip 
                              label={study.status === 'pending' ? 'Pendiente' : study.status === 'completed' ? 'Completado' : study.status === 'in_progress' ? 'En Proceso' : study.status}
                              size="small"
                              color={
                                study.status === 'completed' ? 'success' : 
                                study.status === 'pending' ? 'warning' : 
                                study.status === 'in_progress' ? 'info' : 'default'
                              }
                              variant="filled"
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <Typography component="span" sx={{ fontWeight: 600 }}>Tipo:</Typography> {
                              study.study_type === 'hematologia' ? 'Hematología' :
                              study.study_type === 'quimica_clinica' ? 'Química Clínica' :
                              study.study_type === 'microbiologia' ? 'Microbiología' :
                              study.study_type === 'radiologia_simple' ? 'Radiología Simple' :
                              study.study_type === 'tomografia' ? 'Tomografía' :
                              study.study_type === 'resonancia' ? 'Resonancia Magnética' :
                              study.study_type === 'cardiology' ? 'Cardiología' :
                              study.study_type === 'endoscopy' ? 'Endoscopia' :
                              study.study_type === 'biopsy' ? 'Biopsia' :
                              study.study_type === 'cytology' ? 'Citología' :
                              study.study_type === 'microbiology' ? 'Microbiología' :
                              study.study_type === 'genetics' ? 'Genética' :
                              study.study_type === 'other' ? 'Otros' :
                              study.study_type
                            }
                          </Typography>
                          
                          {study.study_description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              <Typography component="span" sx={{ fontWeight: 600 }}>Descripción:</Typography> {study.study_description}
                            </Typography>
                          )}
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <Typography component="span" sx={{ fontWeight: 600 }}>Fecha Solicitado:</Typography> {new Date(study.ordered_date).toLocaleDateString('es-ES')}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <Typography component="span" sx={{ fontWeight: 600 }}>Doctor Solicitante:</Typography> {study.ordering_doctor}
                          </Typography>
                          
                          {study.clinical_indication && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              <Typography component="span" sx={{ fontWeight: 600 }}>Indicación Clínica:</Typography> {study.clinical_indication}
                            </Typography>
                          )}
                          
                          {study.institution && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              <Typography component="span" sx={{ fontWeight: 600 }}>Institución:</Typography> {study.institution}
                            </Typography>
                          )}
                          
                          {study.results_text && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: '8px', border: '1px solid', borderColor: 'success.200' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleIcon sx={{ fontSize: 16 }} />
                                Resultados:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {study.results_text}
                              </Typography>
                              {study.interpretation && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                  <Typography component="span" sx={{ fontWeight: 600 }}>Interpretación:</Typography> {study.interpretation}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay estudios clínicos registrados para este paciente
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
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
                consultationId={selectedConsultation?.id || tempConsultationId || 'new_consultation'}
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
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Secciones del Formulario
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Haz clic en cualquier sección para navegar directamente
              </Typography>
            </Box>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    onClick={() => handleStepClick(index)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderRadius: 1
                      },
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease'
                    }}
                    StepIconComponent={() => {
                      const isActive = index === activeStep;
                      const isCompleted = index < activeStep;
                      const isVisited = visitedSteps.has(index);
                      
                      return (
                        <Avatar
                          sx={{
                            bgcolor: isCompleted 
                              ? 'success.main' 
                              : isActive 
                                ? 'primary.main' 
                                : isVisited 
                                  ? 'info.main' 
                                  : 'grey.300',
                            color: 'white',
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: isActive ? '2px solid' : 'none',
                            borderColor: isActive ? 'primary.dark' : 'transparent',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              bgcolor: isCompleted 
                                ? 'success.dark' 
                                : isActive 
                                  ? 'primary.dark' 
                                  : isVisited 
                                    ? 'info.dark' 
                                    : 'grey.400'
                            }
                          }}
                        >
                          {isCompleted ? <SaveIcon fontSize="small" /> : step.icon}
                        </Avatar>
                      );
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: index === activeStep ? 600 : 400,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.main'
                        }
                      }}
                    >
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