import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  FormHelperText,
  Autocomplete,
  Avatar,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  CalendarToday as CalendarIcon,
  LocalHospital as HospitalIcon,
  MedicalServices as MedicalServicesIcon,
  Notes as NotesIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Schedule as ScheduleIcon,
  MonitorHeart as MonitorHeartIcon,
  Favorite as HeartIcon,
  Thermostat as ThermostatIcon,
  Scale as ScaleIcon,
  Height as HeightIcon,
  LocalHospital as HospitalIcon2,
  Science as ScienceIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Patient, PatientFormData, ClinicalStudy } from '../../types';
import { MEDICAL_VALIDATION_RULES, validateForm } from '../../utils/validation';
import { apiService } from '../../services/api';
import ClinicalStudiesSection from '../common/ClinicalStudiesSection';
import ClinicalStudyDialogWithCatalog from './ClinicalStudyDialogWithCatalog';
import { useClinicalStudies } from '../../hooks/useClinicalStudies';
import VitalSignsSection from '../common/VitalSignsSection';
import { useVitalSigns } from '../../hooks/useVitalSigns';
import PrescriptionsSection from '../common/PrescriptionsSection';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import PrescriptionDialog from './PrescriptionDialog';
import DiagnosisSelector from '../common/DiagnosisSelector';
import { DiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';
import DiagnosisDialog from './DiagnosisDialog';
import DiagnosisSection from '../common/DiagnosisSection';
import { useDiagnosisManagement } from '../../hooks/useDiagnosisManagement';
import { PrintButtons } from '../common/PrintButtons';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo } from '../../services/pdfService';
import { useToast } from '../common/ToastNotification';
import { disablePaymentDetection } from '../../utils/disablePaymentDetection';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { parseBackendDate } from '../../utils/formatters';
// import { useSnackbar } from '../../contexts/SnackbarContext';

// Define ConsultationFormData interface based on the hook
export interface ConsultationFormData {
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  treatment_plan: string;
  therapeutic_plan: string;
  follow_up_instructions: string;
  prognosis: string;
  laboratory_results: string;
  imaging_studies: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
  // New fields for appointment selection
  has_appointment: boolean;
  appointment_id: string;
  // New fields for structured diagnoses
  primary_diagnoses: DiagnosisCatalog[];
  secondary_diagnoses_list: DiagnosisCatalog[];
  // First-time consultation fields (removed duplicate _story fields)
  // These fields are now handled by the existing _history fields:
  // - family_history
  // - personal_pathological_history  
  // - personal_non_pathological_history
}

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  consultation?: any | null;
  onSubmit: (data: ConsultationFormData) => Promise<any>;
  patients: Patient[];
  doctorProfile?: any;
  onNewPatient?: () => void;
  onNewAppointment?: () => void; // New prop for opening appointment dialog
  appointments?: any[]; // Add appointments prop
}

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
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

