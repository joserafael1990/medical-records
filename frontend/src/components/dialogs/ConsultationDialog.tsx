import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Science as ScienceIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Patient, PatientFormData, ClinicalStudy, CreateClinicalStudyData } from '../../types';
import { MEDICAL_VALIDATION_RULES, validateForm } from '../../utils/validation';
import {
  getVitalSignIcon,
  getVitalSignColor,
  getVitalSignUnit,
  isVitalSignUnitReadOnly,
  TEMP_IDS
} from '../../utils/vitalSignUtils';
import { DocumentSelector } from '../common/DocumentSelector';
import { apiService } from '../../services/api';
import ClinicalStudiesSection from '../common/ClinicalStudiesSection';
import { useClinicalStudies } from '../../hooks/useClinicalStudies';
import VitalSignsSection from '../common/VitalSignsSection';
import { useVitalSigns } from '../../hooks/useVitalSigns';
import PrescriptionsSection from '../common/PrescriptionsSection';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import DiagnosisSelector from '../common/DiagnosisSelector';
import { DiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';
import DiagnosisSection from '../common/DiagnosisSection';
import { useDiagnosisManagement } from '../../hooks/useDiagnosisManagement';
import { PrintButtons } from '../common/PrintButtons';
import ScheduleAppointmentSection from '../common/ScheduleAppointmentSection';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo } from '../../services/pdfService';
import { useToast } from '../common/ToastNotification';
import { disablePaymentDetection } from '../../utils/disablePaymentDetection';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { parseBackendDate } from '../../utils/formatters';
import { ConsultationFormHeader } from './ConsultationDialog/ConsultationFormHeader';
import { ConsultationActions } from './ConsultationDialog/ConsultationActions';
import { ConsultationFormFields } from './ConsultationDialog/ConsultationFormFields';
import { PatientDataSection } from './ConsultationDialog/PatientDataSection';
import { PreviousClinicalStudiesSection } from './ConsultationDialog/PreviousClinicalStudiesSection';
import { ConsultationDateSection } from './ConsultationDialog/ConsultationDateSection';
import { ConsultationDiagnosisSection } from './ConsultationDialog/DiagnosisSection';
import { PrintButtonsSection } from './ConsultationDialog/PrintButtonsSection';
// import { useSnackbar } from '../../contexts/SnackbarContext';

// Define ConsultationFormData interface based on the hook
export interface ConsultationFormData {
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  perinatal_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  treatment_plan: string;
  therapeutic_plan: string;
  laboratory_results: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
  // New fields for appointment selection
  has_appointment: boolean;
  appointment_id: string;
  consultation_type?: string;
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

  // Render tracking (commented for production)
  // console.log('🔄 ConsultationDialog render:', { open, isEditing, consultationId: consultation?.id });

