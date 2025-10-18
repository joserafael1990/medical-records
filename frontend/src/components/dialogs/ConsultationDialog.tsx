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
  CardContent
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
  LocalHospital as HospitalIcon2
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
import DiagnosisSelector from '../common/DiagnosisSelector';
import { DiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';
import { PrintButtons } from '../common/PrintButtons';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo } from '../../services/pdfService';
// import { useSnackbar } from '../../contexts/SnackbarContext';

// Define ConsultationFormData interface based on the hook
interface ConsultationFormData {
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
  prescribed_medications: string;
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
    prescribed_medications: '',
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
    secondary_diagnoses_list: []
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

  // Clinical studies management
  const clinicalStudiesHook = useClinicalStudies();

  // Vital signs management
  const vitalSignsHook = useVitalSigns();

  // State for inline patient creation
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    primary_phone: ''
  });

  useEffect(() => {
    if (open) {
      setError(null);
      setErrors({});
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
          prescribed_medications: consultation.prescribed_medications || '',
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
          secondary_diagnoses_list: consultation.secondary_diagnoses_list || []
        });

        // Find and set selected patient
        if (consultation.patient_id && patients.length > 0) {
          const patient = patients.find((p: any) => p.id === consultation.patient_id);
          setSelectedPatient(patient || null);
        }

        // Load clinical studies for existing consultation
        console.log('🔬 Loading clinical studies for consultation:', consultation.id);
        console.log('🔬 Clinical studies hook state:', {
          isLoading: clinicalStudiesHook.isLoading,
          studies: clinicalStudiesHook.studies,
          error: clinicalStudiesHook.error
        });
        clinicalStudiesHook.fetchStudies(String(consultation.id));
        vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
      } else {
        setFormData(initialFormData);
        setSelectedPatient(null);
        
        // Clear clinical studies and vital signs for new consultation
        clinicalStudiesHook.clearTemporaryStudies();
        vitalSignsHook.clearTemporaryVitalSigns();
      }
    }
  }, [open, consultation, patients, doctorProfile]);

  // Refresh clinical studies when clinical study dialog closes (for existing consultations)
  useEffect(() => {
    if (isEditing && consultation && !clinicalStudiesHook.clinicalStudyDialogOpen) {
      // Refresh studies when clinical study dialog closes
      console.log('🔬 Refreshing clinical studies after dialog close');
      clinicalStudiesHook.fetchStudies(String(consultation.id));
    }
  }, [clinicalStudiesHook.clinicalStudyDialogOpen, isEditing, consultation]);

  // Refresh vital signs when vital signs dialog closes (for existing consultations)
  useEffect(() => {
    if (isEditing && consultation && !vitalSignsHook.vitalSignDialogOpen) {
      // Refresh vital signs when vital signs dialog closes
      console.log('🫀 Refreshing vital signs after dialog close');
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
          console.log('🔍 ConsultationDialog - loading patients for appointment IDs:', patientIds);
          
          // Get all patients to find the ones referenced in appointments
          const allPatients = await apiService.getPatients();
          const appointmentPatients = allPatients.filter((patient: any) => 
            patientIds.includes(patient.id)
          );
          console.log('🔍 ConsultationDialog - found appointment patients:', appointmentPatients.length);
          
          // Set the appointment patients for use in the dropdown
          setAppointmentPatients(appointmentPatients);
          console.log('🔍 ConsultationDialog - set appointment patients:', appointmentPatients.length);
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
      } catch (error) {
        console.error('Error loading patient data:', error);
        setPatientEditData(null);
      }
    } else {
      setPatientEditData(null);
    }
    
    if (errors.patient_id) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors.patient_id;
        return newErrors;
      });
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
          console.log('🔍 Loading decrypted patient data for ID:', patient.id);
          const fullPatientData = await apiService.getPatient(patient.id);
          console.log('✅ Loaded decrypted patient data:', {
            id: fullPatientData.id,
            name: fullPatientData.first_name,
            phone: fullPatientData.primary_phone,
            birth_date: fullPatientData.birth_date,
            gender: fullPatientData.gender
          });
          setPatientEditData(fullPatientData);
          // Update selectedPatient with fresh data including birth_date and gender
          setSelectedPatient(fullPatientData);
        } catch (error) {
          console.error('❌ Error loading decrypted patient data:', error);
          setPatientEditData(null);
        }
      } else {
        console.warn('No patient found for appointment:', appointment.id);
        setSelectedPatient(null);
        setPatientEditData(null);
      }
    } else {
      setSelectedPatient(null);
      setPatientEditData(null);
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

  // Filter appointments to show only non-cancelled ones
  const availableAppointments = appointments.filter((appointment: any) => 
    appointment.status !== 'cancelled' && appointment.status !== 'canceled'
  );

  const handleSubmit = async () => {
    setError(null);
    
    // Basic validation - check if patient is selected OR new patient data is provided
    if (!selectedPatient && (!newPatientData.first_name || !newPatientData.paternal_surname)) {
      setError('Por favor, selecciona un paciente existente o completa los datos básicos del nuevo paciente (nombre y apellido paterno son requeridos)');
      return;
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      return;
    }

    // Create new patient if no patient is selected
    let finalPatientId = selectedPatient?.id;
    
    if (!selectedPatient && newPatientData.first_name && newPatientData.paternal_surname) {
      try {
        // Create new patient with basic data
        const patientData: PatientFormData = {
          first_name: newPatientData.first_name,
          paternal_surname: newPatientData.paternal_surname,
          maternal_surname: newPatientData.maternal_surname || '',
          email: '',
          date_of_birth: '',
          birth_date: '',
          phone: newPatientData.primary_phone || '',
          primary_phone: newPatientData.primary_phone || '',
          gender: '',
          civil_status: '',
          home_address: '',
          curp: '',
          rfc: '',
          address_city: '',
          city: '',
          address_state_id: '',
          state: '',
          address_postal_code: '',
          zip_code: '',
          address_country_id: '',
          country: '',
          birth_city: '',
          birth_state_id: '',
          birth_country_id: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          chronic_conditions: '',
          current_medications: '',
          medical_history: '',
          insurance_provider: '',
          insurance_policy_number: '',
          active: true,
          is_active: true
        };

        const newPatient = await apiService.createPatient(patientData);
        finalPatientId = newPatient.id;
        console.log('✅ New patient created successfully:', newPatient);
      } catch (error) {
        console.error('Error creating patient:', error);
        setError('Error al crear el nuevo paciente');
        return;
      }
    }

    // Update patient data if modified
    if (patientEditData && selectedPatient) {
      try {
        await apiService.updatePatient(selectedPatient.id, patientEditData);
        console.log('✅ Patient data updated successfully');
      } catch (error) {
        console.error('Error updating patient data:', error);
        setError('Error al actualizar los datos del paciente');
        return;
      }
    }

    setLoading(true);
    try {
      // Determine consultation type based on whether it's a new patient
      const isNewPatient = !selectedPatient && newPatientData.first_name && newPatientData.paternal_surname;
      const consultationType = isNewPatient ? 'Primera vez' : 'Seguimiento';
      
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
      console.log('🔬 Prescribed medications field:', finalFormData.prescribed_medications);
      
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
            console.log('✅ Clinical study saved:', study.study_name);
          } catch (error) {
            console.error('❌ Error saving clinical study:', error);
            console.error('❌ Study data that failed:', studyData);
            // Continue with other studies even if one fails
          }
        }
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
            console.log('✅ Vital sign saved:', vitalSign);
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
      
      // Consulta creada exitosamente - sin mostrar diálogo
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setError(err.message || 'Error al guardar consulta');
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
    console.log('🔍 handleAddStudy called');
    console.log('🔍 selectedPatient:', selectedPatient);
    console.log('🔍 isEditing:', isEditing);
    console.log('🔍 consultation:', consultation);
    console.log('🔍 doctorProfile:', doctorProfile);
    
    // Allow adding studies even without a selected patient
    // Use temp_patient ID when no patient is selected
    const patientId = selectedPatient?.id || 'temp_patient';
    const consultationId = isEditing ? String(consultation.id) : 'temp_consultation';
    const doctorName = doctorProfile?.full_name || 'Dr. Usuario Sistema';
    
    console.log('🔍 Calling openAddDialog with:', {
      consultationId,
      patientId,
      doctorName
    });
    
    clinicalStudiesHook.openAddDialog(
      consultationId,
      patientId,
      doctorName
    );
    
    console.log('🔍 openAddDialog called, dialog should be open now');
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
          {/* Debug: Log form data */}
          {console.log('🔍 ConsultationDialog render - formData.has_appointment:', formData.has_appointment)}
          {console.log('🔍 ConsultationDialog render - appointments length:', appointments?.length)}
          {console.log('🔍 ConsultationDialog render - formData.prescribed_medications:', formData.prescribed_medications)}
          
          {/* Appointment Question */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              ¿Consulta con previa cita?
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Seleccione una opción</InputLabel>
              <Select
                value={formData.has_appointment === true ? 'yes' : formData.has_appointment === false ? 'no' : ''}
                onChange={(e: any) => {
                  const value = e.target.value;
                  const hasAppointment = value === 'yes';
                  setFormData((prev: ConsultationFormData) => ({ 
                    ...prev, 
                    has_appointment: hasAppointment,
                    appointment_id: hasAppointment ? prev.appointment_id : ''
                  }));
                  if (!hasAppointment) {
                    setSelectedAppointment(null);
                    setSelectedPatient(null);
                    setPatientEditData(null);
                  }
                }}
                label="Seleccione una opción"
              >
                <MenuItem value="yes">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Appointment Selection - Only show if has_appointment is true */}
          {formData.has_appointment && (
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

          {/* Patient Selection - Only show if has_appointment is false or no appointment selected */}
          {!formData.has_appointment && (
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

          {/* Inline New Patient Creation Form - Only show if no appointment and no patient selected */}
          {!formData.has_appointment && !selectedPatient && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  O complete los datos para crear un nuevo paciente:
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
                      label="Fecha de Nacimiento"
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
                  <FormControl size="small" fullWidth>
                    <InputLabel>Género</InputLabel>
                    <Select
                      value={newPatientData.gender || ''}
                      onChange={(e: any) => handleNewPatientFieldChange('gender', e.target.value)}
                      label="Género"
                    >
                      <MenuItem value=""><em>Seleccione</em></MenuItem>
                      <MenuItem value="Masculino">Masculino</MenuItem>
                      <MenuItem value="Femenino">Femenino</MenuItem>
                      <MenuItem value="Otro">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
          </Box>
          )}

          {/* Patient Data Section - Show when patient is selected */}
          {selectedPatient && patientEditData && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon sx={{ fontSize: 20 }} />
                Datos del Paciente (Editable)
              </Typography>
              
              <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                {/* Personal Information Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 20 }} />
                    Información Personal
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Nombre"
                      value={patientEditData.first_name || ''}
                      onChange={(e: any) => handlePatientDataChange('first_name', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Apellido Paterno"
                      value={patientEditData.paternal_surname || ''}
                      onChange={(e: any) => handlePatientDataChange('paternal_surname', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Apellido Materno"
                      value={patientEditData.maternal_surname || ''}
                      onChange={(e: any) => handlePatientDataChange('maternal_surname', e.target.value)}
                      size="small"
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <DatePicker
                        label="Fecha de Nacimiento"
                        value={patientEditData.birth_date ? new Date(patientEditData.birth_date) : null}
                        onChange={(newValue: any) => {
                          const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                          handlePatientDataChange('birth_date', dateStr);
                        }}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true
                          }
                        }}
                      />
                    </LocalizationProvider>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Género</InputLabel>
                      <Select
                        value={patientEditData.gender || ''}
                        onChange={(e: any) => handlePatientDataChange('gender', e.target.value)}
                        label="Género"
                      >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        <MenuItem value="Masculino">Masculino</MenuItem>
                        <MenuItem value="Femenino">Femenino</MenuItem>
                        <MenuItem value="Otro">Otro</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

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
                    />
                    <TextField
                      label="RFC"
                      value={patientEditData.rfc || ''}
                      onChange={(e: any) => handlePatientDataChange('rfc', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 13 }}
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
                      label="Número de Póliza"
                      value={patientEditData.insurance_number || ''}
                      onChange={(e: any) => handlePatientDataChange('insurance_number', e.target.value)}
                      size="small"
                    />
                  </Box>
                </Box>
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
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Campos de texto (para compatibilidad)
            </Typography>
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
          </Box>

          {/* Prescribed Medications */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Medicamentos Prescritos
            </Typography>
            <TextField
              name="prescribed_medications"
              label="Medicamentos prescritos"
              value={formData.prescribed_medications}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder="Denominación del medicamento, presentación, dosis, vía de administración, frecuencia, duración del tratamiento, cantidad a surtir"
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
            {console.log('🔍 DoctorProfile data for PDF:', doctorProfile)}
            {console.log('🔍 Office data:', {
              office_address: doctorProfile?.office_address,
              office_city: doctorProfile?.office_city,
              office_state_name: doctorProfile?.office_state_name,
              office_country_name: doctorProfile?.office_country_name,
              office_phone: doctorProfile?.office_phone
            })}
            {console.log('🔍 All doctorProfile keys:', Object.keys(doctorProfile || {}))}
            {console.log('🔍 Full doctorProfile object:', JSON.stringify(doctorProfile, null, 2))}
            {console.log('🔍 Specialty data:', {
              specialty_id: doctorProfile?.specialty_id,
              specialty_name: doctorProfile?.specialty_name,
              specialty: doctorProfile?.specialty
            })}
            {console.log('🔍 PDF Patient Data Debug:', {
              selectedPatient: selectedPatient ? {
                id: selectedPatient.id,
                first_name: selectedPatient.first_name,
                paternal_surname: selectedPatient.paternal_surname,
                maternal_surname: selectedPatient.maternal_surname,
                birth_date: selectedPatient.birth_date,
                gender: selectedPatient.gender,
                primary_phone: selectedPatient.primary_phone
              } : null,
              newPatientData: {
                first_name: newPatientData.first_name,
                paternal_surname: newPatientData.paternal_surname,
                maternal_surname: newPatientData.maternal_surname,
                birth_date: newPatientData.birth_date,
                gender: newPatientData.gender,
                phone: newPatientData.primary_phone
              },
              finalPatientData: {
                id: selectedPatient?.id || 0,
                firstName: selectedPatient?.first_name || newPatientData.first_name || '',
                lastName: selectedPatient?.paternal_surname || newPatientData.paternal_surname || '',
                maternalSurname: selectedPatient?.maternal_surname || newPatientData.maternal_surname || '',
                dateOfBirth: selectedPatient?.birth_date || newPatientData.birth_date || undefined,
                gender: selectedPatient?.gender || newPatientData.gender || undefined,
                phone: selectedPatient?.primary_phone || newPatientData.primary_phone || undefined
              }
            })}
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
                prescribed_medications: consultation.prescribed_medications || formData.prescribed_medications,
                notes: consultation.notes || formData.notes
              }}
              medications={[
                // You might want to add medications from the consultation
                // For now, using sample data
                {
                  name: 'Paracetamol',
                  dosage: '500mg',
                  frequency: 'Cada 8 horas',
                  duration: '7 días',
                  instructions: 'Tomar con alimentos',
                  quantity: 21
                }
              ]}
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
                          return `Peso: ${weight} kg, Estatura: ${height} cm. Haz clic en "Calcular" para calcular automáticamente el IMC.`;
                        } else {
                          return 'Agrega primero el peso y la estatura para calcular automáticamente el IMC.';
                        }
                      } else {
                        return 'Agrega primero el peso y la estatura para calcular automáticamente el IMC.';
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
    </Dialog>
  );
};

export default ConsultationDialog;