const ConsultationDialog: React.FC<ConsultationDialogProps> = ({
  open,
  onClose,
  consultation,
  onSubmit,
  patients,
  doctorProfile,
  onNewPatient,
  onNewAppointment,
  appointments = []
}: ConsultationDialogProps) => {
  const isEditing = !!consultation;
  const { showSuccess, showError } = useToast();

  console.log('🔄 ConsultationDialog render:', {
    open,
    isEditing,
    consultationId: consultation?.id,
    consultationDate: consultation?.date,
    patientsCount: patients.length,
    consultationType: typeof consultation,
    consultationIsNull: consultation === null,
    consultationIsUndefined: consultation === undefined
  });

  // Track consultation prop changes
  useEffect(() => {
    console.log('🔄 Consultation prop changed:', {
      consultation,
      consultationId: consultation?.id,
      consultationType: typeof consultation,
      isEditing: !!consultation
    });
  }, [consultation]);

  // Helper function to get current date in CDMX timezone
  const getCDMXDateTime = () => {
    const now = new Date();
    // Get the current time in CDMX timezone and format it properly
    const cdmxTimeString = now.toLocaleString("sv-SE", {timeZone: "America/Mexico_City"});
    // Convert back to Date object and then to ISO string
    const cdmxDate = new Date(cdmxTimeString);
    return cdmxDate.toISOString();
  };

  const initialFormData: ConsultationFormData = {
    patient_id: '',
    date: getCDMXDateTime(),
    chief_complaint: '',
    history_present_illness: '',
    family_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    physical_examination: '',
    primary_diagnosis: '',
    secondary_diagnoses: '',
    treatment_plan: '',
    therapeutic_plan: '',
    follow_up_instructions: '',
    prognosis: '',
    laboratory_results: '',
    imaging_studies: '',
    interconsultations: '',
    doctor_name: doctorProfile?.first_name && doctorProfile?.last_name 
      ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
      : '',
    doctor_professional_license: doctorProfile?.professional_license || '',
    doctor_specialty: doctorProfile?.specialty || '',
    // New fields
    has_appointment: undefined as any,
    appointment_id: '',
    // Structured diagnoses
    primary_diagnoses: [],
    secondary_diagnoses_list: [],
    // First-time consultation fields (removed duplicate _story fields)
    // These fields are now handled by the existing _history fields
  };

  const [formData, setFormData] = useState<ConsultationFormData>(initialFormData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [appointmentOffice, setAppointmentOffice] = useState<any | null>(null);
  const [patientEditData, setPatientEditData] = useState<PatientFormData | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [birthStates, setBirthStates] = useState<any[]>([]);
  const [emergencyRelationships, setEmergencyRelationships] = useState<any[]>([]);
  const [appointmentPatients, setAppointmentPatients] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(error);

  // Simplified consultation flow states
  const [showAdvancedPatientData, setShowAdvancedPatientData] = useState<boolean>(false);
  const [patientHasPreviousConsultations, setPatientHasPreviousConsultations] = useState<boolean>(false);
  const [patientPreviousStudies, setPatientPreviousStudies] = useState<ClinicalStudy[]>([]);
  const [loadingPreviousStudies, setLoadingPreviousStudies] = useState<boolean>(false);
  
  // Function to determine if only basic patient data should be shown
  const shouldShowOnlyBasicPatientData = (): boolean => {
    // Show only basic data if advanced data is not requested
    return !showAdvancedPatientData;
  };

  // Function to determine if "Ver consultas previas" button should be shown
  const shouldShowPreviousConsultationsButton = (): boolean => {
    // Show button if:
    // 1. Selected appointment is of type "Seguimiento" OR
    // 2. Patient is selected AND has at least one previous consultation
    const isFollowUpAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'seguimiento' ||
      selectedAppointment.appointment_type === 'follow_up'
    );
    
    // Check if patient is selected
    const isExistingPatientSelected = selectedPatient;
    
    const shouldShow = isFollowUpAppointment || (isExistingPatientSelected && patientHasPreviousConsultations);
    
    return shouldShow;
  };

  // Helper function to get patient data for display
  const getPatientData = (field: string) => {
    return patientEditData?.[field as keyof typeof patientEditData] || '';
  };

  // Helper function to handle patient data changes
  const handlePatientDataChangeWrapper = (field: string, value: any) => {
      handlePatientDataChange(field, value);
  };

  // Function to determine if first-time consultation fields should be shown
  const shouldShowFirstTimeFields = (): boolean => {
    // Show fields if:
    // 1. Editing an existing consultation of type "Primera vez"
    // 2. Selected appointment is of type "Primera vez"
    const isEditingFirstTimeConsultation = consultation && consultation.consultation_type === 'Primera vez';
    const hasFirstTimeAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Primera vez' || 
      selectedAppointment.appointment_type === 'Primera vez' ||
      selectedAppointment.appointment_type === 'primera vez' ||
      selectedAppointment.appointment_type === 'first_visit'
    );
    const shouldShow = isEditingFirstTimeConsultation || hasFirstTimeAppointment;
    
    return shouldShow;
  };


  // Clinical studies management
  const clinicalStudiesHook = useClinicalStudies();

  // Vital signs management
  const vitalSignsHook = useVitalSigns();

  // Prescriptions management
  const prescriptionsHook = usePrescriptions();

  // Diagnosis management
  const primaryDiagnosesHook = useDiagnosisManagement();
  const secondaryDiagnosesHook = useDiagnosisManagement();


  useEffect(() => {
    if (open) {
      // Disable payment detection for insurance fields
      setTimeout(() => {
        disablePaymentDetection();
      }, 100);
      setError(null);
      setErrors({});
    }
  }, [open]);

  // Separate useEffect for consultation data loading
  useEffect(() => {
    if (open && consultation) {
        // Map consultation data to form data
        setFormData({
          ...initialFormData,
          patient_id: consultation.patient_id || '',
          date: consultation.date ? consultation.date : getCDMXDateTime(),
          chief_complaint: consultation.chief_complaint || '',
          history_present_illness: consultation.history_present_illness || '',
          family_history: consultation.family_history || '',
          personal_pathological_history: consultation.personal_pathological_history || '',
          personal_non_pathological_history: consultation.personal_non_pathological_history || '',
          physical_examination: consultation.physical_examination || '',
          primary_diagnosis: consultation.primary_diagnosis || '',
          secondary_diagnoses: consultation.secondary_diagnoses || '',
          treatment_plan: consultation.treatment_plan || '',
          therapeutic_plan: consultation.therapeutic_plan || '',
          follow_up_instructions: consultation.follow_up_instructions || '',
          prognosis: consultation.prognosis || '',
          laboratory_results: consultation.laboratory_results || '',
          imaging_studies: consultation.imaging_studies || '',
          interconsultations: consultation.interconsultations || '',
          doctor_name: consultation.doctor_name || initialFormData.doctor_name,
          doctor_professional_license: consultation.doctor_professional_license || initialFormData.doctor_professional_license,
          doctor_specialty: consultation.doctor_specialty || initialFormData.doctor_specialty,
          // Initialize structured diagnoses (will be loaded from API if available)
          primary_diagnoses: consultation.primary_diagnoses || [],
          secondary_diagnoses_list: consultation.secondary_diagnoses_list || [],
          // First-time consultation fields (removed duplicate _story fields)
          // These fields are now handled by the existing _history fields
        });

        // Find and set selected patient
        if (consultation.patient_id && patients.length > 0) {
          const patient = (patients || []).find((p: any) => p.id === consultation.patient_id);
          setSelectedPatient(patient || null);
        }

        // Load clinical studies, vital signs and prescriptions for existing consultation
        clinicalStudiesHook.fetchStudies(String(consultation.id));
        vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
        prescriptionsHook.fetchPrescriptions(String(consultation.id));
        
        // Load office information if consultation has appointment_id
        if (consultation.appointment_id) {
          loadOfficeForConsultation(consultation.appointment_id);
        } else {
          loadDefaultOffice();
        }
    }
  }, [open, consultation, patients, doctorProfile]);

  // Separate useEffect for new consultation setup
  useEffect(() => {
    console.log('🔄 useEffect for new consultation setup:', { open, consultation: !!consultation });
    if (open && !consultation) {
      console.log('🔄 Setting up new consultation');
      setFormData(initialFormData);
      setSelectedAppointment(null);
      setSelectedPatient(null);
      setShowAdvancedPatientData(false);
      
      // Clear clinical studies, vital signs and prescriptions for new consultation
      clinicalStudiesHook.clearTemporaryStudies();
      vitalSignsHook.clearTemporaryVitalSigns();
      prescriptionsHook.clearTemporaryPrescriptions();
    }
  }, [open, consultation]);

  // Refresh clinical studies when clinical study dialog closes (for existing consultations)
  useEffect(() => {
    if (isEditing && consultation && !clinicalStudiesHook.clinicalStudyDialogOpen) {
      // Refresh studies when clinical study dialog closes
      clinicalStudiesHook.fetchStudies(String(consultation.id));
    }
  }, [clinicalStudiesHook.clinicalStudyDialogOpen, isEditing, consultation]);

  // Refresh vital signs when vital signs dialog closes (for existing consultations)
  useEffect(() => {
    if (isEditing && consultation && !vitalSignsHook.vitalSignDialogOpen) {
      // Refresh vital signs when vital signs dialog closes
      vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
    }
  }, [vitalSignsHook.vitalSignDialogOpen, isEditing, consultation]);

  // Load countries, emergency relationships, patients for appointments, and vital signs
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [countriesData, relationshipsData] = await Promise.all([
          apiService.getCountries(),
          apiService.getEmergencyRelationships()
        ]);
        setCountries(countriesData);
        setEmergencyRelationships(relationshipsData);
        
        // Load available vital signs
        vitalSignsHook.fetchAvailableVitalSigns();

        // Load patients for appointments if appointments exist
        if (appointments && appointments.length > 0) {
          const patientIds = (appointments || []).map((apt: any) => apt.patient_id).filter((id: any) => id);
          
          // Get all patients to find the ones referenced in appointments
          const allPatients = await apiService.getPatients();
          const appointmentPatients = (allPatients || []).filter((patient: any) => 
            patientIds.includes(patient.id)
          );
          
          // Set the appointment patients for use in the dropdown
          setAppointmentPatients(appointmentPatients);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    if (open) {
      loadInitialData();
    }
  }, [open, appointments]);

  // Load structured diagnoses when editing a consultation
  useEffect(() => {
    const loadStructuredDiagnoses = async () => {
      if (consultation && consultation.id) {
        try {
          // For now, we'll parse from the text fields if they contain CIE-10 codes
          const parseDiagnosesFromText = (text: string): DiagnosisCatalog[] => {
            if (!text) return [];
            
            // Simple parsing for CIE-10 codes (e.g., "E11.9 - Diabetes mellitus tipo 2")
            const diagnosisEntries = text.split(';').map(entry => entry.trim()).filter(entry => entry);
            return diagnosisEntries.map((entry, index) => {
              const [code, ...nameParts] = entry.split(' - ');
              const name = nameParts.join(' - ');
              
              return {
                id: index + 1, // Temporary ID
                code: code?.trim() || '',
                name: name?.trim() || entry,
                category_id: 0,
                description: '',
                synonyms: [],
                severity_level: undefined,
                is_chronic: false,
                is_contagious: false,
                age_group: undefined,
                gender_specific: undefined,
                specialty: undefined,
                is_active: true,
                created_at: '',
                updated_at: '',
                category: {
                  id: 0,
                  code: '',
                  name: '',
                  level: 1,
                  is_active: true,
                  created_at: '',
                  updated_at: ''
                }
              };
            });
          };

          // Parse primary diagnoses
          if (consultation.primary_diagnosis) {
            const parsedPrimary = parseDiagnosesFromText(consultation.primary_diagnosis);
            setFormData((prev: ConsultationFormData) => ({ ...prev, primary_diagnoses: parsedPrimary }));
          }

          // Parse secondary diagnoses
          if (consultation.secondary_diagnoses) {
            const parsedSecondary = parseDiagnosesFromText(consultation.secondary_diagnoses);
            setFormData((prev: ConsultationFormData) => ({ ...prev, secondary_diagnoses_list: parsedSecondary }));
          }
        } catch (error) {
          console.error('Error loading structured diagnoses:', error);
        }
      }
    };

    if (open && consultation) {
      loadStructuredDiagnoses();
    }
  }, [open, consultation]);

  // Clear diagnosis hooks when dialog opens for new consultation (not editing)
  useEffect(() => {
    console.log('🔄 useEffect for diagnosis hooks clearing:', { open, isEditing, consultation: !!consultation });
    if (open && !isEditing && !consultation) {
      console.log('🔄 Clearing diagnosis hooks for new consultation');
      primaryDiagnosesHook.clearDiagnoses();
      secondaryDiagnosesHook.clearDiagnoses();
    }
  }, [open, isEditing, consultation]); // Added consultation to dependencies

  // Load states when patient data changes
  useEffect(() => {
    const loadStatesForPatient = async () => {
      if (patientEditData) {
        try {
          // Load states for address country
          if (patientEditData.address_country_id) {
            const addressStatesData = await apiService.getStates(parseInt(patientEditData.address_country_id));
            setStates(addressStatesData);
          }
          
          // Load states for birth country
          if (patientEditData.birth_country_id) {
            const birthStatesData = await apiService.getStates(parseInt(patientEditData.birth_country_id));
            setBirthStates(birthStatesData);
          }
        } catch (error) {
          console.error('Error loading states:', error);
        }
      }
    };

    loadStatesForPatient();
  }, [patientEditData?.address_country_id, patientEditData?.birth_country_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData((prev: ConsultationFormData) => ({ ...prev, [name as string]: value }));
    if (errors[name as string]) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  };

  const handleDateChange = (newValue: Date | null) => {
    let dateString = '';
    if (newValue) {
      // Convert to CDMX timezone before sending
      const cdmxTimeString = newValue.toLocaleString("sv-SE", {timeZone: "America/Mexico_City"});
      const cdmxDate = new Date(cdmxTimeString);
      dateString = cdmxDate.toISOString();
    }
    setFormData((prev: ConsultationFormData) => ({ ...prev, date: dateString }));
    if (errors.date) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors.date;
        return newErrors;
      });
    }
  };

  const handlePatientChange = async (patient: any | null) => {
    setSelectedPatient(patient);
    setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: patient?.id || '' }));
    
    // Load full patient data for editing
    if (patient) {
      try {
        const fullPatientData = await apiService.getPatient(patient.id);
        setPatientEditData(fullPatientData);
        
        // Check if patient has previous consultations and load previous studies
        await Promise.all([
          checkPatientPreviousConsultations(patient.id),
          loadPatientPreviousStudies(patient.id)
        ]);
      } catch (error) {
        console.error('Error loading patient data:', error);
        setPatientEditData(null);
      }
    } else {
      setPatientEditData(null);
      setPatientHasPreviousConsultations(false);
      setPatientPreviousStudies([]);
    }
    
    if (errors.patient_id) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors.patient_id;
        return newErrors;
      });
    }
  };

  // Function to check if patient has previous consultations
  const checkPatientPreviousConsultations = async (patientId: number) => {
    try {
      // Get all consultations and filter by patient ID
      const response = await apiService.get('/api/consultations');
      const allConsultations = response.data || [];
      
      // Filter consultations for this specific patient
      const patientConsultations = (allConsultations || []).filter((c: any) => c.patient_id === patientId);
      const hasPrevious = patientConsultations.length > 0;
      
      setPatientHasPreviousConsultations(hasPrevious);
    } catch (error) {
      console.error('❌ Error checking patient consultations:', error);
      setPatientHasPreviousConsultations(false);
    }
  };

  // Function to load previous clinical studies for patient
  const loadPatientPreviousStudies = async (patientId: number) => {
    console.log('🔬 Loading previous studies for patient ID:', patientId);
    setLoadingPreviousStudies(true);
    try {
      const studies = await apiService.getClinicalStudiesByPatient(String(patientId));
      console.log('🔬 Previous studies found:', studies.length);
      console.log('🔬 Studies data:', studies);
      // Log results_date and status for each study
      studies.forEach((study, index) => {
        console.log(`🔬 Study ${index} - ID: ${study.id}, Status: ${study.status}, Results Date: ${study.results_date}`);
      });
      console.log('🔬 Setting patientPreviousStudies to:', studies);
      setPatientPreviousStudies(studies || []);
    } catch (error) {
      console.error('❌ Error loading patient previous studies:', error);
      setPatientPreviousStudies([]);
    } finally {
      setLoadingPreviousStudies(false);
    }
  };

  // Function to open consultations view with patient filter
  const handleViewPreviousConsultations = () => {
    if (!selectedPatient) return;
    
    // Open in a new tab with patient filter
    const patientId = selectedPatient.id;
    const patientName = `${selectedPatient.first_name} ${selectedPatient.paternal_surname}`.trim();
    
    // Create a URL with patient filter as query parameter
    const baseUrl = window.location.origin;
    const consultationsUrl = `${baseUrl}/?view=consultations&patientId=${patientId}&patientName=${encodeURIComponent(patientName)}`;
    
    window.open(consultationsUrl, '_blank');
  };

  // Handle update of previous study status
  const handleUpdateStudyStatus = async (studyId: string, newStatus: string) => {
    try {
      await apiService.updateClinicalStudy(studyId, { status: newStatus });
      showSuccess('Estado del estudio actualizado correctamente');
      // Reload previous studies
      if (selectedPatient) {
        await loadPatientPreviousStudies(selectedPatient.id);
      }
    } catch (error) {
      console.error('Error updating study status:', error);
      showError('Error al actualizar el estado del estudio');
    }
  };

  // Handle upload file for previous study
  const handleUploadStudyFile = async (studyId: string, file: File) => {
    try {
      await apiService.uploadClinicalStudyFile(studyId, file);
      showSuccess('Archivo cargado correctamente');
      
      // Update study status to completed immediately
      try {
        await apiService.updateClinicalStudy(studyId, { status: 'completed' });
        // Update local state immediately to hide WhatsApp button
        setPatientPreviousStudies(prevStudies => {
          const updatedStudies = prevStudies.map(study => 
            study.id === studyId 
              ? { ...study, status: 'completed' }
              : study
          );
          return updatedStudies;
        });
      } catch (statusError) {
        console.error('Error updating study status:', statusError);
        // Continue even if status update fails
      }
      
      // Reload previous studies to get updated data (but preserve local status update)
      if (selectedPatient) {
        console.log('🔄 Reloading previous studies after file upload...');
        const updatedStudies = await apiService.getClinicalStudiesByPatient(String(selectedPatient.id));
        console.log('🔬 Updated studies from API:', updatedStudies);
        
        // Update studies but preserve the completed status we just set
        setPatientPreviousStudies(prevStudies => {
          const newStudies = updatedStudies.map(apiStudy => {
            const localStudy = (prevStudies || []).find(prev => prev.id === apiStudy.id);
            // If we just updated this study locally, keep the completed status
            if (localStudy && localStudy.id === studyId && localStudy.status === 'completed') {
              console.log('🔬 Preserving completed status for study:', studyId);
              return { ...apiStudy, status: 'completed' };
            }
            return apiStudy;
          });
          console.log('🔬 Final studies state:', newStudies);
          console.log('🔬 Study statuses:', newStudies.map(s => ({ id: s.id, status: s.status })));
          
          // Check if the study we just updated is still completed
          const updatedStudy = (newStudies || []).find(s => s.id === studyId);
          console.log('🔬 Updated study status:', updatedStudy ? updatedStudy.status : 'NOT FOUND');
          
          // Force a re-render by updating the state
          setTimeout(() => {
            console.log('🔬 Forcing re-render after timeout');
            setPatientPreviousStudies(prev => [...prev]);
          }, 100);
          
          return newStudies;
        });
        console.log('✅ Previous studies reloaded after file upload');
      }
    } catch (error: any) {
      console.error('Error uploading study file:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response detail:', error.response?.data?.detail);
      console.error('Error response status:', error.response?.status);
      console.error('Error message:', error.message);
      
      // Show specific error message from backend
      // The error is already transformed by the API interceptor, so we need to check the detail property directly
      const errorMessage = error.detail || error.message || 'Error al cargar el archivo del estudio';
      // console.log('🔍 Final error message to show:', errorMessage);
      // console.log('🔍 Error object structure:', {
      //   hasResponse: !!error.response,
      //   hasData: !!error.response?.data,
      //   hasDetail: !!error.response?.data?.detail,
      //   detailValue: error.response?.data?.detail,
      //   status: error.response?.status
      // });
      showError(errorMessage);
    }
  };


  // Handle view file for previous study with authentication
  const handleViewStudyFile = async (studyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      // Fetch the file with authentication
      const response = await fetch(`http://localhost:8000/api/clinical-studies/${studyId}/file`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener el archivo');
      }

      // Get the blob
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'archivo.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create object URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing study file:', error);
      showError('Error al visualizar el archivo del estudio');
    }
  };

  const handlePatientDataChange = (field: keyof any, value: any) => {
    setPatientEditData((prev: any) => prev ? { ...prev, [field]: value } : null);
  };

  const handleCountryChange = async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    handlePatientDataChange(field, countryId);
    
    if (countryId) {
      try {
        const statesData = await apiService.getStates(parseInt(countryId));
        if (field === 'address_country_id') {
          setStates(statesData);
        } else {
          setBirthStates(statesData);
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    } else {
      if (field === 'address_country_id') {
        setStates([]);
      } else {
        setBirthStates([]);
      }
    }
  };

  const handleAppointmentChange = async (appointment: any | null) => {
    setSelectedAppointment(appointment);
    
    if (appointment) {
      // Use patient from appointment object (comes from backend) or find in local patients list
      const patient = appointment.patient || (patients || []).find((p: any) => p.id === appointment.patient_id);
      
      if (patient) {
        setSelectedPatient(patient);
        setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: patient.id.toString(), appointment_id: appointment.id.toString() }));
        
        // Get office information from appointment
        if (appointment.office_id) {
          try {
            const officeData = await apiService.getOffice(appointment.office_id);
            setAppointmentOffice(officeData);
          } catch (error) {
            console.error('Error loading office data:', error);
            setAppointmentOffice(null);
          }
        } else {
          setAppointmentOffice(null);
        }
        
        // Always load fresh patient data from API to ensure decryption
        try {
          const fullPatientData = await apiService.getPatient(patient.id);
          setPatientEditData(fullPatientData);
          // Update selectedPatient with fresh data including birth_date and gender
          setSelectedPatient(fullPatientData);
          
          // Check if patient has previous consultations and load previous studies
          await Promise.all([
            checkPatientPreviousConsultations(patient.id),
            loadPatientPreviousStudies(patient.id)
          ]);
        } catch (error) {
          console.error('❌ Error loading decrypted patient data:', error);
          setPatientEditData(null);
        }
      } else {
        console.warn('No patient found for appointment:', appointment.id);
        setSelectedPatient(null);
        setPatientEditData(null);
        setPatientHasPreviousConsultations(false);
        setPatientPreviousStudies([]);
        setAppointmentOffice(null);
      }
    } else {
      setSelectedPatient(null);
      setPatientEditData(null);
      setPatientHasPreviousConsultations(false);
      setPatientPreviousStudies([]);
      setAppointmentOffice(null);
      setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: '', appointment_id: '' }));
    }
  };

  // Load office information for existing consultation
  const loadOfficeForConsultation = async (appointmentId: string) => {
    try {
      // console.log('🔍 Loading office for consultation, appointmentId:', appointmentId);
      // First get the appointment to get the office_id
      const appointment = await apiService.getAppointment(parseInt(appointmentId));
      // console.log('🔍 Appointment data:', appointment);
      
      if (appointment && appointment.office_id) {
        const officeData = await apiService.getOffice(appointment.office_id);
        // console.log('🔍 Office data loaded:', officeData);
        setAppointmentOffice(officeData);
      } else {
        // console.log('🔍 No office_id found in appointment');
        setAppointmentOffice(null);
      }
    } catch (error) {
      console.error('Error loading office for consultation:', error);
      setAppointmentOffice(null);
    }
  };

  // Load default office information when no appointment_id
  const loadDefaultOffice = async () => {
    try {
      // console.log('🔍 Loading default office');
      // Get all offices for the doctor using doctorProfile.id
      const doctorId = doctorProfile?.id;
      if (!doctorId) {
        // console.log('🔍 No doctor ID found in doctorProfile');
        setAppointmentOffice(null);
        return;
      }
      
      // console.log('🔍 Loading offices for doctor_id:', doctorId);
      const offices = await apiService.getOffices(doctorId);
      // console.log('🔍 All offices for doctor:', offices);
      
      if (offices && offices.length > 0) {
        // Use the first active office
        const defaultOffice = offices.find(office => office.is_active) || offices[0];
        // console.log('🔍 Default office selected:', defaultOffice);
        setAppointmentOffice(defaultOffice);
        } else {
        // console.log('🔍 No offices found');
        setAppointmentOffice(null);
        }
      } catch (error) {
      console.error('Error loading default office:', error);
      setAppointmentOffice(null);
    }
  };


  // Filter appointments to show only non-cancelled ones for the current doctor
  const availableAppointments = (appointments || []).filter((appointment: any) => 
    appointment.status !== 'cancelled' && 
    appointment.status !== 'canceled' &&
    appointment.doctor_id === doctorProfile?.id
  );

  const handleSubmit = async () => {
    setError(null);
    
    // Validation for new consultation flow
    if (!consultation) {
      // For new consultations, validate that an appointment is selected
      if (!selectedAppointment) {
        setError('Por favor, selecciona una cita para crear la consulta');
        return;
      }
      
      if (!selectedPatient) {
        setError('Por favor, selecciona un paciente');
        return;
      }
    } else {
      // For editing existing consultations, use old validation
      if (!selectedPatient) {
        setError('Por favor, selecciona un paciente existente');
      return;
      }
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      return;
    }

    // Use selected patient ID
    let finalPatientId = selectedPatient?.id;
    
    if (!finalPatientId) {
      setError('No se pudo obtener el ID del paciente');
        return;
    }

    // Update patient data if modified
    if (patientEditData && selectedPatient) {
      try {
        await apiService.updatePatient(selectedPatient.id.toString(), patientEditData);
      } catch (error) {
        console.error('Error updating patient data:', error);
        setError('Error al actualizar los datos del paciente');
        return;
      }
    }

    setLoading(true);
    try {
      // Determine consultation type based on appointment
      let consultationType = 'Seguimiento';
      
      if (!consultation) {
        // For new consultations, use appointment type
          consultationType = selectedAppointment?.consultation_type || 'Seguimiento';
      } else {
        // For editing existing consultations, use existing type
        consultationType = consultation.consultation_type || 'Seguimiento';
      }
      
      // Update formData with final patient ID and consultation type
      const finalFormData = {
        ...formData,
        patient_id: finalPatientId?.toString() || '',
        consultation_type: consultationType,
        // Include structured diagnoses
        primary_diagnoses: formData.primary_diagnoses,
        secondary_diagnoses_list: formData.secondary_diagnoses_list
      };
      
      console.log('🔬 Final form data being sent:', finalFormData);
      console.log('🔬 Laboratory results field:', finalFormData.laboratory_results);
      console.log('🔬 Family history field:', finalFormData.family_history);
      console.log('🔬 Personal pathological history field:', finalFormData.personal_pathological_history);
      console.log('🔬 Personal non-pathological history field:', finalFormData.personal_non_pathological_history);
      
      const createdConsultation = await onSubmit(finalFormData);
      console.log('🔬 Consultation creation result:', createdConsultation);
      console.log('🔬 Created consultation ID:', createdConsultation?.id);
      
      // Save clinical studies if any were added (only temporary studies for new consultations)
      if ((clinicalStudiesHook.studies || []).length > 0 && createdConsultation?.id) {
        console.log('🔬 Saving clinical studies for consultation:', createdConsultation.id);
        console.log('🔬 Studies to save:', clinicalStudiesHook.studies);
        
        // Filter only temporary studies (those with temp_ IDs)
        const temporaryStudies = (clinicalStudiesHook.studies || []).filter(study => 
          study.id.toString().startsWith('temp_')
        );
        
        console.log('🔬 Temporary studies to save:', temporaryStudies);
        
        for (const study of temporaryStudies) {
          const studyData = {
            ...study,
            consultation_id: createdConsultation.id,
            patient_id: finalPatientId.toString()
          };
          
          try {
            console.log('🔬 Study data to send:', studyData);
            await clinicalStudiesHook.createStudy(studyData);
          } catch (error) {
            console.error('❌ Error saving clinical study:', error);
            console.error('❌ Study data that failed:', studyData);
            // Continue with other studies even if one fails
          }
        }
        
        // Clear temporary studies after saving
        clinicalStudiesHook.clearTemporaryStudies();
        
        // Refresh studies to show the newly created ones
        await clinicalStudiesHook.fetchStudies(String(createdConsultation.id));
      } else {
        console.log('🔬 No clinical studies to save or consultation not created');
        console.log('🔬 Studies count:', clinicalStudiesHook.studies.length);
        console.log('🔬 Consultation ID:', createdConsultation?.id);
      }

      // Save vital signs if any were added
      if (vitalSignsHook.temporaryVitalSigns.length > 0 && createdConsultation?.id) {
        console.log('🫀 Saving vital signs for consultation:', createdConsultation.id);
        console.log('🫀 Vital signs to save:', vitalSignsHook.temporaryVitalSigns);
        
        for (const vitalSign of vitalSignsHook.temporaryVitalSigns) {
          try {
            console.log('🫀 Vital sign data to send:', vitalSign);
            await vitalSignsHook.createVitalSign(String(createdConsultation.id), vitalSign);
          } catch (error) {
            console.error('❌ Error saving vital sign:', error);
            console.error('❌ Vital sign data that failed:', vitalSign);
            // Continue with other vital signs even if one fails
          }
        }
        
        // Clear temporary vital signs after saving
        vitalSignsHook.clearTemporaryVitalSigns();
      } else {
        console.log('🫀 No vital signs to save or consultation not created');
        console.log('🫀 Vital signs count:', vitalSignsHook.temporaryVitalSigns.length);
        console.log('🫀 Consultation ID:', createdConsultation?.id);
      }

      // Save prescriptions if any were added
      if (prescriptionsHook.prescriptions.length > 0 && createdConsultation?.id) {
        console.log('💊 Saving prescriptions for consultation:', createdConsultation.id);
        console.log('💊 Prescriptions to save:', prescriptionsHook.prescriptions);
        
        for (const prescription of prescriptionsHook.prescriptions) {
          const prescriptionData = {
            medication_id: prescription.medication_id,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            duration: prescription.duration,
            instructions: prescription.instructions,
            quantity: prescription.quantity,
            via_administracion: prescription.via_administracion
          };
          
          try {
            console.log('💊 Prescription data to send:', prescriptionData);
            await prescriptionsHook.createPrescription(prescriptionData, String(createdConsultation.id));
          } catch (error) {
            console.error('❌ Error saving prescription:', error);
            console.error('❌ Prescription data that failed:', prescriptionData);
            // Continue with other prescriptions even if one fails
          }
        }
        
        // Refresh prescriptions to show the newly created ones
        await prescriptionsHook.fetchPrescriptions(String(createdConsultation.id));
        
        // Clear temporary prescriptions after saving
        prescriptionsHook.clearTemporaryPrescriptions();
      } else {
        console.log('💊 No prescriptions to save or consultation not created');
        console.log('💊 Prescriptions count:', prescriptionsHook.prescriptions.length);
        console.log('💊 Consultation ID:', createdConsultation?.id);
      }
      
      // Mostrar notificación de éxito según el tipo de operación
      if (isEditing) {
        showSuccess(
          'Consulta actualizada exitosamente',
          '¡Edición completada!'
        );
      } else {
        showSuccess(
          'Consulta creada exitosamente',
          '¡Creación completada!'
        );
      }
      
      // Cerrar el diálogo después de un breve delay para que el usuario vea la notificación
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setError(err.message || 'Error al guardar consulta');
      showError(
        err.message || 'Error al guardar consulta',
        'Error en la operación'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Don't clear temporary studies when closing - they should persist
    // until a new consultation dialog is opened
    onClose();
  };

  // Clinical studies handlers
  const handleAddStudy = () => {
    
    // Allow adding studies even without a selected patient
    // Use temp_patient ID when no patient is selected
    const patientId = selectedPatient?.id || 'temp_patient';
    const consultationId = isEditing ? String(consultation.id) : 'temp_consultation';
    const doctorName = doctorProfile?.full_name || `${doctorProfile?.title || 'Dr.'} Usuario Sistema`;
    
    clinicalStudiesHook.openAddDialog(
      consultationId,
      patientId.toString(),
      doctorName
    );
    
  };
  const handleEditStudy = (study: ClinicalStudy) => {
    clinicalStudiesHook.openEditDialog(study);
  };

  const handleDeleteStudy = async (studyId: string) => {
    try {
      // Check if it's a temporary study (starts with 'temp_')
      if (studyId.startsWith('temp_')) {
        // For temporary studies, remove from both formData and hook
        setFormData(prev => ({
          ...prev,
          clinical_studies: (prev.clinical_studies || []).filter(study => study.id !== studyId)
        }));
        // Also remove from hook's studies
        clinicalStudiesHook.deleteStudy(studyId);
      } else {
        // For saved studies, delete from backend
        await clinicalStudiesHook.deleteStudy(studyId);
      }
    } catch (error) {
      console.error('Error deleting clinical study:', error);
      setError('Error al eliminar el estudio clínico');
    }
  };

  // Diagnosis handlers
  const handleAddPrimaryDiagnosis = () => {
    primaryDiagnosesHook.openAddDialog();
  };

  const handleAddSecondaryDiagnosis = () => {
    secondaryDiagnosesHook.openAddDialog();
  };

  const handleRemovePrimaryDiagnosis = (diagnosisId: string) => {
    // console.log('🗑️ Removing primary diagnosis:', diagnosisId);
    primaryDiagnosesHook.removeDiagnosis(diagnosisId);
    
    // Update formData immediately by filtering out the removed diagnosis
    setFormData(prev => ({
      ...prev,
      primary_diagnoses: prev.primary_diagnoses.filter(d => d.id !== diagnosisId),
      // Clear the text field when diagnosis is removed
      primary_diagnosis: ''
    }));
  };

  const handleRemoveSecondaryDiagnosis = (diagnosisId: string) => {
    // console.log('🗑️ Removing secondary diagnosis:', diagnosisId);
    secondaryDiagnosesHook.removeDiagnosis(diagnosisId);
    
    // Update formData immediately by filtering out the removed diagnosis
    setFormData(prev => ({
      ...prev,
      secondary_diagnoses_list: prev.secondary_diagnoses_list.filter(d => d.id !== diagnosisId),
      // Clear the text field when diagnosis is removed
      secondary_diagnoses: ''
    }));
  };

  const handleAddPrimaryDiagnosisFromDialog = (diagnosis: DiagnosisCatalog) => {
    // // console.log('🔍 Adding primary diagnosis:', diagnosis);
    primaryDiagnosesHook.addDiagnosis(diagnosis);
    
    // Update formData immediately
    setFormData(prev => ({
      ...prev,
      primary_diagnoses: [...prev.primary_diagnoses, diagnosis],
      // Auto-fill the text field with the diagnosis name
      primary_diagnosis: diagnosis.name
    }));
  };

  const handleAddSecondaryDiagnosisFromDialog = (diagnosis: DiagnosisCatalog) => {
    // // console.log('🔍 Adding secondary diagnosis:', diagnosis);
    secondaryDiagnosesHook.addDiagnosis(diagnosis);
    
    // Update formData immediately
    setFormData(prev => ({
      ...prev,
      secondary_diagnoses_list: [...prev.secondary_diagnoses_list, diagnosis],
      // Auto-fill the text field with the diagnosis name
      secondary_diagnoses: diagnosis.name
    }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Consulta' : 'Nueva Consulta'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
          <Box 
            ref={errorRef}
            data-testid="error-message"
            sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: 'error.main', 
              borderRadius: 1,
              backgroundColor: '#d32f2f !important' // Force red background
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {error}
            </Typography>
          </Box>
        )}
        
        <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Appointment Selection - Always show for new consultations */}
          {!consultation && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon sx={{ fontSize: 20 }} />
                Seleccionar Cita
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                </Typography>
              
              {availableAppointments.length === 0 ? (
                <Box sx={{ 
                  border: '1px dashed', 
                  borderColor: 'grey.300', 
                  borderRadius: 1, 
                  p: 3, 
                  textAlign: 'center',
                  bgcolor: 'grey.50'
                }}>
                  <CalendarIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No hay citas programadas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Para crear una nueva consulta, primero debe programar una cita
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CalendarIcon />}
                    onClick={() => {
                      // Close consultation dialog and open appointment dialog
                      onClose();
                      // Trigger appointment dialog opening
                      if (onNewAppointment) {
                        onNewAppointment();
                      }
                    }}
                    sx={{ mt: 1 }}
                  >
                    Crear Nueva Cita
                  </Button>
                </Box>
              ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>Citas Programadas</InputLabel>
                <Select
                  value={formData.appointment_id || ''}
                  onChange={(e: any) => {
                    const appointmentId = e.target.value;
                    const appointment = (availableAppointments || []).find((apt: any) => apt.id.toString() === appointmentId);
                    handleAppointmentChange(appointment);
                  }}
                  label="Citas Programadas"
                >
                  {(availableAppointments || []).map((appointment: any) => {
                    // Use patient information from the appointment object (comes from backend)
                    const patient = appointment.patient;
                    
                    const appointmentDate = parseBackendDate(appointment.appointment_date).toLocaleDateString('es-ES', {
                      timeZone: 'America/Mexico_City'
                    });
                    const appointmentTime = parseBackendDate(appointment.appointment_date).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'America/Mexico_City'
                    });
                    // Get consultation type - normalize display
                    const getConsultationTypeDisplay = (type: string) => {
                      switch (type) {
                        case 'primera vez':
                        case 'first_visit':
                        case 'Primera vez':
                          return 'Primera vez';
                        case 'seguimiento':
                        case 'follow_up':
                        case 'Seguimiento':
                          return 'Seguimiento';
                        default:
                          return type || 'No especificado';
                      }
                    };
                    
                    const consultationType = getConsultationTypeDisplay(appointment.consultation_type);
                    
                    // Use patient_name from backend or fallback to patient object
                    const patientName = appointment.patient_name || 
                                      (patient ? `${patient.first_name || ''} ${patient.paternal_surname || ''}`.trim() : 'Paciente no encontrado');
                    
                    return (
                      <MenuItem key={appointment.id} value={appointment.id.toString()}>
                        {patientName} - {appointmentDate} {appointmentTime} - {consultationType}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
                )}
              </Box>
          )}


          {/* Patient Data Section - Show only when patient is selected (existing patients) */}
          {selectedPatient && patientEditData && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon sx={{ fontSize: 20 }} />
                Datos del Paciente (Editable)
              </Typography>
              
              <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                {/* Basic Patient Information - Always shown */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 20 }} />
                    Información Básica
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Nombre"
                      value={getPatientData('first_name')}
                      onChange={(e: any) => handlePatientDataChangeWrapper('first_name', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Apellido Paterno"
                      value={getPatientData('paternal_surname')}
                      onChange={(e: any) => handlePatientDataChangeWrapper('paternal_surname', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Apellido Materno"
                      value={getPatientData('maternal_surname')}
                      onChange={(e: any) => handlePatientDataChangeWrapper('maternal_surname', e.target.value)}
                      size="small"
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <DatePicker
                        label="Fecha de Nacimiento - opcional"
                        value={getPatientData('birth_date') ? new Date(getPatientData('birth_date')) : null}
                        onChange={(newValue: any) => {
                          const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                          handlePatientDataChangeWrapper('birth_date', dateStr);
                        }}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true
                          }
                        }}
                      />
                    </LocalizationProvider>
                    <FormControl size="small" fullWidth required>
                      <InputLabel>Género *</InputLabel>
                      <Select
                        value={getPatientData('gender')}
                        onChange={(e: any) => handlePatientDataChangeWrapper('gender', e.target.value)}
                        label="Género *"
                        required
                      >
                        <MenuItem value="Masculino">Masculino</MenuItem>
                        <MenuItem value="Femenino">Femenino</MenuItem>
                        <MenuItem value="Otro">Otro</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Teléfono"
                      value={getPatientData('primary_phone')}
                      onChange={(e: any) => handlePatientDataChangeWrapper('primary_phone', e.target.value)}
                      size="small"
                      required
                    />
                  </Box>
                </Box>

                {/* Show Advanced Data Button and Previous Consultations Button - For existing patients */}
                {!showAdvancedPatientData && (
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setShowAdvancedPatientData(true)}
                      startIcon={<EditIcon />}
                      sx={{ minWidth: 200 }}
                    >
                      Ver Datos Avanzados
                    </Button>
                    {shouldShowPreviousConsultationsButton() && (
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleViewPreviousConsultations}
                        startIcon={<HospitalIcon />}
                        sx={{ minWidth: 200 }}
                      >
                        Ver Consultas Previas
                      </Button>
                    )}
                  </Box>
                )}

                {/* Advanced Patient Data - Show when requested or for existing patients */}
                {(!shouldShowOnlyBasicPatientData()) && (
                  <>
                    <Divider sx={{ my: 3 }} />

                    {/* Contact Information Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 20 }} />
                    Información de Contacto
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Teléfono"
                      value={patientEditData.primary_phone || ''}
                      onChange={(e: any) => handlePatientDataChange('primary_phone', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={patientEditData.email || ''}
                      onChange={(e: any) => handlePatientDataChange('email', e.target.value)}
                      size="small"
                      helperText={patientEditData.email && patientEditData.email !== '' && !patientEditData.email.includes('@') ? 'El email debe tener un formato válido' : ''}
                      error={patientEditData.email && patientEditData.email !== '' && !patientEditData.email.includes('@')}
                    />
                    <TextField
                      label="Dirección"
                      value={patientEditData.home_address || ''}
                      onChange={(e: any) => handlePatientDataChange('home_address', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    <TextField
                      label="Ciudad"
                      value={patientEditData.address_city || ''}
                      onChange={(e: any) => handlePatientDataChange('address_city', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Código Postal"
                      value={patientEditData.address_postal_code || ''}
                      onChange={(e: any) => handlePatientDataChange('address_postal_code', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 5 }}
                      helperText="Opcional"
                    />
                    <FormControl size="small">
                      <InputLabel>País</InputLabel>
                      <Select
                        value={patientEditData.address_country_id || ''}
                        onChange={(e: any) => handleCountryChange('address_country_id', e.target.value as string)}
                        label="País"
                      >
                        {(countries || []).map((country: any) => (
                          <MenuItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small">
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={patientEditData.address_state_id || ''}
                        onChange={(e: any) => handlePatientDataChange('address_state_id', e.target.value)}
                        label="Estado"
                        disabled={!patientEditData.address_country_id}
                      >
                        {(states || []).map((state: any) => (
                          <MenuItem key={state.id} value={state.id.toString()}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Additional Information Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BadgeIcon sx={{ fontSize: 20 }} />
                    Información Adicional
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="CURP"
                      value={patientEditData.curp || ''}
                      onChange={(e: any) => handlePatientDataChange('curp', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 18 }}
                      helperText={patientEditData.curp && patientEditData.curp.length !== 18 ? 'El CURP debe tener exactamente 18 caracteres' : ''}
                      error={patientEditData.curp && patientEditData.curp.length !== 18}
                    />
                    <TextField
                      label="RFC"
                      value={patientEditData.rfc || ''}
                      onChange={(e: any) => handlePatientDataChange('rfc', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 13 }}
                      helperText={patientEditData.rfc && patientEditData.rfc.length < 10 ? 'El RFC debe tener al menos 10 caracteres' : ''}
                      error={patientEditData.rfc && patientEditData.rfc.length < 10}
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel>Estado Civil</InputLabel>
                      <Select
                        value={patientEditData.civil_status || ''}
                        onChange={(e: any) => handlePatientDataChange('civil_status', e.target.value)}
                        label="Estado Civil"
                      >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        <MenuItem value="single">Soltero(a)</MenuItem>
                        <MenuItem value="married">Casado(a)</MenuItem>
                        <MenuItem value="divorced">Divorciado(a)</MenuItem>
                        <MenuItem value="widowed">Viudo(a)</MenuItem>
                        <MenuItem value="free_union">Unión libre</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Birth Information Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 20 }} />
                    Información de Nacimiento
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Ciudad de Nacimiento"
                      value={patientEditData.birth_city || ''}
                      onChange={(e: any) => handlePatientDataChange('birth_city', e.target.value)}
                      size="small"
                    />
                    <FormControl size="small">
                      <InputLabel>País de Nacimiento</InputLabel>
                      <Select
                        value={patientEditData.birth_country_id || ''}
                        onChange={(e: any) => handleCountryChange('birth_country_id', e.target.value as string)}
                        label="País de Nacimiento"
                      >
                        {(countries || []).map((country: any) => (
                          <MenuItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small">
                      <InputLabel>Estado de Nacimiento</InputLabel>
                      <Select
                        value={patientEditData.birth_state_id || ''}
                        onChange={(e: any) => handlePatientDataChange('birth_state_id', e.target.value)}
                        label="Estado de Nacimiento"
                        disabled={!patientEditData.birth_country_id}
                      >
                        {(birthStates || []).map((state: any) => (
                          <MenuItem key={state.id} value={state.id.toString()}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Emergency Contact Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 20 }} />
                    Contacto de Emergencia
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Nombre del Contacto"
                      value={patientEditData.emergency_contact_name || ''}
                      onChange={(e: any) => handlePatientDataChange('emergency_contact_name', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Teléfono del Contacto"
                      value={patientEditData.emergency_contact_phone || ''}
                      onChange={(e: any) => handlePatientDataChange('emergency_contact_phone', e.target.value)}
                      size="small"
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel>Relación con el Paciente</InputLabel>
                      <Select
                        value={patientEditData.emergency_contact_relationship || ''}
                        onChange={(e: any) => handlePatientDataChange('emergency_contact_relationship', e.target.value)}
                        label="Relación con el Paciente"
                        sx={{ gridColumn: '1 / -1' }}
                      >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        {(emergencyRelationships || []).map((relationship: any) => (
                          <MenuItem key={relationship.code} value={relationship.code}>
                            {relationship.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Medical Information Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BadgeIcon sx={{ fontSize: 20 }} />
                    Información Médica
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Proveedor de Seguro"
                      value={patientEditData.insurance_provider || ''}
                      onChange={(e: any) => handlePatientDataChange('insurance_provider', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Código de Seguro"
                      value={patientEditData.insurance_number || ''}
                      onChange={(e: any) => handlePatientDataChange('insurance_number', e.target.value)}
                      size="small"
                      inputProps={{ 
                        autoComplete: 'new-password',
                        'data-form-type': 'other',
                        'data-lpignore': 'true',
                        'data-1p-ignore': 'true',
                        'data-bwignore': 'true',
                        'data-autofill': 'off',
                        'autocapitalize': 'off',
                        'autocorrect': 'off',
                        'spellcheck': 'false',
                        'name': 'medical_insurance_code',
                        'id': 'medical_insurance_code',
                        'type': 'text',
                        'role': 'textbox',
                        'aria-label': 'Código de seguro médico'
                      }}
                    />
                  </Box>
                </Box>
                  </>
                )}
              </Paper>
            </Box>
          )}

          {/* Date */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              Fecha de Consulta
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha"
                value={formData.date ? new Date(formData.date) : null}
                maxDate={new Date()}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Box>

          {/* Chief Complaint */}
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
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
              required
              error={!!error && !formData.chief_complaint.trim()}
              helperText={error && !formData.chief_complaint.trim() ? 'Campo requerido' : ''}
            />
          </Box>

          {/* Previous Clinical Studies Section - Show when patient is selected */}
          {selectedPatient && patientPreviousStudies.length > 0 && (
            <Box>
              <Divider sx={{ my: 3 }}>
                <Chip icon={<ScienceIcon />} label="Estudios Clínicos Previos del Paciente" color="info" />
              </Divider>
              
              {loadingPreviousStudies ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        {patientPreviousStudies.map((study) => {
                          return (
                    <Card key={study.id} variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {study.study_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {study.study_type}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={study.status === 'pending' ? 'Pendiente' : study.status === 'completed' ? 'Completado' : study.status}
                            color={study.status === 'completed' ? 'success' : 'warning'}
                          />
                        </Box>
                        
                        {study.study_description && (
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {study.study_description}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Solicitado: {new Date(study.ordered_date).toLocaleDateString('es-MX')}
                          </Typography>
                          {study.results_date && (
                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
                              Resultados cargados: {(() => {
                                // Parse the date as UTC and convert to Mexico City time
                                const rawDate = study.results_date;
                                let date;
                                try {
                                  if (rawDate.includes('T')) {
                                    // It's a datetime string like "2025-10-23T07:57:33.560675"
                                    // Treat this as UTC time and convert to Mexico time
                                    const [datePart, timePart] = rawDate.split('T');
                                    const [time, microseconds] = timePart.split('.');
                                    const [hours, minutes, seconds] = time.split(':');
                                    
                                    // Create date as UTC
                                    const utcString = `${datePart}T${hours}:${minutes}:${seconds}Z`;
                                    date = new Date(utcString);
                                  } else {
                                    // Fallback to original parsing
                                    date = new Date(rawDate);
                                  }
                                  
                                  if (isNaN(date.getTime())) {
                                    return 'Fecha inválida';
                                  }
                                  
                                  // Convert to Mexico City timezone
                                  const formatted = date.toLocaleString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'America/Mexico_City'
                                  });
                                  
                                  return formatted;
                                } catch (error) {
                                  return 'Error al mostrar fecha';
                                }
                              })()}
                            </Typography>
                          )}
                          
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                            {study.status === 'pending' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  component="label"
                                  startIcon={<UploadIcon />}
                                >
                                  Cargar Archivo
                                  <input
                                    type="file"
                                    hidden
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleUploadStudyFile(study.id, file);
                                      }
                                    }}
                                  />
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleUpdateStudyStatus(study.id, 'completed')}
                                >
                                  Marcar Completado
                                </Button>
                              </>
                            )}
                            
                            {study.file_path && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<ViewIcon />}
                                  onClick={() => handleViewStudyFile(study.id)}
                                >
                                  Ver Archivo
                                </Button>
                              </>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                          );
                        })}
                </Box>
              )}
            </Box>
          )}

          {/* First-time consultation fields - shown conditionally */}
          {(() => {
            const shouldShow = shouldShowFirstTimeFields();
            return shouldShow;
          })() && (
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Describa los antecedentes familiares relevantes del paciente..."
                />
              </Box>

              {/* Personal Pathological History */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HospitalIcon2 sx={{ fontSize: 20 }} />
                  Antecedentes Patológicos
                </Typography>
                <TextField
                  name="personal_pathological_history"
                  label="Antecedentes patológicos"
                  value={formData.personal_pathological_history}
                  onChange={handleChange}
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
                  onChange={handleChange}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Describa los antecedentes no patológicos del paciente (hábitos, alimentación, ejercicio, etc.)..."
                />
              </Box>
            </>
          )}

          {/* Vital Signs Section - Always show */}
          <VitalSignsSection
            consultationId={isEditing && consultation?.id ? String(consultation.id) : "temp_consultation"}
            patientId={selectedPatient?.id || 0}
            vitalSigns={vitalSignsHook.getAllVitalSigns() || []}
            isLoading={vitalSignsHook.isLoading}
            onAddVitalSign={vitalSignsHook.openAddDialog}
            onEditVitalSign={vitalSignsHook.openEditDialog}
            onDeleteVitalSign={(vitalSignId) => {
              if (isEditing && consultation?.id) {
                vitalSignsHook.deleteVitalSign(String(consultation.id), vitalSignId);
              } else {
                // For temporary vital signs, delete specific vital sign
                vitalSignsHook.deleteVitalSign("temp_consultation", vitalSignId);
              }
            }}
          />

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
              onChange={handleChange}
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
              value={formData.laboratory_results}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Registre los resultados de análisis de laboratorio que el paciente trajo para la consulta..."
              sx={{ mb: 2 }}
            />
          </Box>

          {/* Structured Diagnoses */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon sx={{ fontSize: 20 }} />
              Diagnósticos (CIE-10)
            </Typography>
            
            {/* Primary Diagnoses */}
        <Box sx={{ mb: 3 }}>
          <DiagnosisSection
            diagnoses={primaryDiagnosesHook.diagnoses}
            onAddDiagnosis={handleAddPrimaryDiagnosis}
            onRemoveDiagnosis={handleRemovePrimaryDiagnosis}
            title="Diagnósticos Principales"
            maxSelections={1}
            showAddButton={true}
            isLoading={loading}
            error={primaryDiagnosesHook.error}
          />
        </Box>
            <TextField
              name="primary_diagnosis"
                label="Diagnóstico principal (texto)"
              value={formData.primary_diagnosis}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
                sx={{ mb: 1 }}
              />
            <Divider sx={{ my: 2 }} />

            {/* Secondary Diagnoses */}
        <Box sx={{ mb: 2 }}>
          <DiagnosisSection
            diagnoses={secondaryDiagnosesHook.diagnoses}
            onAddDiagnosis={handleAddSecondaryDiagnosis}
            onRemoveDiagnosis={handleRemoveSecondaryDiagnosis}
            title="Diagnósticos Secundarios"
            maxSelections={1}
            showAddButton={true}
            isLoading={loading}
            error={secondaryDiagnosesHook.error}
          />
        </Box>

            {/* Legacy text fields for backward compatibility */}
              <TextField
                name="secondary_diagnoses"
                label="Diagnósticos secundarios (texto)"
                value={formData.secondary_diagnoses}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>

          {/* Prescribed Medications Section - Replaced with structured prescriptions */}
          <PrescriptionsSection
            consultationId={isEditing && consultation?.id ? String(consultation.id) : "temp_consultation"}
            prescriptions={prescriptionsHook.prescriptions}
            isLoading={prescriptionsHook.isLoading}
            onAddPrescription={prescriptionsHook.openAddDialog}
            onEditPrescription={prescriptionsHook.openEditDialog}
            onDeletePrescription={(prescriptionId) => {
              if (isEditing && consultation?.id) {
                prescriptionsHook.deletePrescription(prescriptionId, String(consultation.id));
              } else {
                // For temporary prescriptions, remove from temporary list
                prescriptionsHook.deletePrescription(prescriptionId, "temp_consultation");
              }
            }}
          />

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
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Follow-up Instructions */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              Instrucciones de Seguimiento
            </Typography>
            <TextField
              name="follow_up_instructions"
              label="Instrucciones de seguimiento"
              value={formData.follow_up_instructions}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </Box>

        {/* Clinical Studies Section - Always show */}
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          
          <ClinicalStudiesSection
            consultationId={isEditing ? String(consultation.id) : "temp_consultation"}
            patientId={selectedPatient?.id || "temp_patient"}
            studies={clinicalStudiesHook.studies}
            isLoading={clinicalStudiesHook.isLoading}
            onAddStudy={handleAddStudy}
            onEditStudy={handleEditStudy}
            onRemoveStudy={handleDeleteStudy}
            onViewFile={clinicalStudiesHook.viewFile}
            onDownloadFile={clinicalStudiesHook.downloadFile}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 2 }}>
        {/* Print buttons - show when we have consultation data or are editing */}
        {((isEditing && consultation) || consultation) && (
          <Box sx={{ width: '100%' }}>
            <PrintButtons
              patient={{
                id: selectedPatient?.id || 0,
                firstName: selectedPatient?.first_name || '',
                lastName: selectedPatient?.paternal_surname || '',
                maternalSurname: selectedPatient?.maternal_surname || '',
                dateOfBirth: selectedPatient?.birth_date || undefined,
                gender: selectedPatient?.gender || undefined,
                phone: selectedPatient?.primary_phone || undefined,
                email: selectedPatient?.email || undefined,
                address: selectedPatient?.home_address || undefined,
                city: selectedPatient?.address_city || undefined,
                state: selectedPatient?.address_state || undefined,
                country: selectedPatient?.address_country || undefined
              }}
              doctor={{
                id: doctorProfile?.id || 0,
                firstName: doctorProfile?.first_name || `${doctorProfile?.title || 'Dr.'}`,
                lastName: doctorProfile?.paternal_surname || 'Usuario',
                maternalSurname: doctorProfile?.maternal_surname || '',
                title: doctorProfile?.title || 'Médico',
                specialty: doctorProfile?.specialty_name || 'No especificada',
                license: doctorProfile?.professional_license || 'No especificada',
                university: doctorProfile?.university || 'No especificada',
                phone: appointmentOffice?.phone || doctorProfile?.phone || 'No especificado',
                email: doctorProfile?.email || 'No especificado',
                offices: appointmentOffice ? [{
                  id: appointmentOffice.id,
                  name: appointmentOffice.name,
                  address: appointmentOffice.address,
                  city: appointmentOffice.city,
                  state: appointmentOffice.state_name,
                  country: appointmentOffice.country_name,
                  phone: appointmentOffice.phone,
                  maps_url: appointmentOffice.maps_url,
                  virtual_url: appointmentOffice.virtual_url,
                  is_active: appointmentOffice.is_active,
                  is_virtual: appointmentOffice.is_virtual,
                  timezone: appointmentOffice.timezone
                }] : (doctorProfile?.offices && doctorProfile.offices.length > 0 ? doctorProfile.offices : [])
              }}
              consultation={{
                id: consultation.id,
                date: consultation.date || formData.date,
                time: consultation.time || '10:00',
                type: consultation.consultation_type || 'Seguimiento',
                reason: consultation.chief_complaint || '',
                diagnosis: (consultation.primary_diagnosis && consultation.primary_diagnosis.trim() !== '') 
                  ? consultation.primary_diagnosis 
                  : (formData.primary_diagnosis && formData.primary_diagnosis.trim() !== '') 
                    ? formData.primary_diagnosis 
                    : 'No especificado',
                notes: consultation.notes || ''
              }}
              medications={(prescriptionsHook.prescriptions || []).map(prescription => ({
                name: prescription.medication_name,
                dosage: prescription.dosage,
                frequency: prescription.frequency,
                duration: prescription.duration,
                instructions: prescription.instructions || '',
                quantity: prescription.quantity || 0,
                via_administracion: prescription.via_administracion || undefined
              }))}
              studies={(clinicalStudiesHook.studies || []).map(study => ({
                name: study.study_name,
                type: study.study_type,
                category: study.study_type, // Using study_type as category
                description: study.study_description || 'Sin descripción',
                instructions: study.study_description || 'Seguir indicaciones del laboratorio',
                urgency: study.urgency || 'Rutina'
              }))}
              variant="outlined"
              size="small"
              direction="row"
              spacing={1}
              showDivider={true}
            />
          </Box>
        )}
        
        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar Consulta' : 'Crear Consulta')}
        </Button>
        </Box>
      </DialogActions>

      {/* Clinical Study Dialog with Catalog */}
      <ClinicalStudyDialogWithCatalog
        open={clinicalStudiesHook.clinicalStudyDialogOpen}
        onClose={clinicalStudiesHook.closeDialog}
        onSubmit={clinicalStudiesHook.submitForm}
        formData={clinicalStudiesHook.clinicalStudyFormData}
        onFormDataChange={clinicalStudiesHook.updateFormData}
        isEditing={clinicalStudiesHook.isEditingClinicalStudy}
        isSubmitting={clinicalStudiesHook.isSubmitting}
        error={clinicalStudiesHook.error}
        specialty={doctorProfile?.specialty}
        diagnosis={formData.primary_diagnosis}
      />

      {/* Vital Signs Selection Dialog */}
      <Dialog open={vitalSignsHook.vitalSignDialogOpen && !vitalSignsHook.isEditingVitalSign} onClose={vitalSignsHook.closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>Seleccionar Signo Vital</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecciona el tipo de signo vital que deseas agregar:
          </Typography>
          {(() => {
            // Get all available vital signs with defensive check
            const allAvailableVitalSigns = (vitalSignsHook.availableVitalSigns || []);
            
            // Get existing vital signs for this consultation with defensive check
            const existingVitalSigns = (vitalSignsHook.getAllVitalSigns() || []);
            
            // Filter out vital signs that are already registered
            const filteredVitalSigns = allAvailableVitalSigns.filter(vitalSign => {
              return !existingVitalSigns.some(existing => 
                existing.vital_sign_id === vitalSign.id
              );
            });


            if (filteredVitalSigns.length === 0) {
              return (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 2,
                  border: '1px dashed #ccc'
                }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    ✅ Todos los signos vitales registrados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ya has agregado todos los signos vitales disponibles para esta consulta.
                  </Typography>
                </Box>
              );
            }

            return (
              <Grid container spacing={1}>
                {filteredVitalSigns.map((vitalSign) => {
              const getVitalSignIcon = (name: string) => {
                const lowerName = name.toLowerCase();
                if (lowerName.includes('cardíaca') || lowerName.includes('cardiac')) return <HeartIcon sx={{ color: '#f44336' }} />;
                if (lowerName.includes('temperatura')) return <ThermostatIcon sx={{ color: '#ff9800' }} />;
                if (lowerName.includes('peso')) return <ScaleIcon sx={{ color: '#4caf50' }} />;
                if (lowerName.includes('estatura') || lowerName.includes('altura')) return <HeightIcon sx={{ color: '#2196f3' }} />;
                if (lowerName.includes('presión') || lowerName.includes('presion')) return <MonitorHeartIcon sx={{ color: '#9c27b0' }} />;
                return <HospitalIcon2 sx={{ color: '#607d8b' }} />;
              };

              const getVitalSignColor = (name: string) => {
                const lowerName = name.toLowerCase();
                if (lowerName.includes('cardíaca') || lowerName.includes('cardiac')) return '#f44336';
                if (lowerName.includes('temperatura')) return '#ff9800';
                if (lowerName.includes('peso')) return '#4caf50';
                if (lowerName.includes('estatura') || lowerName.includes('altura')) return '#2196f3';
                if (lowerName.includes('presión') || lowerName.includes('presion')) return '#9c27b0';
                return '#607d8b';
              };

              return (
                <Grid xs={12} sm={6} key={vitalSign.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      border: `2px solid ${getVitalSignColor(vitalSign.name)}`,
                      backgroundColor: `${getVitalSignColor(vitalSign.name)}08`,
                      '&:hover': { 
                        backgroundColor: `${getVitalSignColor(vitalSign.name)}15`,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 4px 12px ${getVitalSignColor(vitalSign.name)}40`
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onClick={() => {
                      vitalSignsHook.updateFormData({ 
                        vital_sign_id: vitalSign.id,
                        value: '',
                        unit: '',
                        notes: ''
                      });
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getVitalSignIcon(vitalSign.name)}
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {vitalSign.name}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
                })}
              </Grid>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={vitalSignsHook.closeDialog}>Cancelar</Button>
      </DialogActions>
    </Dialog>

      {/* Vital Sign Form Dialog */}
      <Dialog 
        open={vitalSignsHook.vitalSignDialogOpen && vitalSignsHook.vitalSignFormData.vital_sign_id > 0} 
        onClose={vitalSignsHook.closeDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {(() => {
              const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                vs => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
              );
              if (!selectedVitalSign) return <MonitorHeartIcon />;
              
              const lowerName = selectedVitalSign.name.toLowerCase();
              if (lowerName.includes('cardíaca') || lowerName.includes('cardiac')) return <HeartIcon sx={{ color: '#f44336' }} />;
              if (lowerName.includes('temperatura')) return <ThermostatIcon sx={{ color: '#ff9800' }} />;
              if (lowerName.includes('peso')) return <ScaleIcon sx={{ color: '#4caf50' }} />;
              if (lowerName.includes('estatura') || lowerName.includes('altura')) return <HeightIcon sx={{ color: '#2196f3' }} />;
              if (lowerName.includes('presión') || lowerName.includes('presion')) return <MonitorHeartIcon sx={{ color: '#9c27b0' }} />;
              return <HospitalIcon2 sx={{ color: '#607d8b' }} />;
            })()}
            {vitalSignsHook.isEditingVitalSign ? 'Editar Signo Vital' : 'Agregar Signo Vital'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Show selected vital sign name */}
            {(() => {
              const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                vs => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
              );
              if (selectedVitalSign) {
                return (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selectedVitalSign.name}
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}
            
            <Grid container spacing={2}>
              <Grid xs={12}>
                <TextField
                  label="Valor"
                  value={vitalSignsHook.vitalSignFormData.value}
                  onChange={(e) => vitalSignsHook.updateFormData({ value: e.target.value })}
                  fullWidth
                  required
                  placeholder="Ingresa el valor medido"
                  helperText={(() => {
                    const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                      vs => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
                    );
                    
                    if (selectedVitalSign && (selectedVitalSign.name.toLowerCase().includes('imc') || selectedVitalSign.name.toLowerCase().includes('índice de masa corporal') || selectedVitalSign.name.toLowerCase().includes('bmi'))) {
                      const allVitalSigns = vitalSignsHook.getAllVitalSigns() || [];
                      const weightSign = (allVitalSigns || []).find(vs => 
                        vs.vital_sign_name.toLowerCase().includes('peso')
                      );
                      const heightSign = (allVitalSigns || []).find(vs => 
                        vs.vital_sign_name.toLowerCase().includes('estatura') || 
                        vs.vital_sign_name.toLowerCase().includes('altura')
                      );
                      
                      if (weightSign && heightSign) {
                        const weight = parseFloat(weightSign.value);
                        const height = parseFloat(heightSign.value);
                        
                        if (!isNaN(weight) && !isNaN(height) && height > 0) {
                          return `Peso: ${weight} kg, Estatura: ${height} cm. Haz clic en "Calcular" para calcular el IMC.`;
                        } else {
                          return 'Agrega primero el peso y la estatura para calcular el IMC.';
                        }
                      } else {
                        return 'Agrega primero el peso y la estatura para calcular el IMC.';
                      }
                    }
                    return 'Ingresa el valor medido del signo vital';
                  })()}
                  InputProps={{
                    endAdornment: (() => {
                      const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                        vs => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
                      );
                      
                      // Check if this is BMI and if we have weight and height
                      if (selectedVitalSign && (selectedVitalSign.name.toLowerCase().includes('imc') || selectedVitalSign.name.toLowerCase().includes('índice de masa corporal') || selectedVitalSign.name.toLowerCase().includes('bmi'))) {
                        const allVitalSigns = vitalSignsHook.getAllVitalSigns() || [];
                        const weightSign = (allVitalSigns || []).find(vs => 
                          vs.vital_sign_name.toLowerCase().includes('peso')
                        );
                        const heightSign = (allVitalSigns || []).find(vs => 
                          vs.vital_sign_name.toLowerCase().includes('estatura') || 
                          vs.vital_sign_name.toLowerCase().includes('altura')
                        );
                        
                        if (weightSign && heightSign) {
                          const weight = parseFloat(weightSign.value);
                          const height = parseFloat(heightSign.value);
                          
                          if (!isNaN(weight) && !isNaN(height) && height > 0) {
                            const calculateBMI = () => {
                              const heightInMeters = height / 100; // Convert cm to meters
                              const bmi = weight / (heightInMeters * heightInMeters);
                              const bmiRounded = Math.round(bmi * 10) / 10; // Round to 1 decimal
                              vitalSignsHook.updateFormData({ value: bmiRounded.toString() });
                            };
                            
                            return (
                              <Button
                                size="small"
                                onClick={calculateBMI}
                                sx={{ 
                                  minWidth: 'auto',
                                  px: 1,
                                  fontSize: '0.75rem'
                                }}
                              >
                                Calcular
                              </Button>
                            );
                          }
                        }
                      }
                      return null;
                    })()
                  }}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  label="Unidad de medida"
                  value={vitalSignsHook.vitalSignFormData.unit}
                  onChange={(e) => vitalSignsHook.updateFormData({ unit: e.target.value })}
                  fullWidth
                  placeholder="Ej: cm, kg, mmHg, °C, bpm"
                  helperText="Especifica la unidad de medida del valor"
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  label="Notas adicionales (opcional)"
                  value={vitalSignsHook.vitalSignFormData.notes}
                  onChange={(e) => vitalSignsHook.updateFormData({ notes: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Observaciones o comentarios adicionales"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={vitalSignsHook.closeDialog}>Cancelar</Button>
          <Button 
            onClick={() => vitalSignsHook.submitForm(isEditing && consultation?.id ? String(consultation.id) : "temp_consultation")}
            variant="contained"
            disabled={vitalSignsHook.isSubmitting || !vitalSignsHook.vitalSignFormData.value}
          >
            {vitalSignsHook.isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prescription Dialog */}
      <PrescriptionDialog
        open={prescriptionsHook.prescriptionDialogOpen}
        onClose={prescriptionsHook.closeDialog}
        onSubmit={prescriptionsHook.submitForm}
        formData={prescriptionsHook.prescriptionFormData}
        onFormDataChange={prescriptionsHook.updateFormData}
        medications={prescriptionsHook.medications}
        onFetchMedications={prescriptionsHook.fetchMedications}
        onCreateMedication={prescriptionsHook.createMedication}
        isEditing={prescriptionsHook.isEditingPrescription}
        isSubmitting={prescriptionsHook.isSubmitting}
        error={prescriptionsHook.error}
        consultationId={isEditing && consultation?.id ? String(consultation.id) : "temp_consultation"}
      />

      {/* Primary Diagnosis Dialog */}
      <DiagnosisDialog
        open={primaryDiagnosesHook.diagnosisDialogOpen}
        onClose={primaryDiagnosesHook.closeDialog}
        onAddDiagnosis={handleAddPrimaryDiagnosisFromDialog}
        existingDiagnoses={primaryDiagnosesHook.diagnoses}
        title="Agregar Diagnóstico Principal"
        maxSelections={1}
      />

      {/* Secondary Diagnosis Dialog */}
      <DiagnosisDialog
        open={secondaryDiagnosesHook.diagnosisDialogOpen}
        onClose={secondaryDiagnosesHook.closeDialog}
        onAddDiagnosis={handleAddSecondaryDiagnosisFromDialog}
        existingDiagnoses={secondaryDiagnosesHook.diagnoses}
        title="Agregar Diagnóstico Secundario"
        maxSelections={1}
      />
    </Dialog>
  );
};

export default ConsultationDialog;