  // Track consultation prop changes
  useEffect(() => {
    // console.log('🔄 Consultation prop changed:', { consultation, consultationId: consultation?.id });
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

  // Memoize initialFormData to prevent recreation on every render
  const initialFormData: ConsultationFormData = useMemo(() => ({
    patient_id: '',
    date: getCDMXDateTime(),
    chief_complaint: '',
    history_present_illness: '',
    family_history: '',
    perinatal_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    physical_examination: '',
    primary_diagnosis: '',
    secondary_diagnoses: '',
    treatment_plan: '',
    therapeutic_plan: '',
    laboratory_results: '',
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
  }), [doctorProfile?.first_name, doctorProfile?.last_name, doctorProfile?.title, doctorProfile?.professional_license, doctorProfile?.specialty]);

  const [formData, setFormData] = useState<ConsultationFormData>(initialFormData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [appointmentOffice, setAppointmentOffice] = useState<any | null>(null);
  const [patientEditData, setPatientEditData] = useState<PatientFormData | null>(null);
  
  // State for personal document (only one allowed)
  const [personalDocument, setPersonalDocument] = useState<{
    document_id: number | null;
    document_value: string;
  }>({ document_id: null, document_value: '' });
  
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
    
    // Check if appointment is follow-up type
    const isFollowUpAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'seguimiento' ||
      selectedAppointment.appointment_type === 'follow_up' ||
      (selectedAppointment.appointment_type_id && selectedAppointment.appointment_type_id !== 1) // Assuming 1 = primera vez
    );
    
    // Check if patient is selected
    const isExistingPatientSelected = selectedPatient && selectedPatient.id;
    
    // If it's a follow-up appointment and patient is selected, always show button
    if (isFollowUpAppointment && isExistingPatientSelected) {
      return true;
    }
    
    // Otherwise, show if patient has previous consultations
    const shouldShow = isExistingPatientSelected && patientHasPreviousConsultations;
    
    console.log('🔍 shouldShowPreviousConsultationsButton:', {
      isFollowUpAppointment,
      isExistingPatientSelected,
      patientHasPreviousConsultations,
      shouldShow,
      selectedAppointment: selectedAppointment ? {
        id: selectedAppointment.id,
        consultation_type: selectedAppointment.consultation_type,
        appointment_type: selectedAppointment.appointment_type,
        appointment_type_id: selectedAppointment.appointment_type_id
      } : null
    });
    
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
  // Use a ref to track if we've already loaded this consultation
  const loadedConsultationIdRef = React.useRef<string | number | undefined>(undefined);
  
  useEffect(() => {
    if (open && consultation) {
        // Use consultation.id as the key to prevent unnecessary re-runs
        const consultationId = consultation.id;
        if (!consultationId) return;
        
        // Skip if we've already loaded this consultation
        if (loadedConsultationIdRef.current === consultationId) {
          return;
        }
        
        // Mark as loaded
        loadedConsultationIdRef.current = consultationId;

        console.log('💊 Loading consultation data for ID:', consultationId);

        // Map consultation data to form data
        setFormData({
          ...initialFormData,
          patient_id: consultation.patient_id || '',
          date: consultation.date ? consultation.date : getCDMXDateTime(),
          chief_complaint: consultation.chief_complaint || '',
          history_present_illness: consultation.history_present_illness || '',
          family_history: consultation.family_history || '',
          perinatal_history: consultation.perinatal_history || '',
          personal_pathological_history: consultation.personal_pathological_history || '',
          personal_non_pathological_history: consultation.personal_non_pathological_history || '',
          physical_examination: consultation.physical_examination || '',
          primary_diagnosis: consultation.primary_diagnosis || '',
          secondary_diagnoses: consultation.secondary_diagnoses || '',
          treatment_plan: consultation.treatment_plan || '',
          therapeutic_plan: consultation.therapeutic_plan || '',
          laboratory_results: consultation.laboratory_results || '',
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

        // Load patient data from API
        const loadPatientData = async () => {
          if (consultation.patient_id) {
            try {
              const patientData = await apiService.getPatient(consultation.patient_id);
              setSelectedPatient(patientData);
              setPatientEditData(patientData);
              // Load personal document if exists
              if (patientData.personal_documents && patientData.personal_documents.length > 0) {
                setPersonalDocument(patientData.personal_documents[0]);
              } else {
                setPersonalDocument({ document_id: null, document_value: '' });
              }
            } catch (error) {
              console.error('Error loading patient data:', error);
            }
          }
        };

        // Load structured diagnoses from API
        const loadStructuredDiagnoses = async () => {
          try {
            // Parse primary diagnosis from text
            if (consultation.primary_diagnosis) {
              const parseDiagnosesFromText = (text: string): DiagnosisCatalog[] => {
                if (!text) return [];
                
                // Simple parsing for CIE-10 codes (e.g., "E11.9 - Diabetes mellitus tipo 2")
                const diagnosisEntries = text.split(';').map(entry => entry.trim()).filter(entry => entry);
                return diagnosisEntries.map((entry, index) => {
                  const [code, ...nameParts] = entry.split(' - ');
                  const name = nameParts.join(' - ');
                  
                  return {
                    id: `temp_${Date.now()}_${index}`, // Temporary ID
                    code: code || `TEMP${index}`,
                    name: name || entry,
                    description: '',
                    category: '',
                    specialty: '',
                    severity_level: '',
                    is_chronic: false,
                    is_active: true
                  };
                });
              };

              // Use structured diagnoses from API if available, otherwise parse from text
              if (consultation.primary_diagnoses && Array.isArray(consultation.primary_diagnoses) && consultation.primary_diagnoses.length > 0) {
                // Use structured diagnoses from API
                primaryDiagnosesHook.clearDiagnoses();
                primaryDiagnosesHook.loadDiagnoses(consultation.primary_diagnoses);
              } else {
                // Fallback to parsing from text
                const parsedPrimary = parseDiagnosesFromText(consultation.primary_diagnosis);
                primaryDiagnosesHook.clearDiagnoses();
                primaryDiagnosesHook.loadDiagnoses(parsedPrimary);
              }
            }

            // Parse secondary diagnoses from text
            if (consultation.secondary_diagnoses) {
              const parseDiagnosesFromText = (text: string): DiagnosisCatalog[] => {
                if (!text) return [];
                
                // Simple parsing for CIE-10 codes (e.g., "E11.9 - Diabetes mellitus tipo 2")
                const diagnosisEntries = text.split(';').map(entry => entry.trim()).filter(entry => entry);
                return diagnosisEntries.map((entry, index) => {
                  const [code, ...nameParts] = entry.split(' - ');
                  const name = nameParts.join(' - ');
                  
                  return {
                    id: `temp_${Date.now()}_${index}`, // Temporary ID
                    code: code || `TEMP${index}`,
                    name: name || entry,
                    description: '',
                    category: '',
                    specialty: '',
                    severity_level: '',
                    is_chronic: false,
                    is_active: true
                  };
                });
              };

              // Use structured diagnoses from API if available, otherwise parse from text
              if (consultation.secondary_diagnoses_list && Array.isArray(consultation.secondary_diagnoses_list) && consultation.secondary_diagnoses_list.length > 0) {
                // Use structured diagnoses from API
                secondaryDiagnosesHook.clearDiagnoses();
                secondaryDiagnosesHook.loadDiagnoses(consultation.secondary_diagnoses_list);
              } else {
                // Fallback to parsing from text
                const parsedSecondary = parseDiagnosesFromText(consultation.secondary_diagnoses);
                secondaryDiagnosesHook.clearDiagnoses();
                secondaryDiagnosesHook.loadDiagnoses(parsedSecondary);
              }
            }
          } catch (error) {
            console.error('Error loading structured diagnoses:', error);
          }
        };

        // Execute async operations
        loadPatientData();
        loadStructuredDiagnoses();

        // Load clinical studies, vital signs and prescriptions for existing consultation
        console.log('💊 Fetching prescriptions for consultation:', consultationId);
        clinicalStudiesHook.fetchStudies(String(consultation.id));
        vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
        prescriptionsHook.fetchPrescriptions(String(consultation.id));
        
        // Load office information if consultation has appointment_id
        if (consultation.appointment_id) {
          loadOfficeForConsultation(consultation.appointment_id);
        } else {
          loadDefaultOffice();
        }
    } else if (!open) {
      // Reset loaded consultation ID when dialog closes
      loadedConsultationIdRef.current = undefined;
    }
    // Only depend on consultation.id and open, not the entire objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultation?.id]);

  // Separate useEffect for new consultation setup
  // Use a ref to track if we've already initialized for this dialog opening
  const hasInitializedRef = React.useRef(false);
  const lastConsultationIdRef = React.useRef<string | number | undefined>(undefined);
  
  useEffect(() => {
    // console.log('🔄 useEffect for new consultation setup:', { open, consultation: !!consultation });
    const currentConsultationId = consultation?.id;
    
    // Reset initialization flag when dialog closes
    if (!open) {
      hasInitializedRef.current = false;
      lastConsultationIdRef.current = undefined;
      return;
    }
    
    // Only initialize once per dialog opening and consultation change
    // IMPORTANT: Only clear temporary data for NEW consultations, not when editing
    if (open && !consultation && !hasInitializedRef.current) {
      // console.log('🔄 Setting up new consultation');
      console.log('💊 Setting up NEW consultation - clearing temporary prescriptions');
      setFormData(initialFormData);
      setSelectedAppointment(null);
      setSelectedPatient(null);
      setShowAdvancedPatientData(false);
      
      // Clear clinical studies, vital signs and prescriptions for new consultation ONLY
      clinicalStudiesHook.clearTemporaryStudies();
      vitalSignsHook.clearTemporaryVitalSigns();
      prescriptionsHook.clearTemporaryPrescriptions();
      
      hasInitializedRef.current = true;
    } else if (open && currentConsultationId) {
      // When editing an existing consultation, make sure we don't clear prescriptions
      // The prescriptions should be loaded by the main useEffect above
      if (currentConsultationId !== lastConsultationIdRef.current) {
        // Consultation changed - reset flag but DO NOT clear prescriptions
        console.log('💊 Consultation changed to:', currentConsultationId, '- NOT clearing prescriptions, they will be loaded from DB');
        hasInitializedRef.current = false;
        lastConsultationIdRef.current = currentConsultationId;
      }
    }
    // Only depend on open and consultation.id, not the entire object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultation?.id]);

  // Refresh clinical studies when clinical study dialog closes (for existing consultations)
  // Store dialog state in a ref to avoid dependency issues
  const prevClinicalDialogOpen = React.useRef(clinicalStudiesHook.clinicalStudyDialogOpen);
  useEffect(() => {
    const wasOpen = prevClinicalDialogOpen.current;
    const isOpen = clinicalStudiesHook.clinicalStudyDialogOpen;
    
    // Only refresh if dialog was open and is now closed (transition from open to closed)
    if (isEditing && consultation?.id && wasOpen && !isOpen) {
      // Refresh studies when clinical study dialog closes
      clinicalStudiesHook.fetchStudies(String(consultation.id));
    }
    
    // Update ref
    prevClinicalDialogOpen.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicalStudiesHook.clinicalStudyDialogOpen, isEditing, consultation?.id]);

  // Refresh vital signs when vital signs dialog closes (for existing consultations)
  // Store dialog state in a ref to avoid dependency issues
  const prevVitalSignDialogOpen = React.useRef(vitalSignsHook.vitalSignDialogOpen);
  useEffect(() => {
    const wasOpen = prevVitalSignDialogOpen.current;
    const isOpen = vitalSignsHook.vitalSignDialogOpen;
    
    // Only refresh if dialog was open and is now closed (transition from open to closed)
    if (isEditing && consultation?.id && wasOpen && !isOpen) {
      // Refresh vital signs when vital signs dialog closes
      vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
    }
    
    // Update ref
    prevVitalSignDialogOpen.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitalSignsHook.vitalSignDialogOpen, isEditing, consultation?.id]);

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
    // Only depend on open and appointments length, not the entire array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointments?.length]);

  // Load structured diagnoses when editing a consultation - REMOVED (duplicate logic)
  // This is now handled in the main consultation loading useEffect above

  // Clear diagnosis hooks when dialog opens for new consultation (not editing)
  useEffect(() => {
    // console.log('🔄 useEffect for diagnosis hooks clearing:', { open, isEditing, consultation: !!consultation });
    if (open && !isEditing && !consultation) {
      // console.log('🔄 Clearing diagnosis hooks for new consultation');
      primaryDiagnosesHook.clearDiagnoses();
      secondaryDiagnosesHook.clearDiagnoses();
    }
    // Only depend on open and consultation.id, not the entire consultation object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, consultation?.id]);

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
        // Load personal document if exists
        if (fullPatientData.personal_documents && fullPatientData.personal_documents.length > 0) {
          setPersonalDocument(fullPatientData.personal_documents[0]);
        } else {
          setPersonalDocument({ document_id: null, document_value: '' });
        }
        
        // Check if patient has previous consultations and load previous studies
        await Promise.all([
          checkPatientPreviousConsultations(patient.id),
          loadPatientPreviousStudies(patient.id)
        ]);
      } catch (error) {
        console.error('Error loading patient data:', error);
        setPatientEditData(null);
        setPersonalDocument({ document_id: null, document_value: '' });
      }
    } else {
      setPatientEditData(null);
      setPersonalDocument({ document_id: null, document_value: '' });
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
    setLoadingPreviousStudies(true);
    try {
      console.log('🔬 Loading previous studies for patient:', patientId);
      const studies = await apiService.getClinicalStudiesByPatient(String(patientId));
      // Sort studies by ordered_date descending (most recent first), then by created_at
      const sortedStudies = (studies || []).sort((a: any, b: any) => {
        const dateA = a.ordered_date ? new Date(a.ordered_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.ordered_date ? new Date(b.ordered_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return dateB - dateA; // Descending order (most recent first)
      });
      console.log('🔬 Loaded', sortedStudies.length, 'previous studies, sorted by date (most recent first)');
      setPatientPreviousStudies(sortedStudies);
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
        // console.log('🔄 Reloading previous studies after file upload...');
        const updatedStudies = await apiService.getClinicalStudiesByPatient(String(selectedPatient.id));
          // console.log('🔬 Updated studies from API:', updatedStudies);
        
        // Update studies but preserve the completed status we just set
        setPatientPreviousStudies(prevStudies => {
          const newStudies = updatedStudies.map(apiStudy => {
            const localStudy = (prevStudies || []).find(prev => prev.id === apiStudy.id);
            // If we just updated this study locally, keep the completed status
            if (localStudy && localStudy.id === studyId && localStudy.status === 'completed') {
              // console.log('🔬 Preserving completed status for study:', studyId);
              return { ...apiStudy, status: 'completed' };
            }
            return apiStudy;
          });
          // console.log('🔬 Final studies state:', newStudies);
          
          // Check if the study we just updated is still completed
          const updatedStudy = (newStudies || []).find(s => s.id === studyId);
          // console.log('🔬 Updated study status:', updatedStudy ? updatedStudy.status : 'NOT FOUND');
          
          // Force a re-render by updating the state
          setTimeout(() => {
            // console.log('🔬 Forcing re-render after timeout');
            setPatientPreviousStudies(prev => [...prev]);
          }, 100);
          
          return newStudies;
        });
        // console.log('✅ Previous studies reloaded after file upload');
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
          // Load personal document if exists
          if (fullPatientData.personal_documents && fullPatientData.personal_documents.length > 0) {
            setPersonalDocument(fullPatientData.personal_documents[0]);
          } else {
            setPersonalDocument({ document_id: null, document_value: '' });
          }
          // Update selectedPatient with fresh data including birth_date and gender
          setSelectedPatient(fullPatientData);
          
          // Check if patient has previous consultations and load previous studies
          // This should happen for ALL patients, especially for follow-up appointments
          console.log('🔄 Loading patient previous consultations and studies for patient:', patient.id);
          await Promise.all([
            checkPatientPreviousConsultations(patient.id),
            loadPatientPreviousStudies(patient.id)
          ]);
        } catch (error) {
          console.error('❌ Error loading decrypted patient data:', error);
          setPatientEditData(null);
          setPersonalDocument({ document_id: null, document_value: '' });
        }
      } else {
        // console.warn('No patient found for appointment:', appointment.id);
        setSelectedPatient(null);
        setPatientEditData(null);
        setPersonalDocument({ document_id: null, document_value: '' });
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
        // Include personal document if it has a document_id
        const patientDataWithDocument = {
          ...patientEditData,
          personal_documents: personalDocument.document_id ? [personalDocument] : undefined
        };
        await apiService.updatePatient(selectedPatient.id.toString(), patientDataWithDocument);
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
      
      // console.log('🔬 Final form data being sent:', finalFormData);
      
      const createdConsultation = await onSubmit(finalFormData);
      
      // Save clinical studies if any were added (only temporary studies for new consultations)
      if ((clinicalStudiesHook.studies || []).length > 0 && createdConsultation?.id) {
        // Filter only temporary studies (those with temp_ IDs)
        const temporaryStudies = (clinicalStudiesHook.studies || []).filter(study => 
          study.id.toString().startsWith('temp_')
        );
        
        for (const study of temporaryStudies) {
          const studyData = {
            ...study,
            consultation_id: createdConsultation.id,
            patient_id: finalPatientId.toString()
          };
          
          try {
            await clinicalStudiesHook.createStudy(studyData);
          } catch (error) {
            console.error('❌ Error saving clinical study:', error);
            // Continue with other studies even if one fails
          }
        }
        
        // Clear temporary studies after saving
        clinicalStudiesHook.clearTemporaryStudies();
        
        // Refresh studies to show the newly created ones
        await clinicalStudiesHook.fetchStudies(String(createdConsultation.id));
      }

      // Save vital signs if any were added
      if (vitalSignsHook.temporaryVitalSigns.length > 0 && createdConsultation?.id) {
        for (const vitalSign of vitalSignsHook.temporaryVitalSigns) {
          try {
            await vitalSignsHook.createVitalSign(String(createdConsultation.id), vitalSign);
          } catch (error) {
            console.error('❌ Error saving vital sign:', error);
            // Continue with other vital signs even if one fails
          }
        }
        
        // Clear temporary vital signs after saving
        vitalSignsHook.clearTemporaryVitalSigns();
      }

      // Save prescriptions if any were added
      if (prescriptionsHook.prescriptions.length > 0 && createdConsultation?.id) {
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
            await prescriptionsHook.createPrescription(prescriptionData, String(createdConsultation.id));
          } catch (error) {
            console.error('❌ Error saving prescription:', error);
            // Continue with other prescriptions even if one fails
          }
        }
        
        // Refresh prescriptions to show the newly created ones
        await prescriptionsHook.fetchPrescriptions(String(createdConsultation.id));
        
        // Clear temporary prescriptions after saving
        prescriptionsHook.clearTemporaryPrescriptions();
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

  // Clinical studies handlers - Now inline
  const handleAddStudy = async (studyData: CreateClinicalStudyData) => {
    const consultationIdStr = isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION;
    const patientId = selectedPatient?.id?.toString() || TEMP_IDS.PATIENT;
    const doctorName = doctorProfile?.full_name || `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.first_name || 'Usuario'} ${doctorProfile?.last_name || 'Sistema'}`.trim();
    
    if (consultationIdStr === TEMP_IDS.CONSULTATION) {
      // Add to temporary studies
      const tempStudy: ClinicalStudy = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        consultation_id: consultationIdStr,
        patient_id: patientId,
        study_type: studyData.study_type,
        study_name: studyData.study_name,
        ordered_date: studyData.ordered_date,
        status: studyData.status || 'ordered',
        urgency: studyData.urgency || 'routine',
        ordering_doctor: doctorName,
        clinical_indication: studyData.clinical_indication || '',
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      clinicalStudiesHook.addTemporaryStudy(tempStudy);
    } else {
      // Save to database
      await clinicalStudiesHook.createStudy({
        ...studyData,
        ordering_doctor: doctorName
      });
      await clinicalStudiesHook.fetchStudies(consultationIdStr);
    }
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

  // Diagnosis handlers - Now inline, no need for dialog handlers
  // Use stable references to hook methods instead of the entire hook object
  const handleAddPrimaryDiagnosis = useCallback((diagnosis: DiagnosisCatalog) => {
    primaryDiagnosesHook.addDiagnosis(diagnosis);
    // Update formData synchronously but avoid causing infinite loops
    setFormData((prev: ConsultationFormData) => {
      // Check if already in formData to avoid duplicates
      const alreadyExists = prev.primary_diagnoses.some(d => d.id === diagnosis.id || d.code === diagnosis.code);
      if (alreadyExists) {
        return prev;
      }
      return {
        ...prev,
        primary_diagnoses: [...prev.primary_diagnoses, diagnosis],
        primary_diagnosis: diagnosis.name
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - hook methods are stable

  const handleAddSecondaryDiagnosis = useCallback((diagnosis: DiagnosisCatalog) => {
    secondaryDiagnosesHook.addDiagnosis(diagnosis);
    // Update formData synchronously but avoid causing infinite loops
    setFormData((prev: ConsultationFormData) => {
      // Check if already in formData to avoid duplicates
      const alreadyExists = prev.secondary_diagnoses_list.some(d => d.id === diagnosis.id || d.code === diagnosis.code);
      if (alreadyExists) {
        return prev;
      }
      const updatedList = [...prev.secondary_diagnoses_list, diagnosis];
      const allDiagnosesText = updatedList.map(d => d.name).join('; ');
      return {
        ...prev,
        secondary_diagnoses_list: updatedList,
        secondary_diagnoses: allDiagnosesText
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - hook methods are stable

  const handleRemovePrimaryDiagnosis = useCallback((diagnosisId: string) => {
    // console.log('🗑️ Removing primary diagnosis:', diagnosisId);
    primaryDiagnosesHook.removeDiagnosis(diagnosisId);
    
    // Update formData immediately by filtering out the removed diagnosis
    setFormData(prev => ({
      ...prev,
      primary_diagnoses: prev.primary_diagnoses.filter(d => d.id !== diagnosisId),
      // Clear the text field when diagnosis is removed
      primary_diagnosis: ''
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - hook methods are stable

  const handleRemoveSecondaryDiagnosis = useCallback((diagnosisId: string) => {
    // console.log('🗑️ Removing secondary diagnosis:', diagnosisId);
    secondaryDiagnosesHook.removeDiagnosis(diagnosisId);
    
    // Update formData immediately by filtering out the removed diagnosis
    setFormData(prev => {
      const updatedList = prev.secondary_diagnoses_list.filter(d => d.id !== diagnosisId);
      // Update the text field with remaining diagnosis names
      const remainingDiagnosesText = updatedList.map(d => d.name).join('; ');
      
      return {
        ...prev,
        secondary_diagnoses_list: updatedList,
        // Update the text field with remaining diagnosis names
        secondary_diagnoses: remainingDiagnosesText
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - hook methods are stable


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
          {/* Appointment Selection - Only show for new consultations */}
          {!consultation && (
            <ConsultationFormHeader
              isEditing={isEditing}
              onClose={handleClose}
              isNewConsultation={true}
              availableAppointments={availableAppointments}
              selectedAppointmentId={formData.appointment_id || ''}
              onAppointmentChange={(appointmentId: string) => {
                const appointment = (availableAppointments || []).find((apt: any) => apt.id.toString() === appointmentId);
                handleAppointmentChange(appointment);
              }}
              onNewAppointment={() => {
                      onClose();
                      if (onNewAppointment) {
                        onNewAppointment();
                      }
                    }}
            />
          )}

          {/* Patient Data Section - Show only when patient is selected (existing patients) */}
          {selectedPatient && patientEditData && (
            <PatientDataSection
              patientEditData={patientEditData}
              personalDocument={personalDocument}
              showAdvancedPatientData={showAdvancedPatientData}
              setShowAdvancedPatientData={setShowAdvancedPatientData}
              countries={countries}
              states={states}
              birthStates={birthStates}
              emergencyRelationships={emergencyRelationships}
              getPatientData={getPatientData}
              handlePatientDataChange={handlePatientDataChange}
              handlePatientDataChangeWrapper={handlePatientDataChangeWrapper}
              handleCountryChange={handleCountryChange}
              setPersonalDocument={setPersonalDocument}
              shouldShowOnlyBasicPatientData={shouldShowOnlyBasicPatientData}
              shouldShowPreviousConsultationsButton={shouldShowPreviousConsultationsButton}
              handleViewPreviousConsultations={handleViewPreviousConsultations}
            />
          )}

          {/* Date */}
          <ConsultationDateSection
            date={formData.date}
            onChange={handleDateChange}
          />

          {/* Consultation Form Fields */}
          <ConsultationFormFields
            formData={formData}
              onChange={handleChange}
            shouldShowFirstTimeFields={shouldShowFirstTimeFields}
            error={error}
          />

          {/* Previous Clinical Studies Section - Show when patient is selected */}
          <PreviousClinicalStudiesSection
            selectedPatient={selectedPatient}
            patientPreviousStudies={patientPreviousStudies}
            loadingPreviousStudies={loadingPreviousStudies}
            onUploadStudyFile={(studyId: number, file: File) => handleUploadStudyFile(studyId.toString(), file)}
            onUpdateStudyStatus={(studyId: number, status: string) => handleUpdateStudyStatus(studyId.toString(), status)}
            onViewStudyFile={(studyId: number) => handleViewStudyFile(studyId.toString())}
          />


          {/* Vital Signs Section - Always show */}
          <VitalSignsSection
            consultationId={isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION}
            patientId={selectedPatient?.id || 0}
            vitalSigns={vitalSignsHook.getAllVitalSigns() || []}
            availableVitalSigns={vitalSignsHook.availableVitalSigns || []}
            isLoading={vitalSignsHook.isLoading}
            onAddVitalSign={async (vitalSignData) => {
              const consultationIdStr = isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION;
              
              // For temporary consultations, add directly to temporary vital signs
              if (consultationIdStr === TEMP_IDS.CONSULTATION) {
                // Find the vital sign name for the ID
                const vitalSign = vitalSignsHook.availableVitalSigns.find(vs => vs.id === vitalSignData.vital_sign_id);
                if (vitalSign) {
                  vitalSignsHook.addTemporaryVitalSign({
                    ...vitalSignData,
                    vital_sign_name: vitalSign.name
                  });
                }
              } else {
                // Save to database
                await vitalSignsHook.createVitalSign(consultationIdStr, vitalSignData);
                // Refresh to get the new vital sign
                await vitalSignsHook.fetchConsultationVitalSigns(consultationIdStr);
              }
            }}
            onEditVitalSign={(vitalSign, vitalSignData) => {
              const consultationIdStr = isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION;
              vitalSignsHook.updateVitalSign(consultationIdStr, vitalSign.id, vitalSignData);
            }}
            onDeleteVitalSign={(vitalSignId) => {
              const consultationIdStr = isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION;
              vitalSignsHook.deleteVitalSign(consultationIdStr, vitalSignId);
            }}
          />


          {/* Structured Diagnoses */}
          <ConsultationDiagnosisSection
            primaryDiagnoses={primaryDiagnosesHook.diagnoses}
            onAddPrimaryDiagnosis={handleAddPrimaryDiagnosis}
            onRemovePrimaryDiagnosis={handleRemovePrimaryDiagnosis}
            primaryDiagnosisText={formData.primary_diagnosis}
            onPrimaryDiagnosisTextChange={handleChange}
            secondaryDiagnoses={secondaryDiagnosesHook.diagnoses}
            onAddSecondaryDiagnosis={handleAddSecondaryDiagnosis}
            onRemoveSecondaryDiagnosis={handleRemoveSecondaryDiagnosis}
            secondaryDiagnosesText={formData.secondary_diagnoses}
            onSecondaryDiagnosesTextChange={handleChange}
            loading={loading}
            primaryDiagnosesError={primaryDiagnosesHook.error}
            secondaryDiagnosesError={secondaryDiagnosesHook.error}
          />

          {/* Prescribed Medications Section - Inline */}
          <PrescriptionsSection
            consultationId={isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION}
            prescriptions={prescriptionsHook.prescriptions}
            isLoading={prescriptionsHook.isLoading}
            onAddPrescription={async (prescriptionData) => {
              const consultationIdStr = isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION;
              if (consultationIdStr === TEMP_IDS.CONSULTATION) {
                // Add to temporary prescriptions
                prescriptionsHook.addTemporaryPrescription(prescriptionData);
              } else {
                // Save to database
                await prescriptionsHook.createPrescription(prescriptionData, consultationIdStr);
                await prescriptionsHook.fetchPrescriptions(consultationIdStr);
              }
            }}
            onDeletePrescription={(prescriptionId) => {
              if (isEditing && consultation?.id) {
                prescriptionsHook.deletePrescription(prescriptionId, String(consultation.id));
              } else {
                // For temporary prescriptions, remove from temporary list
                prescriptionsHook.deletePrescription(prescriptionId, "temp_consultation");
              }
            }}
            medications={prescriptionsHook.medications}
            onFetchMedications={prescriptionsHook.fetchMedications}
            onCreateMedication={prescriptionsHook.createMedication}
          />


        </Box>

        {/* Clinical Studies Section - Always show */}
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          
          <ClinicalStudiesSection
            consultationId={isEditing ? String(consultation.id) : "temp_consultation"}
            patientId={selectedPatient?.id?.toString() || TEMP_IDS.PATIENT}
            studies={clinicalStudiesHook.studies}
            isLoading={clinicalStudiesHook.isLoading}
            onAddStudy={handleAddStudy}
            onRemoveStudy={handleDeleteStudy}
            onViewFile={clinicalStudiesHook.viewFile}
            onDownloadFile={clinicalStudiesHook.downloadFile}
            doctorName={doctorProfile?.full_name || `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.first_name || 'Usuario'} ${doctorProfile?.last_name || 'Sistema'}`.trim()}
          />
        </Box>

        {/* Schedule Follow-up Appointment Section - Inline Form */}
        {(selectedPatient || formData.patient_id) && <ScheduleAppointmentSection
          patientId={selectedPatient?.id || parseInt(formData.patient_id) || 0}
          doctorProfile={doctorProfile}
        />}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 2 }}>
        {/* Print buttons - show when we have medications or studies */}
        <PrintButtonsSection
          show={((prescriptionsHook.prescriptions && prescriptionsHook.prescriptions.length > 0) || 
            (clinicalStudiesHook.studies && clinicalStudiesHook.studies.length > 0))}
          selectedPatient={selectedPatient}
          doctorProfile={doctorProfile}
          appointmentOffice={appointmentOffice}
          consultation={consultation}
          formData={formData}
          prescriptions={prescriptionsHook.prescriptions || []}
          studies={clinicalStudiesHook.studies || []}
        />
        
        {/* Action buttons */}
        <ConsultationActions
          onClose={handleClose}
          onSubmit={handleSubmit}
          loading={loading}
          isEditing={isEditing}
        />
      </DialogActions>

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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filteredVitalSigns.map((vitalSign) => (
                  <Box key={vitalSign.id} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
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
                      const autoUnit = getVitalSignUnit(vitalSign.name);
                      
                      vitalSignsHook.updateFormData({ 
                        vital_sign_id: vitalSign.id,
                        value: '',
                        unit: autoUnit,
                        notes: ''
                      });
                      
                      // Auto-calculate BMI if IMC is selected and we have weight/height
                      if (vitalSign.name.toLowerCase().includes('imc') || vitalSign.name.toLowerCase().includes('índice de masa corporal') || vitalSign.name.toLowerCase().includes('bmi')) {
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
                            const heightInMeters = height / 100;
                            const bmi = weight / (heightInMeters * heightInMeters);
                            const bmiRounded = Math.round(bmi * 10) / 10;
                            
                            // Auto-fill BMI value
                            setTimeout(() => {
                              vitalSignsHook.updateFormData({ value: bmiRounded.toString() });
                            }, 100);
                          }
                        }
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {React.createElement(getVitalSignIcon(vitalSign.name), { sx: { color: getVitalSignColor(vitalSign.name) } })}
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {vitalSign.name}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  </Box>
                ))}
              </Box>
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
              
              return React.createElement(getVitalSignIcon(selectedVitalSign.name), { sx: { color: getVitalSignColor(selectedVitalSign.name) } });
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
              <Box sx={{ mb: 2 }}>
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
              </Box>
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Unidad de medida"
                  value={vitalSignsHook.vitalSignFormData.unit}
                  onChange={(e) => vitalSignsHook.updateFormData({ unit: e.target.value })}
                  fullWidth
                  placeholder="Ej: cm, kg, mmHg, °C, bpm"
                  helperText="Especifica la unidad de medida del valor"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
              </Box>
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


    </Dialog>
  );
};

export default ConsultationDialog;
