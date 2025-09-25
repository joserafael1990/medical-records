import React, { useState, useEffect, useCallback } from 'react';
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
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  AccessTime as ClockIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EventAvailable as ScheduledIcon,
  Event as EventIcon,
  Assignment as TaskIcon,
  Schedule as StatusIcon,
  Description as NotesIcon
} from '@mui/icons-material';

import { Patient, Consultation, Appointment, ConsultationFormData, ClinicalStudy } from '../../types';
import { getAppointmentDate, getCurrentCDMXDateTime } from '../../constants';
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
  const age = calculateAge(patient.birth_date);
  const fullName = [
    patient.first_name,
    patient.paternal_surname,
    patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
  ].filter(part => part && part.trim()).join(' ');
  return `${fullName} (${age} años)`;
};

// Function to format appointment for display
const formatAppointmentDisplay = (appointment: any, patients: Patient[]): string => {
  const patient = patients.find(p => p.id === appointment.patient_id);
  const patientName = patient ? formatPatientNameWithAge(patient) : 'Paciente desconocido';
  
  // Handle different date formats and properties
  let dateStr = 'Fecha inválida';
  let timeStr = 'Sin hora';
  
  // Try different date properties that might exist
  const dateValue = appointment.date || appointment.appointment_date || appointment.scheduled_date;
  
  if (dateValue) {
    try {
      const dateObj = new Date(dateValue);
      if (!isNaN(dateObj.getTime())) {
        dateStr = dateObj.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric'
        });
      }
    } catch (error) {
      console.warn('Error parsing date:', dateValue, error);
    }
  }
  
  // Try different time properties that might exist
  const timeValue = appointment.time || appointment.appointment_time || appointment.scheduled_time || appointment.hour;
  
  // Time value found and processing correctly
  
  if (timeValue) {
    try {
      // If it's a full datetime, extract time
      if (typeof timeValue === 'string' && (timeValue.includes('T') || timeValue.includes(' '))) {
        const timeObj = new Date(timeValue);
        if (!isNaN(timeObj.getTime())) {
          timeStr = timeObj.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
        }
      } else if (typeof timeValue === 'string') {
        // If it's just time string (e.g., "11:58", "14:30")
        timeStr = timeValue;
      } else if (typeof timeValue === 'object' && timeValue !== null) {
        // If it's a Date object
        const timeObj = new Date(timeValue);
        if (!isNaN(timeObj.getTime())) {
          timeStr = timeObj.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
        }
      }
    } catch (error) {
      console.warn('Error parsing time:', timeValue, error);
    }
  }
  
  // Also try to extract time from the date field if it contains both date and time
  if (timeStr === 'Sin hora' && dateValue) {
    try {
      const dateObj = new Date(dateValue);
      if (!isNaN(dateObj.getTime())) {
        // Check if the date contains time information (not just 00:00:00)
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        if (hours !== 0 || minutes !== 0) {
          timeStr = dateObj.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
        }
      }
    } catch (error) {
      console.warn('Error extracting time from date:', dateValue, error);
    }
  }
  
  return `${patientName} - ${dateStr} ${timeStr}`;
};

// Function to get available appointments (not completed or cancelled)
const getAvailableAppointments = (appointments: any[]): any[] => {
  return appointments.filter(apt => 
    apt.status !== 'completed' && 
    apt.status !== 'cancelled' &&
    apt.status !== 'no_show'
  );
};

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: ConsultationFormData;
  setFormData: (data: ConsultationFormData | ((prev: ConsultationFormData) => ConsultationFormData)) => void;
  onSubmit: () => void;
  patients: Patient[];
  appointments?: any[]; // Lista de citas disponibles
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  fieldErrors?: { [key: string]: string };
  onCreateNewPatient?: () => void; // Callback para crear nuevo paciente
  onEditPatient?: (patient: Patient) => void; // Callback para editar paciente
  clinicalStudies?: ClinicalStudy[]; // Estudios clínicos
  onAddClinicalStudy?: () => void;
  onEditClinicalStudy?: (study: ClinicalStudy) => void;
  onDeleteClinicalStudy?: (studyId: string) => void;
  selectedConsultation?: any; // ID de la consulta actual
  tempConsultationId?: string | null; // ID temporal para consultas nuevas
  onCreateAppointment?: (appointmentData: any) => Promise<void>; // Callback para crear citas
}

