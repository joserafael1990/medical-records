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
  WhatsApp as WhatsAppIcon
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
import { PrintButtons } from '../common/PrintButtons';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo } from '../../services/pdfService';
import { useToast } from '../common/ToastNotification';
import { disablePaymentDetection } from '../../utils/disablePaymentDetection';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
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
  appointments = []
}: ConsultationDialogProps) => {
  const isEditing = !!consultation;
  const { showSuccess, showError } = useToast();

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
      ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
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

  // New consultation flow states
  const [hasAppointment, setHasAppointment] = useState<boolean | null>(null);
  const [isNewPatient, setIsNewPatient] = useState<boolean | null>(null);
  const [showAdvancedPatientData, setShowAdvancedPatientData] = useState<boolean>(false);
  const [patientHasPreviousConsultations, setPatientHasPreviousConsultations] = useState<boolean>(false);
  const [patientPreviousStudies, setPatientPreviousStudies] = useState<ClinicalStudy[]>([]);
  const [loadingPreviousStudies, setLoadingPreviousStudies] = useState<boolean>(false);
  const [sendingWhatsAppStudy, setSendingWhatsAppStudy] = useState<string | null>(null);
  
  // Function to determine if only basic patient data should be shown
  const shouldShowOnlyBasicPatientData = (): boolean => {
    // Show only basic data if advanced data is not requested
    return !showAdvancedPatientData;
  };

  // Function to determine if "Ver consultas previas" button should be shown
  const shouldShowPreviousConsultationsButton = (): boolean => {
    // Show button if:
    // 1. Selected appointment is of type "Seguimiento" OR
    // 2. Patient is not new AND has at least one previous consultation OR
    // 3. Patient is selected (not new patient flow) AND has at least one previous consultation
    const isFollowUpAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'seguimiento' ||
      selectedAppointment.appointment_type === 'follow_up'
    );
    
    // Check if patient is selected (not in new patient flow)
    const isExistingPatientSelected = selectedPatient && isNewPatient !== true;
    
    console.log('🔍 shouldShowPreviousConsultationsButton - Debug:', {
      selectedPatient: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.paternal_surname}` : 'null',
      isNewPatient,
      patientHasPreviousConsultations,
      isFollowUpAppointment,
      isExistingPatientSelected,
      result: isFollowUpAppointment || (isExistingPatientSelected && patientHasPreviousConsultations)
    });
    
    return isFollowUpAppointment || (isExistingPatientSelected && patientHasPreviousConsultations);
  };

  // Helper function to get patient data for display
  const getPatientData = (field: string) => {
    if (isNewPatient === true) {
      return newPatientData[field as keyof typeof newPatientData] || '';
    }
    return patientEditData?.[field as keyof typeof patientEditData] || '';
  };

  // Helper function to handle patient data changes
  const handlePatientDataChangeWrapper = (field: string, value: any) => {
    if (isNewPatient === true) {
      handleNewPatientFieldChange(field, value);
    } else {
      handlePatientDataChange(field, value);
    }
  };

  // Function to determine if first-time consultation fields should be shown
  const shouldShowFirstTimeFields = (): boolean => {
    // Show fields if:
    // 1. Patient is new (for new consultations)
    // 2. OR if editing an existing consultation of type "Primera vez"
    // 3. OR if selected appointment is of type "Primera vez"
    const isNewPatientFlow = isNewPatient === true;
    const isEditingFirstTimeConsultation = consultation && consultation.consultation_type === 'Primera vez';
    const hasFirstTimeAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Primera vez' || 
      selectedAppointment.appointment_type === 'Primera vez' ||
      selectedAppointment.appointment_type === 'primera vez' ||
      selectedAppointment.appointment_type === 'first_visit'
    );
    const shouldShow = isNewPatientFlow || isEditingFirstTimeConsultation || hasFirstTimeAppointment;
    
    return shouldShow;
  };

  // Handle appointment selection change
  const handleHasAppointmentChange = (value: boolean) => {
    setHasAppointment(value);
    // Reset dependent states
    setIsNewPatient(null);
    setSelectedAppointment(null);
    setSelectedPatient(null);
    setNewPatientData({
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      birth_date: '',
      gender: '',
      primary_phone: ''
    });
  };

  // Handle new patient selection change
  const handleIsNewPatientChange = (value: boolean) => {
    setIsNewPatient(value);
    // Reset dependent states
    setSelectedPatient(null);
    setNewPatientData({
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      birth_date: '',
      gender: '',
      primary_phone: ''
    });
  };

  // Clinical studies management
  const clinicalStudiesHook = useClinicalStudies();

  // Vital signs management
  const vitalSignsHook = useVitalSigns();

  // Prescriptions management
  const prescriptionsHook = usePrescriptions();

  // State for inline patient creation
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    primary_phone: '',
    email: '',
    home_address: '',
    address_city: '',
    address_postal_code: '',
    address_country_id: '',
    address_state_id: '',
    curp: '',
    rfc: '',
    civil_status: '',
    birth_city: '',
    birth_country_id: '',
    birth_state_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    chronic_conditions: '',
    current_medications: '',
    insurance_provider: '',
    insurance_number: ''
  });

  useEffect(() => {
    if (open) {
      // Disable payment detection for insurance fields
      setTimeout(() => {
        disablePaymentDetection();
      }, 100);
      setError(null);
      setErrors({});
        // Reset consultation flow states for new consultations
        if (!consultation) {
          setFormData(initialFormData);
          setHasAppointment(null);
          setIsNewPatient(null);
          setSelectedAppointment(null);
          setSelectedPatient(null);
          setShowAdvancedPatientData(false);
          setNewPatientData({
            first_name: '',
            paternal_surname: '',
            maternal_surname: '',
            birth_date: '',
            gender: '',
            primary_phone: ''
          });
        }
      if (consultation) {
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
          const patient = patients.find((p: any) => p.id === consultation.patient_id);
          setSelectedPatient(patient || null);
        }

        // Load clinical studies, vital signs and prescriptions for existing consultation
        clinicalStudiesHook.fetchStudies(String(consultation.id));
        vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
        prescriptionsHook.fetchPrescriptions(String(consultation.id));
      } else {
        setFormData(initialFormData);
        setSelectedPatient(null);
        
        // Clear clinical studies, vital signs and prescriptions for new consultation
        clinicalStudiesHook.clearTemporaryStudies();
        vitalSignsHook.clearTemporaryVitalSigns();
        prescriptionsHook.clearTemporaryPrescriptions();
      }
    }
  }, [open, consultation, patients, doctorProfile]);

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
          const patientIds = appointments.map((apt: any) => apt.patient_id).filter((id: any) => id);
          
          // Get all patients to find the ones referenced in appointments
          const allPatients = await apiService.getPatients();
          const appointmentPatients = allPatients.filter((patient: any) => 
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
          // TODO: Load structured diagnoses from API when backend endpoint is available
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
    console.log('🔍 Checking previous consultations for patient ID:', patientId);
    try {
      // Get all consultations and filter by patient ID
      const response = await apiService.get('/api/consultations');
      const allConsultations = response.data || [];
      
      // Filter consultations for this specific patient
      const patientConsultations = allConsultations.filter((c: any) => c.patient_id === patientId);
      const hasPrevious = patientConsultations.length > 0;
      
      console.log('🔍 Previous consultations found:', patientConsultations.length, 'Has previous:', hasPrevious);
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
      // Reload previous studies
      if (selectedPatient) {
        await loadPatientPreviousStudies(selectedPatient.id);
      }
    } catch (error) {
      console.error('Error uploading study file:', error);
      showError('Error al cargar el archivo del estudio');
    }
  };

  // Handle send WhatsApp notification for study results
  const handleSendWhatsAppStudyResults = async (studyId: string) => {
    setSendingWhatsAppStudy(studyId);
    try {
      await apiService.sendWhatsAppStudyResults(Number(studyId));
      showSuccess('Notificación de resultados enviada por WhatsApp');
    } catch (error: any) {
      console.error('Error sending WhatsApp notification:', error);
      showError(error.response?.data?.detail || 'Error al enviar notificación por WhatsApp');
    } finally {
      setSendingWhatsAppStudy(null);
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
      const patient = appointment.patient || patients.find((p: any) => p.id === appointment.patient_id);
      
      if (patient) {
        setSelectedPatient(patient);
        setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: patient.id.toString(), appointment_id: appointment.id.toString() }));
        
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
      }
    } else {
      setSelectedPatient(null);
      setPatientEditData(null);
      setPatientHasPreviousConsultations(false);
      setPatientPreviousStudies([]);
      setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: '', appointment_id: '' }));
    }
  };

  // Handle new patient field changes
  const handleNewPatientFieldChange = (field: string, value: string) => {
    setNewPatientData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle country change for new patients
  const handleNewPatientCountryChange = async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    handleNewPatientFieldChange(field, countryId);
    
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
    }
  };

  // Filter appointments to show only non-cancelled ones
  const availableAppointments = appointments.filter((appointment: any) => 
    appointment.status !== 'cancelled' && appointment.status !== 'canceled'
  );

  const handleSubmit = async () => {
    setError(null);
    
    // Validation for new consultation flow
    if (!consultation) {
      // For new consultations, validate the flow
      if (hasAppointment === null) {
        setError('Por favor, selecciona si la consulta tiene previa cita');
        return;
      }
      
      if (hasAppointment === false && isNewPatient === null) {
        setError('Por favor, selecciona si el paciente es nuevo');
        return;
      }
      
      if (hasAppointment === false && isNewPatient === false && !selectedPatient) {
        setError('Por favor, selecciona un paciente existente');
        return;
      }
      
      if (hasAppointment === false && isNewPatient === true && (!newPatientData.first_name || !newPatientData.paternal_surname)) {
        setError('Por favor, completa los datos básicos del nuevo paciente (nombre y apellido paterno son requeridos)');
        return;
      }
    } else {
      // For editing existing consultations, use old validation
    if (!selectedPatient && (!newPatientData.first_name || !newPatientData.paternal_surname)) {
      setError('Por favor, selecciona un paciente existente o completa los datos básicos del nuevo paciente (nombre y apellido paterno son requeridos)');
      return;
      }
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      return;
    }

    // Create new patient if no patient is selected
    let finalPatientId = selectedPatient?.id;
    
    
    if (!selectedPatient && newPatientData.first_name && newPatientData.paternal_surname) {
      try {
        
        // Create new patient with all data from newPatientData
        const patientData: PatientFormData = {
          first_name: newPatientData.first_name,
          paternal_surname: newPatientData.paternal_surname,
          maternal_surname: newPatientData.maternal_surname || '',
          email: newPatientData.email || '',
          birth_date: newPatientData.birth_date || '',
          primary_phone: newPatientData.primary_phone || '',
          gender: newPatientData.gender || '',
          civil_status: newPatientData.civil_status || '',
          home_address: newPatientData.home_address || '',
          curp: newPatientData.curp || '',
          rfc: newPatientData.rfc || '',
          address_city: newPatientData.address_city || '',
          address_state_id: newPatientData.address_state_id || '',
          address_postal_code: newPatientData.address_postal_code || '',
          address_country_id: newPatientData.address_country_id || '',
          birth_city: newPatientData.birth_city || '',
          birth_state_id: newPatientData.birth_state_id || '',
          birth_country_id: newPatientData.birth_country_id || '',
          emergency_contact_name: newPatientData.emergency_contact_name || '',
          emergency_contact_phone: newPatientData.emergency_contact_phone || '',
          emergency_contact_relationship: newPatientData.emergency_contact_relationship || '',
          chronic_conditions: newPatientData.chronic_conditions || '',
          current_medications: newPatientData.current_medications || '',
          insurance_provider: newPatientData.insurance_provider || '',
          insurance_number: newPatientData.insurance_number || '',
          active: true,
          is_active: true
        };

        const newPatient = await apiService.createPatient(patientData);
        finalPatientId = newPatient.id;
      } catch (error) {
        console.error('Error creating patient:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al crear el nuevo paciente';
        setError(errorMessage);
        showError(errorMessage);
        return;
      }
    }

    // Update patient data if modified
    if (patientEditData && selectedPatient) {
      try {
        await apiService.updatePatient(selectedPatient.id, patientEditData);
      } catch (error) {
        console.error('Error updating patient data:', error);
        setError('Error al actualizar los datos del paciente');
        return;
      }
    }

    setLoading(true);
    try {
      // Determine consultation type based on new flow
      let consultationType = 'Seguimiento';
      
      if (!consultation) {
        // For new consultations
        if (hasAppointment === true) {
          // If has appointment, use appointment type
          consultationType = selectedAppointment?.consultation_type || 'Seguimiento';
        } else if (hasAppointment === false && isNewPatient === true) {
          // If no appointment and new patient, it's first time
          consultationType = 'Primera vez';
        } else if (hasAppointment === false && isNewPatient === false) {
          // If no appointment and existing patient, it's follow-up
          consultationType = 'Seguimiento';
        }
      } else {
        // For editing existing consultations, use old logic
        const isNewPatientEdit = !selectedPatient && newPatientData.first_name && newPatientData.paternal_surname;
        const hasFirstTimeAppointment = selectedAppointment && selectedAppointment.consultation_type === 'Primera vez';
        const hasSelectedPatient = selectedPatient !== null;
        
        consultationType = (isNewPatientEdit || hasFirstTimeAppointment || hasSelectedPatient) ? 'Primera vez' : 'Seguimiento';
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
      
      // Save clinical studies if any were added
      if (clinicalStudiesHook.studies.length > 0 && createdConsultation?.id) {
        console.log('🔬 Saving clinical studies for consultation:', createdConsultation.id);
        console.log('🔬 Studies to save:', clinicalStudiesHook.studies);
        
        for (const study of clinicalStudiesHook.studies) {
          const studyData = {
            ...study,
            consultation_id: createdConsultation.id,
            patient_id: finalPatientId
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
        
        // Refresh studies to show the newly created ones
        await clinicalStudiesHook.fetchStudies(String(createdConsultation.id));
      } else {
        console.log('🔬 No clinical studies to save or consultation not created');
        console.log('🔬 Studies count:', clinicalStudiesHook.studies.length);
        console.log('🔬 Consultation ID:', createdConsultation?.id);
      }

      // Always refresh studies after creating consultation to show any studies that were created
      if (createdConsultation?.id) {
        await clinicalStudiesHook.fetchStudies(String(createdConsultation.id));
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
    const doctorName = doctorProfile?.full_name || 'Dr. Usuario Sistema';
    
    clinicalStudiesHook.openAddDialog(
      consultationId,
      patientId,
      doctorName
    );
    
  };
  const handleEditStudy = (study: ClinicalStudy) => {
    clinicalStudiesHook.openEditDialog(study);
  };

  const handleDeleteStudy = async (studyId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este estudio clínico?')) {
      try {
        await clinicalStudiesHook.deleteStudy(studyId);
      } catch (error) {
        console.error('Error deleting clinical study:', error);
        setError('Error al eliminar el estudio clínico');
      }
    }
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
          
          {/* New Consultation Flow - Only show for new consultations */}
          {/* Skip initial questions if no patients exist */}
          {!consultation && patients.length > 0 && (
            <>
              {/* Question 1: ¿Consulta con previa cita? */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon sx={{ fontSize: 20 }} />
                  ¿Consulta con previa cita?
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                </Typography>
                <FormControl size="small" fullWidth>
                  <InputLabel>Seleccione una opción</InputLabel>
                  <Select
                    value={hasAppointment === true ? 'yes' : hasAppointment === false ? 'no' : ''}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      const hasAppointmentValue = value === 'yes';
                      handleHasAppointmentChange(hasAppointmentValue);
                    }}
                    label="Seleccione una opción"
                  >
                    <MenuItem value="yes">Sí</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Question 2: ¿Paciente nuevo? - Only show if hasAppointment is false */}
              {hasAppointment === false && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 20 }} />
                    ¿Paciente nuevo?
                    <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Seleccione una opción</InputLabel>
                    <Select
                      value={isNewPatient === true ? 'yes' : isNewPatient === false ? 'no' : ''}
                      onChange={(e: any) => {
                        const value = e.target.value;
                        const isNewPatientValue = value === 'yes';
                        handleIsNewPatientChange(isNewPatientValue);
                      }}
                      label="Seleccione una opción"
                    >
                      <MenuItem value="yes">Sí</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </>
          )}

          {/* Legacy Appointment Question removed - Not needed when editing existing consultations */}

          {/* Appointment Selection - Show for new consultations with appointment OR legacy editing */}
          {((!consultation && hasAppointment === true) || (consultation && formData.has_appointment)) && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon sx={{ fontSize: 20 }} />
                Seleccionar Cita
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>Citas Programadas</InputLabel>
                <Select
                  value={formData.appointment_id || ''}
                  onChange={(e: any) => {
                    const appointmentId = e.target.value;
                    const appointment = availableAppointments.find((apt: any) => apt.id.toString() === appointmentId);
                    handleAppointmentChange(appointment);
                  }}
                  label="Citas Programadas"
                >
                  {(availableAppointments || []).map((appointment: any) => {
                    // Use patient information from the appointment object (comes from backend)
                    const patient = appointment.patient;
                    
                    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
                    const appointmentTime = new Date(appointment.appointment_date).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
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
                    
                    const consultationType = getConsultationTypeDisplay(appointment.appointment_type);
                    
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
            </Box>
          )}

          {/* Patient Selection - Show for new consultations without appointment and existing patient OR legacy editing */}
          {((!consultation && hasAppointment === false && isNewPatient === false) || (consultation && !formData.has_appointment)) && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Paciente
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            
            {patients.length === 0 ? (
              <Box sx={{ 
                border: '1px dashed', 
                borderColor: 'grey.300', 
                borderRadius: 1, 
                p: 3, 
                textAlign: 'center',
                bgcolor: 'grey.50'
              }}>
                <PersonIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No hay pacientes registrados
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Para crear una nueva consulta, primero debe registrar un paciente
                </Typography>
                {onNewPatient && (
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={onNewPatient}
                    sx={{ mt: 1 }}
                  >
                    Crear Nuevo Paciente
                  </Button>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Autocomplete
                    options={patients}
                    getOptionLabel={(option: any) => formatPatientNameWithAge(option)}
                    value={selectedPatient}
                    onChange={(_: any, newValue: any) => handlePatientChange(newValue)}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Seleccionar Paciente"
                        required
                        error={!!error && !selectedPatient}
                        helperText={error && !selectedPatient ? 'Campo requerido' : ''}
                      />
                    )}
                    renderOption={(props: any, option: any) => (
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
                    loading={patients.length === 0}
                    loadingText="Cargando pacientes..."
                    noOptionsText="No se encontraron pacientes"
                  />
                </Box>
                
              </Box>
                )}
              </Box>
            )}

          {/* Inline New Patient Creation Form - Show when no patients exist OR for new consultations without appointment and new patient OR legacy editing */}
          {((!consultation && patients.length === 0) || (!consultation && hasAppointment === false && isNewPatient === true) || (consultation && !formData.has_appointment && !selectedPatient)) && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {patients.length === 0 ? 'Complete los datos básicos del nuevo paciente:' : 'O complete los datos para crear un nuevo paciente:'}
                </Typography>
              </Divider>
              
              <Box sx={{ bgcolor: 'primary.50', p: 3, borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="body2" color="primary.main" sx={{ mb: 2, fontWeight: 500 }}>
                  📝 Complete los datos básicos del nuevo paciente
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Nombre(s)"
                    value={newPatientData.first_name}
                    onChange={(e: any) => handleNewPatientFieldChange('first_name', e.target.value)}
                    size="small"
                    required
                    placeholder="Nombre(s) - obligatorio"
                  />
                  <TextField
                    label="Apellido Paterno"
                    value={newPatientData.paternal_surname}
                    onChange={(e: any) => handleNewPatientFieldChange('paternal_surname', e.target.value)}
                    size="small"
                    required
                    placeholder="Apellido Paterno - obligatorio"
                  />
                  <TextField
                    label="Apellido Materno"
                    value={newPatientData.maternal_surname}
                    onChange={(e: any) => handleNewPatientFieldChange('maternal_surname', e.target.value)}
                    size="small"
                    placeholder="Apellido Materno - opcional"
                  />
                  <TextField
                    label="Teléfono"
                    value={newPatientData.primary_phone}
                    onChange={(e: any) => handleNewPatientFieldChange('primary_phone', e.target.value)}
                    size="small"
                    required
                    placeholder="Teléfono - opcional"
                  />
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha de Nacimiento - opcional"
                      value={newPatientData.birth_date ? new Date(newPatientData.birth_date) : null}
                      onChange={(newValue: any) => {
                        const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                        handleNewPatientFieldChange('birth_date', dateStr);
                      }}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true,
                          placeholder: 'Fecha de Nacimiento - opcional'
                        }
                      }}
                    />
                  </LocalizationProvider>
                  <FormControl size="small" fullWidth required>
                    <InputLabel>Género *</InputLabel>
                    <Select
                      value={newPatientData.gender || ''}
                      onChange={(e: any) => handleNewPatientFieldChange('gender', e.target.value)}
                      label="Género *"
                      required
                    >
                      <MenuItem value="Masculino">Masculino</MenuItem>
                      <MenuItem value="Femenino">Femenino</MenuItem>
                      <MenuItem value="Otro">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                {/* Show Advanced Data Button and Previous Consultations Button - For new patients */}
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

                {/* Advanced Patient Data - Show when requested for new patients */}
                {showAdvancedPatientData && (
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
                          value={newPatientData.primary_phone || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('primary_phone', e.target.value)}
                          size="small"
                          required
                        />
                        <TextField
                          label="Email"
                          type="email"
                          value={newPatientData.email || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('email', e.target.value)}
                          size="small"
                          helperText={newPatientData.email && newPatientData.email !== '' && !newPatientData.email.includes('@') ? 'El email debe tener un formato válido' : ''}
                          error={newPatientData.email && newPatientData.email !== '' && !newPatientData.email.includes('@')}
                        />
                        <TextField
                          label="Dirección"
                          value={newPatientData.home_address || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('home_address', e.target.value)}
                          size="small"
                          fullWidth
                          sx={{ gridColumn: '1 / -1' }}
                        />
                        <TextField
                          label="Ciudad"
                          value={newPatientData.address_city || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('address_city', e.target.value)}
                          size="small"
                        />
                        <TextField
                          label="Código Postal"
                          value={newPatientData.address_postal_code || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('address_postal_code', e.target.value)}
                          size="small"
                          inputProps={{ maxLength: 5 }}
                          helperText="Opcional"
                        />
                        <FormControl size="small">
                          <InputLabel>País</InputLabel>
                          <Select
                            value={newPatientData.address_country_id || ''}
                            onChange={(e: any) => handleNewPatientCountryChange('address_country_id', e.target.value as string)}
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
                            value={newPatientData.address_state_id || ''}
                            onChange={(e: any) => handleNewPatientFieldChange('address_state_id', e.target.value)}
                            label="Estado"
                            disabled={!newPatientData.address_country_id}
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
                          value={newPatientData.curp || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('curp', e.target.value)}
                          size="small"
                          inputProps={{ maxLength: 18 }}
                          helperText={newPatientData.curp && newPatientData.curp.length !== 18 ? 'El CURP debe tener exactamente 18 caracteres' : ''}
                          error={newPatientData.curp && newPatientData.curp.length !== 18}
                        />
                        <TextField
                          label="RFC"
                          value={newPatientData.rfc || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('rfc', e.target.value)}
                          size="small"
                          inputProps={{ maxLength: 13 }}
                          helperText={newPatientData.rfc && newPatientData.rfc.length < 10 ? 'El RFC debe tener al menos 10 caracteres' : ''}
                          error={newPatientData.rfc && newPatientData.rfc.length < 10}
                        />
                        <FormControl size="small" fullWidth>
                          <InputLabel>Estado Civil</InputLabel>
                          <Select
                            value={newPatientData.civil_status || ''}
                            onChange={(e: any) => handleNewPatientFieldChange('civil_status', e.target.value)}
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
                          value={newPatientData.birth_city || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('birth_city', e.target.value)}
                          size="small"
                        />
                        <FormControl size="small">
                          <InputLabel>País de Nacimiento</InputLabel>
                          <Select
                            value={newPatientData.birth_country_id || ''}
                            onChange={(e: any) => handleNewPatientCountryChange('birth_country_id', e.target.value as string)}
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
                            value={newPatientData.birth_state_id || ''}
                            onChange={(e: any) => handleNewPatientFieldChange('birth_state_id', e.target.value)}
                            label="Estado de Nacimiento"
                            disabled={!newPatientData.birth_country_id}
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
                          value={newPatientData.emergency_contact_name || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('emergency_contact_name', e.target.value)}
                          size="small"
                        />
                        <TextField
                          label="Teléfono del Contacto"
                          value={newPatientData.emergency_contact_phone || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('emergency_contact_phone', e.target.value)}
                          size="small"
                        />
                        <FormControl size="small" fullWidth>
                          <InputLabel>Relación con el Paciente</InputLabel>
                          <Select
                            value={newPatientData.emergency_contact_relationship || ''}
                            onChange={(e: any) => handleNewPatientFieldChange('emergency_contact_relationship', e.target.value)}
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
                          label="Condiciones Crónicas"
                          value={newPatientData.chronic_conditions || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('chronic_conditions', e.target.value)}
                          size="small"
                          multiline
                          rows={2}
                          fullWidth
                          sx={{ gridColumn: '1 / -1' }}
                        />
                        <TextField
                          label="Medicamentos Actuales"
                          value={newPatientData.current_medications || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('current_medications', e.target.value)}
                          size="small"
                          multiline
                          rows={2}
                          fullWidth
                          sx={{ gridColumn: '1 / -1' }}
                        />
                        <TextField
                          label="Proveedor de Seguro"
                          value={newPatientData.insurance_provider || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('insurance_provider', e.target.value)}
                          size="small"
                        />
                        <TextField
                          label="Código de Seguro"
                          value={newPatientData.insurance_number || ''}
                          onChange={(e: any) => handleNewPatientFieldChange('insurance_number', e.target.value)}
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
              </Box>
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
                      label="Condiciones Crónicas"
                      value={patientEditData.chronic_conditions || ''}
                      onChange={(e: any) => handlePatientDataChange('chronic_conditions', e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                      fullWidth
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    <TextField
                      label="Medicamentos Actuales"
                      value={patientEditData.current_medications || ''}
                      onChange={(e: any) => handlePatientDataChange('current_medications', e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                      fullWidth
                      sx={{ gridColumn: '1 / -1' }}
                    />
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
                  {patientPreviousStudies.map((study) => (
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
                                {study.status === 'completed' && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    startIcon={<WhatsAppIcon />}
                                    onClick={() => handleSendWhatsAppStudyResults(study.id)}
                                    disabled={sendingWhatsAppStudy === study.id}
                                  >
                                    {sendingWhatsAppStudy === study.id ? 'Enviando...' : 'Notificar'}
                                  </Button>
                                )}
                              </>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
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
            vitalSigns={vitalSignsHook.getAllVitalSigns()}
            isLoading={vitalSignsHook.isLoading}
            onAddVitalSign={vitalSignsHook.openAddDialog}
            onEditVitalSign={vitalSignsHook.openEditDialog}
            onDeleteVitalSign={(vitalSignId) => {
              if (isEditing && consultation?.id) {
                vitalSignsHook.deleteVitalSign(String(consultation.id), vitalSignId);
              } else {
                // For temporary vital signs, remove from temporary list
                vitalSignsHook.clearTemporaryVitalSigns();
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
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Diagnósticos Principales
              </Typography>
              <DiagnosisSelector
                selectedDiagnoses={formData.primary_diagnoses}
                onDiagnosesChange={(diagnoses: any) => {
                  setFormData((prev: ConsultationFormData) => ({ ...prev, primary_diagnoses: diagnoses }));
                  // Update text field for backward compatibility
                  const diagnosisText = (diagnoses || []).map((d: any) => `${d.code} - ${d.name}`).join('; ');
                  setFormData((prev: ConsultationFormData) => ({ ...prev, primary_diagnosis: diagnosisText }));
                }}
                specialty={formData.doctor_specialty}
                maxSelections={3}
                showRecommendations={true}
                disabled={loading}
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
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'secondary.main' }}>
                Diagnósticos Secundarios
              </Typography>
              <DiagnosisSelector
                selectedDiagnoses={formData.secondary_diagnoses_list}
                onDiagnosesChange={(diagnoses: any) => {
                  setFormData((prev: ConsultationFormData) => ({ ...prev, secondary_diagnoses_list: diagnoses }));
                  // Update text field for backward compatibility
                  const diagnosisText = (diagnoses || []).map((d: any) => `${d.code} - ${d.name}`).join('; ');
                  setFormData((prev: ConsultationFormData) => ({ ...prev, secondary_diagnoses: diagnosisText }));
                }}
                specialty={formData.doctor_specialty}
                maxSelections={5}
                showRecommendations={false}
                disabled={loading}
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
            onDeleteStudy={handleDeleteStudy}
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
                firstName: selectedPatient?.first_name || newPatientData.first_name || '',
                lastName: selectedPatient?.paternal_surname || newPatientData.paternal_surname || '',
                maternalSurname: selectedPatient?.maternal_surname || newPatientData.maternal_surname || '',
                dateOfBirth: selectedPatient?.birth_date || newPatientData.birth_date || undefined,
                gender: selectedPatient?.gender || newPatientData.gender || undefined,
                phone: selectedPatient?.primary_phone || newPatientData.primary_phone || undefined,
                email: selectedPatient?.email || newPatientData.email || undefined,
                address: selectedPatient?.address || newPatientData.address || undefined,
                city: selectedPatient?.city || newPatientData.city || undefined,
                state: selectedPatient?.state || newPatientData.state || undefined,
                country: selectedPatient?.country || newPatientData.country || undefined
              }}
              doctor={{
                id: doctorProfile?.id || 0,
                firstName: doctorProfile?.first_name || 'Dr.',
                lastName: doctorProfile?.paternal_surname || 'Usuario',
                maternalSurname: doctorProfile?.maternal_surname || '',
                title: doctorProfile?.title || 'Médico',
                specialty: doctorProfile?.specialty_name || 'No especificada',
                license: doctorProfile?.professional_license || 'No especificada',
                university: doctorProfile?.university || 'No especificada',
                phone: doctorProfile?.office_phone || doctorProfile?.phone || 'No especificado',
                email: doctorProfile?.email || 'No especificado',
                address: doctorProfile?.office_address || 'No especificado',
                city: doctorProfile?.office_city || 'No especificado',
                state: doctorProfile?.office_state_name || 'No especificado',
                country: doctorProfile?.office_country_name || 'No especificado'
              }}
              consultation={{
                id: consultation.id,
                date: consultation.date || formData.date,
                time: consultation.time || '10:00',
                type: consultation.type || formData.type,
                reason: consultation.reason || formData.reason,
                diagnosis: consultation.primary_diagnosis || formData.primary_diagnosis,
                notes: consultation.notes || formData.notes
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
          <Grid container spacing={1}>
            {vitalSignsHook.availableVitalSigns.map((vitalSign) => {
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
                <Grid item xs={12} sm={6} key={vitalSign.id}>
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
              const selectedVitalSign = vitalSignsHook.availableVitalSigns.find(
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
              const selectedVitalSign = vitalSignsHook.availableVitalSigns.find(
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
              <Grid item xs={12}>
                <TextField
                  label="Valor"
                  value={vitalSignsHook.vitalSignFormData.value}
                  onChange={(e) => vitalSignsHook.updateFormData({ value: e.target.value })}
                  fullWidth
                  required
                  placeholder="Ingresa el valor medido"
                  helperText={(() => {
                    const selectedVitalSign = vitalSignsHook.availableVitalSigns.find(
                      vs => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
                    );
                    
                    if (selectedVitalSign && selectedVitalSign.name.toLowerCase().includes('índice de masa corporal')) {
                      const allVitalSigns = vitalSignsHook.getAllVitalSigns();
                      const weightSign = allVitalSigns.find(vs => 
                        vs.vital_sign_name.toLowerCase().includes('peso')
                      );
                      const heightSign = allVitalSigns.find(vs => 
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
                      const selectedVitalSign = vitalSignsHook.availableVitalSigns.find(
                        vs => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
                      );
                      
                      // Check if this is BMI and if we have weight and height
                      if (selectedVitalSign && selectedVitalSign.name.toLowerCase().includes('índice de masa corporal')) {
                        const allVitalSigns = vitalSignsHook.getAllVitalSigns();
                        const weightSign = allVitalSigns.find(vs => 
                          vs.vital_sign_name.toLowerCase().includes('peso')
                        );
                        const heightSign = allVitalSigns.find(vs => 
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
              <Grid item xs={12}>
                <TextField
                  label="Unidad de medida"
                  value={vitalSignsHook.vitalSignFormData.unit}
                  onChange={(e) => vitalSignsHook.updateFormData({ unit: e.target.value })}
                  fullWidth
                  placeholder="Ej: cm, kg, mmHg, °C, bpm"
                  helperText="Especifica la unidad de medida del valor"
                />
              </Grid>
              <Grid item xs={12}>
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
    </Dialog>
  );
};

export default ConsultationDialog;