// Helper function to build full address from patient data
const getPatientFullAddress = (patient: Patient): string => {
  if (!patient) return 'No registrada';
  
  // Try to build address from specific fields first
  const addressParts = [];
  
  if (patient.address_street) {
    let streetAddress = patient.address_street;
    if (patient.address_ext_number) {
      streetAddress += ` #${patient.address_ext_number}`;
    }
    if (patient.address_int_number) {
      streetAddress += ` Int. ${patient.address_int_number}`;
    }
    addressParts.push(streetAddress);
  }
  
  if (patient.address_neighborhood) {
    addressParts.push(`Col. ${patient.address_neighborhood}`);
  }
  
  if (patient.address_city) {
    addressParts.push(patient.address_city);
  }
  
  if (patient.address_postal_code) {
    addressParts.push(`C.P. ${patient.address_postal_code}`);
  }

  // Add country after postal code
  if (patient.address_country_name) {
    addressParts.push(patient.address_country_name);
  } else if (patient.address_country || patient.country) {
    addressParts.push(patient.address_country || patient.country);
  } else {
    // Default to México if no country specified
    addressParts.push('México');
  }

  // If we have specific address parts, use them
  if (addressParts.length > 0) {
    return addressParts.join(', ');
  }
  
  // Fallback to legacy address field
  if (patient.address) {
    return patient.address;
  }
  
  // Try legacy fields as final fallback
  const legacyParts = [];
  if (patient.neighborhood) legacyParts.push(patient.neighborhood);
  if (patient.municipality) legacyParts.push(patient.municipality);
  if (patient.state) legacyParts.push(patient.state);
  if (patient.postal_code) legacyParts.push(`C.P. ${patient.postal_code}`);
  
  return legacyParts.length > 0 ? legacyParts.join(', ') : 'No registrada';
};

const ConsultationDialog: React.FC<ConsultationDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  patients,
  appointments = [],
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting,
  fieldErrors = {},
  onCreateNewPatient,
  onEditPatient,
  clinicalStudies = [],
  onAddClinicalStudy,
  onEditClinicalStudy,
  onDeleteClinicalStudy,
  selectedConsultation,
  tempConsultationId,
  onCreateAppointment
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  
  // Available appointments (exclude completed/cancelled)
  const availableAppointments = getAvailableAppointments(appointments);
  
  // Appointments data structure is now working correctly
  
  // Handle appointment selection
  const handleAppointmentChange = (appointment: any | null) => {
    setSelectedAppointment(appointment);
    
    if (appointment) {
      // When an appointment is selected, auto-select the patient
      const patient = patients.find(p => p.id === appointment.patient_id);
      if (patient) {
        setSelectedPatient(patient);
        
        // Handle date conversion safely
        let consultationDate = '';
        const dateValue = appointment.date || appointment.appointment_date || appointment.scheduled_date;
        
        // Processing selected appointment data
        
        if (dateValue) {
          try {
            const dateObj = new Date(dateValue);
            if (!isNaN(dateObj.getTime())) {
              consultationDate = dateObj.toISOString().split('T')[0];
            }
          } catch (error) {
            console.warn('Error converting appointment date:', dateValue, error);
          }
        }
        
        setFormData(prev => ({
          ...prev,
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          consultation_date: consultationDate
        }));
      }
    } else {
      // Clear appointment association
      setFormData(prev => ({
        ...prev,
        appointment_id: undefined
      }));
    }
  };
  
  // Debug log for dialog open state
  // Dialog state tracking removed to prevent infinite logs

  // Reset local states when opening dialog for new consultation
  useEffect(() => {
    if (open && !isEditing) {
      setSelectedPatient(null);
      setSelectedAppointment(null);
      setActiveStep(0);
      setVisitedSteps(new Set([0]));
      setPatientClinicalStudies([]);
      setShowScheduleFollowUp(false);
      setScheduledFollowUp(null);
      setFollowUpFormData({
        date: '',
        time: '',
        reason: ''
      });
    }
  }, [open, isEditing]);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [patientClinicalStudies, setPatientClinicalStudies] = useState<ClinicalStudy[]>([]);
  const [loadingPatientStudies, setLoadingPatientStudies] = useState(false);
  const [showScheduleFollowUp, setShowScheduleFollowUp] = useState(false);
  const [scheduledFollowUp, setScheduledFollowUp] = useState<any>(null);
  const [followUpFormData, setFollowUpFormData] = useState({
    date: '',
    time: '',
    reason: ''
  });

  // Load patient clinical studies when patient is selected
  useEffect(() => {
    const loadPatientStudies = async () => {
      if (selectedPatient?.id) {
        setLoadingPatientStudies(true);
        try {
          const studies = await apiService.getClinicalStudiesByPatient(selectedPatient.id);
          setPatientClinicalStudies(studies);
        } catch (error) {
          console.error('❌ Error loading patient clinical studies:', error);
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

  const handleNext = useCallback(() => {
    setActiveStep((prevActiveStep: number) => {
      const newStep = prevActiveStep + 1;
      setVisitedSteps((prev: Set<number>) => new Set(prev).add(newStep));
      return newStep;
    });
  }, []);

  const handleBack = useCallback(() => {
    setActiveStep((prevActiveStep: number) => prevActiveStep - 1);
  }, []);

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

  // Functions for follow-up appointment management
  const handleScheduleFollowUp = async () => {
    if (!selectedPatient || !followUpFormData.date || !followUpFormData.time || !followUpFormData.reason) {
      setFormErrorMessage('Por favor completa todos los campos para programar la cita');
      return;
    }

    try {
      // Combine date and time for the appointment
      const appointmentDateTime = `${followUpFormData.date}T${followUpFormData.time}`;
      
      // Create appointment data
      const appointmentData = {
        patient_id: selectedPatient.id,
        date_time: appointmentDateTime,
        reason: followUpFormData.reason,
        appointment_type: 'follow_up',
        status: 'scheduled',
        priority: 'normal',
        preparation_instructions: 'Traer resultados de estudios clínicos si están disponibles'
      };

      // If we have the callback to create appointment, use it to integrate with main system
      if (onCreateAppointment) {
        console.log('🔄 Creating appointment through main system...');
        await onCreateAppointment(appointmentData);
        
        // Create local display version for immediate feedback
        const localAppointment = {
          id: `APT-${Date.now()}`,
          ...appointmentData,
          created_at: new Date().toISOString(),
          patient_name: selectedPatient.full_name
        };
        
        if (scheduledFollowUp) {
          // Update existing appointment
          const updatedAppointment = {
            ...scheduledFollowUp,
            ...appointmentData,
            updated_at: new Date().toISOString()
          };
          setScheduledFollowUp(updatedAppointment);
        } else {
          // Create new appointment
          setScheduledFollowUp(localAppointment);
        }
        
        console.log('✅ Appointment created successfully and will appear in agenda');
      } else {
        // Fallback: create locally only (for backward compatibility)
        console.log('⚠️ No appointment callback provided, creating locally only');
        
        const simulatedAppointment = {
          id: `APT-${Date.now()}`,
          ...appointmentData,
          created_at: new Date().toISOString(),
          patient_name: selectedPatient.full_name
        };

        if (scheduledFollowUp) {
          // Update existing appointment
          const updatedAppointment = {
            ...scheduledFollowUp,
            ...appointmentData,
            updated_at: new Date().toISOString()
          };
          setScheduledFollowUp(updatedAppointment);
        } else {
          // Create new appointment
          setScheduledFollowUp(simulatedAppointment);
        }
      }
      
      setShowScheduleFollowUp(false);
      setFollowUpFormData({ date: '', time: '', reason: '' });
      
      // Show success message
      setFormErrorMessage('');
      
    } catch (error) {
      console.error('Error scheduling follow-up appointment:', error);
      setFormErrorMessage('Error al programar la cita de seguimiento');
    }
  };

  const handleEditFollowUp = () => {
    if (scheduledFollowUp) {
      // Parse the existing appointment data
      const dateTime = getAppointmentDate(scheduledFollowUp.date_time);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].substring(0, 5);
      
      setFollowUpFormData({
        date,
        time,
        reason: scheduledFollowUp.reason
      });
      
      // Open the edit form
      setShowScheduleFollowUp(true);
    }
  };

  const handleDeleteFollowUp = () => {
    setScheduledFollowUp(null);
    setFollowUpFormData({ date: '', time: '', reason: '' });
  };

  const handleFollowUpFormChange = useCallback((field: string, value: string) => {
    setFollowUpFormData((prev: { date: string; time: string; reason: string }) => ({
      ...prev,
      [field]: value
    }));
  }, []);

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
            {/* Appointment Selection (Optional) - ANTES de la selección de paciente */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                📅 Cita Asociada (Opcional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Si seleccionas una cita existente, el paciente y fecha se auto-completarán
              </Typography>
              <Autocomplete
                options={availableAppointments}
                getOptionLabel={(option: any) => formatAppointmentDisplay(option, patients)}
                value={selectedAppointment}
                onChange={(_, newValue: any | null) => handleAppointmentChange(newValue)}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    label="Seleccionar Cita (Opcional)"
                    helperText="Busca por nombre del paciente, fecha o estado de la cita"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <Box sx={{ mr: 1 }}>
                          📅
                        </Box>
                      ),
                    }}
                  />
                )}
                renderOption={(props: any, option: any) => {
                  const patient = patients.find(p => p.id === option.patient_id);
                  const patientName = patient ? formatPatientNameWithAge(patient) : 'Paciente desconocido';
                  
                  // Handle date formatting safely
                  let dateStr = 'Fecha inválida';
                  let timeStr = 'Sin hora';
                  
                  const dateValue = option.date || option.appointment_date || option.scheduled_date;
                  if (dateValue) {
                    try {
                      const dateObj = new Date(dateValue);
                      if (!isNaN(dateObj.getTime())) {
                        dateStr = dateObj.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });
                      }
                    } catch (error) {
                      console.warn('Error parsing date in option:', dateValue, error);
                    }
                  }
                  
                  const timeValue = option.time || option.appointment_time || option.scheduled_time || option.hour;
                  
                  // Processing time value for option display
                  
                  if (timeValue) {
                    try {
                      if (typeof timeValue === 'string' && (timeValue.includes('T') || timeValue.includes(' '))) {
                        const timeObj = new Date(timeValue);
                        if (!isNaN(timeObj.getTime())) {
                          timeStr = timeObj.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          });
                        }
                      } else if (typeof timeValue === 'string') {
                        timeStr = timeValue;
                      } else if (typeof timeValue === 'object' && timeValue !== null) {
                        const timeObj = new Date(timeValue);
                        if (!isNaN(timeObj.getTime())) {
                          timeStr = timeObj.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          });
                        }
                      }
                    } catch (error) {
                      console.warn('Error parsing time in option:', timeValue, error);
                    }
                  }
                  
                  // Also try to extract time from the date field if it contains both date and time
                  if (timeStr === 'Sin hora' && dateValue) {
                    try {
                      const dateObj = new Date(dateValue);
                      if (!isNaN(dateObj.getTime())) {
                        const hours = dateObj.getHours();
                        const minutes = dateObj.getMinutes();
                        if (hours !== 0 || minutes !== 0) {
                          timeStr = dateObj.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          });
                        }
                      }
                    } catch (error) {
                      console.warn('Error extracting time from date in option:', dateValue, error);
                    }
                  }
                  
                  const statusColor = option.status === 'confirmed' ? 'success' : 
                                     option.status === 'pending' ? 'warning' : 'default';
                  
                  return (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          📅
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {patientName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {dateStr} {timeStr}
                            </Typography>
                            <Chip 
                              label={option.status === 'confirmed' ? 'Confirmada' : 
                                     option.status === 'pending' ? 'Pendiente' : option.status} 
                              size="small" 
                              color={statusColor}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                }}
                loading={availableAppointments.length === 0}
                noOptionsText="No hay citas disponibles para consulta"
                clearText="Limpiar selección"
                closeText="Cerrar"
                openText="Abrir opciones"
              />
            </Box>

            {/* Enhanced Selected Appointment Info */}
            {selectedAppointment && (
              <Paper sx={{ p: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200', borderRadius: '12px' }}>
                {/* Header with Appointment Basic Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56, fontSize: '1.5rem' }}>
                    📅
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Cita Seleccionada
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        📅 {(() => {
                          const dateValue = selectedAppointment.date || selectedAppointment.appointment_date || selectedAppointment.scheduled_date;
                          if (dateValue) {
                            try {
                              const dateObj = new Date(dateValue);
                              if (!isNaN(dateObj.getTime())) {
                                return dateObj.toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                });
                              }
                            } catch (error) {
                              return 'Fecha inválida';
                            }
                          }
                          return 'Sin fecha';
                        })()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🕐 {(() => {
                          const timeValue = selectedAppointment.time || selectedAppointment.appointment_time || selectedAppointment.scheduled_time || selectedAppointment.hour;
                          if (timeValue) {
                            try {
                              if (typeof timeValue === 'string' && (timeValue.includes('T') || timeValue.includes(' '))) {
                                const timeObj = new Date(timeValue);
                                if (!isNaN(timeObj.getTime())) {
                                  return timeObj.toLocaleTimeString('es-ES', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true 
                                  });
                                }
                              } else if (typeof timeValue === 'string') {
                                return timeValue;
                              }
                            } catch (error) {
                              return 'Sin hora';
                            }
                          }
                          return 'Sin hora';
                        })()}
                      </Typography>
                      <Chip 
                        label={selectedAppointment.status === 'confirmed' ? 'Confirmada' : 
                               selectedAppointment.status === 'pending' ? 'Pendiente' : selectedAppointment.status} 
                        size="small" 
                        color={selectedAppointment.status === 'confirmed' ? 'success' : 
                               selectedAppointment.status === 'pending' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Appointment Details Grid */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: 2 
                }}>
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                    <Typography variant="body2" sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mb: 0.5,
                      fontWeight: 600,
                      color: 'text.secondary'
                    }}>
                      🏥 Tipo de Cita
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Tipo:</strong> {selectedAppointment.appointment_type || selectedAppointment.type || 'Consulta General'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Prioridad:</strong> {selectedAppointment.priority || 'Normal'}
                    </Typography>
                  </Box>

                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                    <Typography variant="body2" sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mb: 0.5,
                      fontWeight: 600,
                      color: 'text.secondary'
                    }}>
                      📝 Motivo de la Consulta
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      maxHeight: '60px', 
                      overflow: 'auto',
                      wordBreak: 'break-word'
                    }}>
                      {selectedAppointment.reason || selectedAppointment.chief_complaint || selectedAppointment.motivo || 'No especificado'}
                    </Typography>
                  </Box>

                  {(selectedAppointment.preparation_instructions || selectedAppointment.instructions) && (
                    <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                      <Typography variant="body2" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        mb: 0.5,
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}>
                        ⚠️ Instrucciones de Preparación
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        maxHeight: '60px', 
                        overflow: 'auto',
                        wordBreak: 'break-word'
                      }}>
                        {selectedAppointment.preparation_instructions || selectedAppointment.instructions}
                      </Typography>
                    </Box>
                  )}

                  {(selectedAppointment.notes || selectedAppointment.additional_notes) && (
                    <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                      <Typography variant="body2" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        mb: 0.5,
                        fontWeight: 600,
                        color: 'text.secondary'
                      }}>
                        📋 Notas Adicionales
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        maxHeight: '60px', 
                        overflow: 'auto',
                        wordBreak: 'break-word'
                      }}>
                        {selectedAppointment.notes || selectedAppointment.additional_notes}
                      </Typography>
                    </Box>
                  )}
                </Box>

              </Paper>
            )}

            {/* Patient Selection */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(option: Patient) => formatPatientNameWithAge(option)}
                  value={selectedPatient}
                  onChange={(_, newValue: Patient | null) => handlePatientChange(newValue)}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Seleccionar Paciente"
                      required
                      error={!!fieldErrors.patient_id}
                      helperText={fieldErrors.patient_id}
                    />
                  )}
                  renderOption={(props: any, option: Patient) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {option.first_name[0]}{option.paternal_surname[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{formatPatientNameWithAge(option)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.primary_phone} • {option.email}
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
                        {selectedPatient.primary_phone || 'No registrado'}
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
                  {onEditPatient && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => onEditPatient(selectedPatient)}
                      sx={{
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      Editar Datos
                    </Button>
                  )}
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
                      <Typography component="span" sx={{ fontWeight: 600 }}>Edad:</Typography> {selectedPatient.birth_date ? `${calculateAge(selectedPatient.birth_date)} años` : 'No registrada'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>Género:</Typography> {
                        selectedPatient.gender === 'M' ? 'Masculino' :
                        selectedPatient.gender === 'F' ? 'Femenino' :
                        selectedPatient.gender === 'O' ? 'Otro' :
                        selectedPatient.gender || 'No especificado'
                      }
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
                      <Typography component="span" sx={{ fontWeight: 600 }}>Dirección:</Typography> {getPatientFullAddress(selectedPatient)}
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
                    label={`Estado: ${selectedPatient.is_active ? 'Activo' : 'Inactivo'}`} 
                    size="small" 
                    color={selectedPatient.is_active ? 'success' : 'default'} 
                    variant="filled"
                  />
                  {selectedPatient.birth_date && (
                    <Chip 
                      label={calculateAge(selectedPatient.birth_date) < 18 ? 'Menor de Edad' : 'Adulto'} 
                      size="small" 
                      color={calculateAge(selectedPatient.birth_date) < 18 ? 'warning' : 'info'} 
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                  value={formData.date && formData.date.includes('T') ? formData.date.split('T')[1]?.substring(0, 5) : getCurrentCDMXDateTime().split('T')[1]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const timeValue = e.target.value;
                    const dateValue = formData.date && formData.date.includes('T') ? formData.date.split('T')[0] : getCurrentCDMXDateTime().split('T')[0];
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
                      {patientClinicalStudies.map((study: ClinicalStudy, index: number) => (
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, history_present_illness: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, physical_examination: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, family_history: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, personal_pathological_history: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, personal_non_pathological_history: e.target.value }))}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, secondary_diagnoses: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
              fullWidth
              required
              placeholder="Cuándo regresar, qué vigilar, recomendaciones..."
              error={!!fieldErrors.follow_up_instructions}
              helperText={fieldErrors.follow_up_instructions || "Próxima cita, signos de alarma, cuidados"}
            />

            <Divider />

            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
              <InfoIcon sx={{ fontSize: 20 }} />
              Notas Adicionales (Opcional)
            </Typography>

            <TextField
              label="Notas del Médico"
              multiline
              rows={3}
              value={formData.interconsultations || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, interconsultations: e.target.value }))}
              fullWidth
              placeholder="Observaciones adicionales, recomendaciones especiales, etc..."
            />
          </Box>
        );

      case 4:
        return (
          <Box sx={{ p: 0 }}>
            {onAddClinicalStudy && onEditClinicalStudy && onDeleteClinicalStudy ? (
              <>
                <ClinicalStudiesSection
                  consultationId={selectedConsultation?.id || tempConsultationId || 'new_consultation'}
                  patientId={String(formData.patient_id)}
                  studies={clinicalStudies}
                  onAddStudy={onAddClinicalStudy}
                  onEditStudy={onEditClinicalStudy}
                  onDeleteStudy={onDeleteClinicalStudy}
                  onViewFile={(fileUrl: string) => window.open(fileUrl, '_blank')}
                  onDownloadFile={(fileUrl: string, fileName: string) => {
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = fileName;
                    link.click();
                  }}
                />
                
                {/* Sección para programar consulta de seguimiento */}
                <Box sx={{ p: 3, mt: 2, bgcolor: 'primary.50', borderRadius: '12px', border: '1px solid', borderColor: 'primary.200' }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: 2,
                    color: 'primary.main' 
                  }}>
                    <CalendarIcon sx={{ fontSize: 20 }} />
                    Consulta de Seguimiento
                  </Typography>
                  
                  {/* Show edit form when showScheduleFollowUp is true */}
                  {showScheduleFollowUp ? (
                    <Box sx={{ bgcolor: 'white', p: 3, borderRadius: '8px', border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="subtitle1" sx={{ 
                        fontWeight: 600, 
                        color: 'primary.main',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <EditIcon sx={{ fontSize: 20 }} />
                        {scheduledFollowUp ? 'Editar Cita de Seguimiento' : 'Programar Cita de Seguimiento'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <TextField
                            label="Fecha de Seguimiento"
                            type="date"
                            value={followUpFormData.date}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFollowUpFormChange('date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            helperText="Fecha recomendada para revisar resultados"
                          />
                          <TextField
                            label="Hora"
                            type="time"
                            value={followUpFormData.time}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFollowUpFormChange('time', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            helperText="Hora preferida"
                          />
                        </Box>
                        
                        <TextField
                          label="Motivo de la Consulta de Seguimiento"
                          multiline
                          rows={2}
                          value={followUpFormData.reason}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFollowUpFormChange('reason', e.target.value)}
                          placeholder="Ej: Revisión de resultados de laboratorio, evaluación de respuesta al tratamiento..."
                          fullWidth
                        />
                        
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <Button 
                            variant="outlined" 
                            onClick={() => {
                              setShowScheduleFollowUp(false);
                              setFollowUpFormData({ date: '', time: '', reason: '' });
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            variant="contained" 
                            startIcon={<CalendarIcon />}
                            onClick={handleScheduleFollowUp}
                            disabled={!followUpFormData.date || !followUpFormData.time || !followUpFormData.reason}
                          >
                            {scheduledFollowUp ? 'Actualizar Cita' : 'Programar Cita'}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  ) : scheduledFollowUp ? (
                    <Box sx={{ bgcolor: 'success.50', p: 3, borderRadius: '8px', border: '1px solid', borderColor: 'success.200' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <ScheduledIcon sx={{ fontSize: 20 }} />
                          Cita Programada
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={handleEditFollowUp}
                            sx={{ 
                              borderColor: 'success.main', 
                              color: 'success.main',
                              '&:hover': { bgcolor: 'success.100' }
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={handleDeleteFollowUp}
                            sx={{ 
                              borderColor: 'error.main', 
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.50' }
                            }}
                          >
                            Eliminar
                          </Button>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            color: 'text.secondary', 
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <EventIcon sx={{ fontSize: 16 }} />
                            Fecha y Hora:
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {getAppointmentDate(scheduledFollowUp.date_time).toLocaleDateString('es-ES', {
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric'
                            })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ClockIcon sx={{ fontSize: 14 }} />
                            {getAppointmentDate(scheduledFollowUp.date_time).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            color: 'text.secondary', 
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <TaskIcon sx={{ fontSize: 16 }} />
                            Motivo:
                          </Typography>
                          <Typography variant="body1">
                            {scheduledFollowUp.reason}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            color: 'text.secondary', 
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <ClockIcon sx={{ fontSize: 16 }} />
                            Duración:
                          </Typography>
                          <Typography variant="body1">
                            {scheduledFollowUp.doctor?.appointment_duration || 30} minutos
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            color: 'text.secondary', 
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <StatusIcon sx={{ fontSize: 16 }} />
                            Estado:
                          </Typography>
                          <Chip 
                            label={scheduledFollowUp.status === 'scheduled' ? 'Programada' : scheduledFollowUp.status}
                            size="small"
                            color="success"
                            variant="filled"
                          />
                        </Box>
                      </Box>
                      
                      {scheduledFollowUp.preparation_instructions && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: '6px', border: '1px solid', borderColor: 'info.200' }}>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            color: 'info.main', 
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <NotesIcon sx={{ fontSize: 16 }} />
                            Instrucciones de Preparación:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {scheduledFollowUp.preparation_instructions}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Programa una cita para revisar los resultados de los estudios clínicos solicitados.
                      </Typography>
                      
                      <Button
                        variant="outlined"
                        startIcon={<ClockIcon />}
                        onClick={() => setShowScheduleFollowUp(true)}
                        sx={{ 
                          bgcolor: 'white', 
                          borderColor: 'primary.main',
                          '&:hover': {
                            bgcolor: 'primary.50'
                          }
                        }}
                      >
                        Programar Consulta de Seguimiento
                      </Button>
                    </>
                  )}
                </Box>
              </>
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

export default ConsultationDialog;