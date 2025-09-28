import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout';
import {
  PatientDialog,
  ConsultationDialog,
  AppointmentDialog,
  ClinicalStudyDialog,
  DoctorProfileDialog
} from './components/lazy';
import { LoadingFallback } from './components';
import ErrorBoundary from './components/common/ErrorBoundary';
import LogoutConfirmDialog from './components/dialogs/LogoutConfirmDialog';
import { useAuth } from './contexts/AuthContext';
import { useDoctorProfileCache as useDoctorProfile } from './hooks/useDoctorProfileCache';
import { useAppState, useAppointmentManager, usePatientManagement, useConsultationManagement } from './hooks';
import { apiService } from './services/api';
import { submitConsultation } from './utils/consultationHelpers';
import { 
  Patient, 
  ClinicalStudy, 
  ClinicalStudyFormData, 
  DashboardData,
  PatientFormData,
  AppointmentFormData
} from './types';

import { logger } from './utils/logger';

function AppContent() {
  // Initialize app with backend-only data approach
  useEffect(() => {
    logger.system.init('Sistema médico');
    logger.system.ready('Sistema configurado para usar exclusivamente backend');
  }, []);

  // Authentication
  const { user, logout, isAuthenticated } = useAuth();
  
  // Doctor profile information
  const doctorProfileHook = useDoctorProfile();
  const { 
    doctorProfile, 
    dialogOpen: doctorProfileDialogOpenFromHook,
    isEditing: isEditingFromHook,
    formData: formDataFromHook,
    setFormData: setFormDataFromHook,
    handleCancel: handleCancelFromHook,
    handleSubmit: handleSubmitFromHook,
    formErrorMessage: formErrorMessageFromHook,
    setFormErrorMessage: setFormErrorMessageFromHook,
    fieldErrors: fieldErrorsFromHook,
    isSubmitting: isSubmittingFromHook
  } = doctorProfileHook;

  // Debug: Log dialog state changes
  useEffect(() => {
    console.log('🔍 APP.tsx: Dialog state changed');
    console.log('🔍 doctorProfileDialogOpenFromHook:', doctorProfileDialogOpenFromHook);
    console.log('🔍 isEditingFromHook:', isEditingFromHook);
    console.log('🔍 formDataFromHook keys:', Object.keys(formDataFromHook || {}));
  }, [doctorProfileDialogOpenFromHook, isEditingFromHook, formDataFromHook]);
  
  // Global app state using extracted hook
  const {
    activeView,
    setActiveView,
    successMessage,
    formErrorMessage,
    fieldErrors,
    isSubmitting,
    showSuccessMessage,
    setFormErrorMessage,
    setFieldErrors,
    setIsSubmitting,
    clearMessages
  } = useAppState();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [medicalRecordsData, setMedicalRecordsData] = useState<any[]>([]);

  // Doctor profile management now handled by useDoctorProfile hook
  
  // Doctor profile handlers now managed by hook
  

  // Patient management - using refactored hook
  const patientManagement = usePatientManagement();

  // Consultation management - using refactored hook  
  const consultationManagement = useConsultationManagement();

  // Appointment management (doctorProfile now comes from AppLayout)
  const appointmentManager = useAppointmentManager(patientManagement.patients, doctorProfile);

  // Patient form data state
  const initialPatientFormData: PatientFormData = {
    // Basic information
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    email: '',
    date_of_birth: '',
    birth_date: '',
    phone: '',
    primary_phone: '',
    gender: '',
    civil_status: '',
    
    // Personal details (added fields)
    birth_city: '',
    birth_state_id: '',
    
    // Address
    address: '',
    address_street: '',
    city: '',
    address_city: '',
    state: '',
    address_state_id: '',
    zip_code: '',
    country: 'México',
    address_postal_code: '',
    
    // Emergency contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    
    // Medical information
    blood_type: '',
    allergies: '',
    current_medications: '',
    medical_history: '',
    chronic_conditions: '',
    insurance_provider: '',
    insurance_policy_number: '',
    
    // Mexican official fields
    curp: '',
    rfc: '',
    
    // Technical fields
    active: true,
    is_active: true
  };

  const [patientFormData, setPatientFormData] = useState<PatientFormData>(initialPatientFormData);

  // Sync patientFormData when dialog opens - reset for new or populate for edit
  useEffect(() => {
    if (patientManagement.patientDialogOpen) {
      if (patientManagement.isEditingPatient && patientManagement.selectedPatient) {
        // Editing mode: populate form with patient data
        const patient = patientManagement.selectedPatient;
        
        const syncedFormData: PatientFormData = {
        // Basic information
        first_name: patient.first_name || '',
        paternal_surname: patient.paternal_surname || '',
        maternal_surname: patient.maternal_surname || '',
        email: patient.email || '',
        date_of_birth: patient.date_of_birth || patient.birth_date || '',
        birth_date: patient.birth_date || patient.date_of_birth || '',
        phone: patient.phone || patient.primary_phone || '',
        primary_phone: patient.primary_phone || patient.phone || '',
        gender: patient.gender || '',
        civil_status: patient.civil_status || '',
        
        // Personal details (added fields)
        birth_city: patient.birth_city || '',
        birth_state_id: patient.birth_state_id ? String(patient.birth_state_id) : '',
        
        // Address
        address: patient.address || patient.address_street || '',
        address_street: patient.address_street || patient.address || '',
        city: patient.city || patient.address_city || '',
        address_city: patient.address_city || patient.city || '',
        state: patient.state || patient.address_state_id || '',
        address_state_id: patient.address_state_id || patient.state || '',
        zip_code: patient.zip_code || patient.postal_code || patient.address_postal_code || '',
        country: patient.country || 'México',
        
        // Emergency contact
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        emergency_contact_relationship: patient.emergency_contact_relationship || '',
        
        // Medical information
        blood_type: patient.blood_type || '',
        allergies: patient.allergies || '',
        current_medications: patient.current_medications || '',
        medical_history: patient.medical_history || '',
        chronic_conditions: patient.chronic_conditions || '',
        insurance_provider: patient.insurance_provider || '',
        insurance_policy_number: patient.insurance_policy_number || patient.insurance_number || '',
        
        // Mexican official fields
        curp: patient.curp || '',
        rfc: patient.rfc || '',
        
        // Technical fields
        active: patient.active !== false,
        is_active: patient.is_active !== false,
        address_postal_code: patient.address_postal_code || patient.zip_code || patient.postal_code || ''
      };
      
      setPatientFormData(syncedFormData);
      } else {
        // Create mode: reset form to initial empty values
        setPatientFormData(initialPatientFormData);
        setFieldErrors({});
        setFormErrorMessage('');
      }
    }
  }, [patientManagement.patientDialogOpen, patientManagement.isEditingPatient, patientManagement.selectedPatient]);

  // Appointment Dialog States

  // Clinical Study States
  const [clinicalStudyDialogOpen, setClinicalStudyDialogOpen] = useState(false);
  
  const [isEditingClinicalStudy, setIsEditingClinicalStudy] = useState(false);
  const [selectedClinicalStudy, setSelectedClinicalStudy] = useState<ClinicalStudy | null>(null);
  const [clinicalStudyFormData, setClinicalStudyFormData] = useState<ClinicalStudyFormData>({
    consultation_id: 0,
    patient_id: 0,
    study_type: 'hematologia',
    study_name: '',
    study_description: '',
    ordered_date: '',
    status: 'pending',
    results_text: '',
    interpretation: '',
    ordering_doctor: '',
    performing_doctor: '',
    institution: '',
    urgency: 'normal',
    clinical_indication: '',
    relevant_history: '',
    created_by: ''
  });
  const [clinicalStudyFormErrorMessage, setClinicalStudyFormErrorMessage] = useState('');
  const [clinicalStudyFieldErrors, setClinicalStudyFieldErrors] = useState<{[key: string]: string}>({});
  const [isClinicalStudySubmitting, setIsClinicalStudySubmitting] = useState(false);
  
  // Logout dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Dashboard data loading
  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiService.getDashboardData();
      setDashboardData(response);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [isAuthenticated]);

  // Medical records loading
  const refreshMedicalRecords = useCallback(async () => {
    try {
      const response = await apiService.getMedicalRecords();
      setMedicalRecordsData(response);
  } catch (error) {
      console.error('Error loading medical records:', error);
      setMedicalRecordsData([]);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && activeView === 'dashboard') {
      refreshDashboard();
    }
  }, [isAuthenticated, activeView, refreshDashboard]);

  useEffect(() => {
    if (activeView === 'medical-records') {
      refreshMedicalRecords();
    }
  }, [activeView, refreshMedicalRecords]);

  // Fetch patients when view changes to patients
  useEffect(() => {
    if (activeView === 'patients' && isAuthenticated) {
      patientManagement.fetchPatients();
      // Also fetch consultations to calculate patient consultation counts
      consultationManagement.fetchConsultations();
    }
  }, [activeView, isAuthenticated]); // Removed user and patientManagement dependencies


  // Fetch consultations when view changes to consultations
  useEffect(() => {
    if (activeView === 'consultations' && isAuthenticated) {
      consultationManagement.fetchConsultations();
    }
  }, [activeView, isAuthenticated]); // Removed dependencies that change constantly


  // Helper function to get clinical studies for current consultation
  const getCurrentConsultationStudies = (): ClinicalStudy[] => {
    return consultationManagement.consultationStudies || [];
  };

  // Reactive clinical studies for current consultation
  const currentConsultationStudies = getCurrentConsultationStudies();

  // Helper function to update clinical studies for current consultation
  const updateCurrentConsultationStudies = (studies: ClinicalStudy[]) => {
    consultationManagement.setConsultationStudies(studies);
  };

  // User menu handlers
  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);


  const handleLogout = useCallback(() => {
    handleUserMenuClose();
    setLogoutDialogOpen(true);
  }, []);

  // Logout handlers
  const cancelLogout = () => setLogoutDialogOpen(false);
  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
  };

  // Consultation handlers
  const handleNewConsultation = useCallback(() => { 
    consultationManagement.openConsultationDialog(); 
  }, []); // Removed consultationManagement dependency to prevent infinite loops

const handleEditConsultation = useCallback(async (consultation: any) => {
  consultationManagement.setSelectedConsultation(consultation);
  consultationManagement.setIsEditingConsultation(true);
  consultationManagement.setConsultationFormData({
      // Basic fields
      id: consultation.id,
      patient_id: consultation.patient_id,
      date: consultation.date || consultation.consultation_date || '',
      consultation_date: consultation.consultation_date,
      consultation_time: consultation.consultation_time,
      
      // Required fields with defaults
      chief_complaint: consultation.chief_complaint || consultation.reason || '',
    history_present_illness: consultation.history_present_illness || '',
      
      // Antecedentes (required fields)
    family_history: consultation.family_history || '',
    personal_pathological_history: consultation.personal_pathological_history || '',
    personal_non_pathological_history: consultation.personal_non_pathological_history || '',
      
      // Physical examination and diagnosis (required)
    physical_examination: consultation.physical_examination || '',
      primary_diagnosis: consultation.primary_diagnosis || consultation.diagnosis || '',
    secondary_diagnoses: consultation.secondary_diagnoses || '',
      treatment_plan: consultation.treatment_plan || consultation.treatment || '',
    therapeutic_plan: consultation.therapeutic_plan || '',
    prognosis: consultation.prognosis || '',
    laboratory_results: consultation.laboratory_results || '',
    imaging_studies: consultation.imaging_studies || '',
    interconsultations: consultation.interconsultations || '',
    doctor_name: consultation.doctor_name || '',
    doctor_professional_license: consultation.doctor_professional_license || '',
      doctor_specialty: consultation.doctor_specialty || '',
      
      // Optional fields
      reason: consultation.reason || '',
      symptoms: consultation.symptoms || '',
      diagnosis: consultation.diagnosis || '',
      treatment: consultation.treatment || '',
      notes: consultation.notes || '',
      follow_up_date: consultation.follow_up_date || '',
      follow_up_instructions: consultation.follow_up_instructions || '',
      status: consultation.status || 'completed',
      consultation_type: consultation.consultation_type || 'general',
      vital_signs: consultation.vital_signs || {
        blood_pressure: '',
        heart_rate: '',
        temperature: '',
        weight: '',
        height: ''
      },
      created_by: consultation.created_by || ''
    });
    
    await consultationManagement.loadConsultationStudies(consultation.id);
  consultationManagement.setConsultationDialogOpen(true);
  setFormErrorMessage('');
  consultationManagement.setConsultationDetailView(false);
  }, []); // Removed consultationManagement dependency

const handleViewConsultation = useCallback(async (consultation: any) => {
  consultationManagement.setSelectedConsultation(consultation);
  consultationManagement.setConsultationDetailView(true);
    await consultationManagement.loadConsultationStudies(consultation.id);
  }, []); // Removed consultationManagement dependency

  // Patient handlers
  const handleNewPatient = useCallback(() => {
    console.log('🆕 Creating new patient - resetting form state...');
    console.log('📋 Previous form state:', patientFormData);
    console.log('📋 Initial form state:', initialPatientFormData);

    patientManagement.resetPatientForm();
    patientManagement.setIsEditingPatient(false);
    setFormErrorMessage('');
    // Reset local form state to initial empty values
    setPatientFormData(initialPatientFormData);

    console.log('✅ Form state reset completed');
    patientManagement.setPatientDialogOpen(true);
  }, [initialPatientFormData, patientFormData]); // Added dependencies

  const handleEditPatient = (patient: Patient) => {
    // Debug: log patient data to see emergency contact fields
    console.log('🔍 Patient data for editing:', patient);
    console.log('🔍 Emergency contact fields:', {
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_phone: patient.emergency_contact_phone,
      emergency_contact_relationship: patient.emergency_contact_relationship
    });

    const newFormData = {
      // Basic information
      first_name: patient.first_name || '',
      paternal_surname: patient.paternal_surname || '',
      maternal_surname: patient.maternal_surname || '',
      email: patient.email || '',
      date_of_birth: patient.date_of_birth || patient.birth_date || '',
      birth_date: patient.birth_date || patient.date_of_birth || '',
      phone: patient.phone || patient.primary_phone || '',
      primary_phone: patient.primary_phone || patient.phone || '',
      gender: patient.gender || '',
      civil_status: patient.civil_status || '',
      
      // Personal details (added fields)
      birth_city: patient.birth_city || '',
      birth_state_id: patient.birth_state_id ? String(patient.birth_state_id) : '',
      
      // Address
      address: patient.address || '',
      address_street: patient.address || '',
      city: patient.city || '',
      address_city: patient.city || '',
      state: patient.state || '',
      address_state_id: patient.state || '',
      zip_code: patient.zip_code || patient.postal_code || '',
      country: patient.country || 'México',
      
      // Emergency contact
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      emergency_contact_relationship: patient.emergency_contact_relationship || '',
      
      // Medical information
      blood_type: patient.blood_type || '',
      allergies: patient.allergies || '',
      current_medications: patient.current_medications || '',
      medical_history: patient.medical_history || '',
      chronic_conditions: patient.chronic_conditions || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_policy_number: patient.insurance_policy_number || patient.insurance_number || '',
      
      // Mexican official fields
      curp: patient.curp || '',
      rfc: patient.rfc || '',
      
      // Technical fields
      active: patient.active !== false,
      is_active: patient.is_active !== false,
      address_postal_code: patient.postal_code || patient.zip_code || ''
    };
    
    // Update form data first
    setPatientFormData(newFormData);
    
    // Set patient management states directly
    patientManagement.setSelectedPatient(patient);
    patientManagement.setIsEditingPatient(true);
    patientManagement.setPatientDialogOpen(true);
  };

  // Field change handler for patient form
  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setPatientFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  }, [fieldErrors, setFieldErrors]);

  // Enhanced client-side validation
  const validatePatientForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Required fields validation
    if (!patientFormData.first_name?.trim()) {
      errors.first_name = 'El nombre es requerido';
    }
    if (!patientFormData.paternal_surname?.trim()) {
      errors.paternal_surname = 'El apellido paterno es requerido';
    }
    if (!patientFormData.birth_date) {
      errors.birth_date = 'La fecha de nacimiento es requerida';
    }
    if (!patientFormData.gender) {
      errors.gender = 'El género es requerido';
    }
    if (!patientFormData.primary_phone?.trim()) {
      errors.primary_phone = 'El teléfono es requerido';
    }
    
    // Format validations
    if (patientFormData.primary_phone && !/^\d{10,15}$/.test(patientFormData.primary_phone.replace(/\s/g, ''))) {
      errors.primary_phone = 'El teléfono debe contener entre 10 y 15 dígitos';
    }
    
    if (patientFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientFormData.email)) {
      errors.email = 'El formato del email no es válido';
    }
    
    if (patientFormData.curp && patientFormData.curp.length !== 18) {
      errors.curp = 'El CURP debe tener exactamente 18 caracteres';
    }
    
    if (patientFormData.rfc && (patientFormData.rfc.length < 10 || patientFormData.rfc.length > 13)) {
      errors.rfc = 'El RFC debe tener entre 10 y 13 caracteres';
    }
    
    // Age validation
    if (patientFormData.birth_date) {
      const birthDate = new Date(patientFormData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age > 150 || birthDate > today) {
        errors.birth_date = 'La fecha de nacimiento no es válida';
      }
    }
    
    setFieldErrors(errors);
    
    // Generate a detailed error message if validation fails
    if (Object.keys(errors).length > 0) {
      const errorList = Object.values(errors);
      setFormErrorMessage(`Se encontraron ${errorList.length} error${errorList.length !== 1 ? 'es' : ''}:\n• ${errorList.join('\n• ')}`);
      return false;
    }
    
    // Clear error message if validation passes
    setFormErrorMessage('');
    return true;
  };

  // Clean patient data before sending to backend
  const cleanPatientDataForBackend = (data: PatientFormData) => {
    const cleaned = { ...data };
    
    // Convert empty strings to null for integer fields that are optional
    if (cleaned.address_state_id === '' || cleaned.address_state_id === undefined) {
      cleaned.address_state_id = null as any;
    } else if (typeof cleaned.address_state_id === 'string') {
      // Convert string numbers to actual numbers
      const parsed = parseInt(cleaned.address_state_id, 10);
      cleaned.address_state_id = isNaN(parsed) ? null as any : parsed as any;
    }
    
    return cleaned;
  };

  // Patient form submission
  const handlePatientSubmit = async () => {
    setIsSubmitting(true);
    setFormErrorMessage('');

    // Client-side validation first
    if (!validatePatientForm()) {
      const errorFields = Object.entries(fieldErrors);
      const errorCount = errorFields.length;
      
      // Create detailed error message
      const fieldTranslations: {[key: string]: string} = {
        'first_name': 'Nombre',
        'paternal_surname': 'Apellido Paterno', 
        'maternal_surname': 'Apellido Materno',
        'birth_date': 'Fecha de Nacimiento',
        'gender': 'Género',
        'primary_phone': 'Teléfono',
        'email': 'Email',
        'curp': 'CURP',
        'rfc': 'RFC',
        'civil_status': 'Estado Civil'
      };
      
      const errorList = errorFields.map(([field, message]) => {
        const translatedField = fieldTranslations[field] || field;
        return `• ${translatedField}: ${message}`;
      }).join('\n');
      
      setFormErrorMessage(`Por favor corrija los siguientes ${errorCount} error${errorCount !== 1 ? 'es' : ''}:\n\n${errorList}`);
      setIsSubmitting(false);
      return;
    }

    try {
      // Clean data before sending to backend
      const cleanedData = cleanPatientDataForBackend(patientFormData);
      
      if (patientManagement.isEditingPatient && patientManagement.selectedPatient) {
        await apiService.updatePatient(patientManagement.selectedPatient.id, cleanedData);
        await patientManagement.fetchPatients();
        patientManagement.setPatientDialogOpen(false);
        patientManagement.resetPatientForm();
        setFieldErrors({});
        showSuccessMessage(`✅ El paciente fue actualizado exitosamente`);
      } else {
        const newPatient = await apiService.createPatient(cleanedData);
        await patientManagement.fetchPatients();
        patientManagement.setPatientDialogOpen(false);
        
        if (consultationManagement.creatingPatientFromConsultation) {
          consultationManagement.setCreatingPatientFromConsultation(false);
          consultationManagement.setConsultationDialogOpen(true);
          consultationManagement.setConsultationFormData(prev => ({
            ...prev,
            patient_id: newPatient.id
          }));
        }
        
        showSuccessMessage(`✅ Paciente ${patientFormData.first_name} ${patientFormData.paternal_surname} creado exitosamente`);
      }
    } catch (error: any) {
      console.error('Error submitting patient:', error);
      
      // Enhanced error handling with specific messages
      const errorMessage = error.message || 'Error desconocido';
      
      // Check if it's a validation error with field-specific details
      if (error.response?.status === 422 && error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          const fieldErrorsFromServer: {[key: string]: string} = {};
          const fieldTranslations: {[key: string]: string} = {
            'first_name': 'Nombre',
            'paternal_surname': 'Apellido Paterno', 
            'maternal_surname': 'Apellido Materno',
            'birth_date': 'Fecha de Nacimiento',
            'gender': 'Género',
            'primary_phone': 'Teléfono',
            'email': 'Email',
            'curp': 'CURP',
            'rfc': 'RFC',
            'civil_status': 'Estado Civil'
          };
          
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.msg) {
              const field = err.loc[err.loc.length - 1];
              const translatedField = fieldTranslations[field] || field;
              fieldErrorsFromServer[field] = `${translatedField}: ${err.msg}`;
            }
          });
          setFieldErrors(fieldErrorsFromServer);
          
          // Create a detailed error message listing specific issues
          const errorList = Object.values(fieldErrorsFromServer);
          if (errorList.length > 0) {
            setFormErrorMessage(`Se encontraron ${errorList.length} error${errorList.length !== 1 ? 'es' : ''}:\n• ${errorList.join('\n• ')}`);
          } else {
            setFormErrorMessage('Por favor corrija los errores marcados en el formulario');
          }
        } else {
          setFormErrorMessage(error.response.data.detail);
        }
      } else if (error.response?.status === 409) {
        // Conflict errors (patient already exists)
        setFormErrorMessage(errorMessage);
      } else if (error.response?.status === 400) {
        // Bad request
        setFormErrorMessage(`Datos inválidos: ${errorMessage}`);
      } else if (error.response?.status >= 500) {
        // Server errors
        setFormErrorMessage('Error interno del servidor. Por favor, contacte al soporte técnico');
      } else if (!error.response) {
        // Network errors
        setFormErrorMessage('Error de conexión. Verifique su internet e intente nuevamente');
  } else {
        // Use the specific error message from the API service
        setFormErrorMessage(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Consultation form submission
const handleConsultationSubmit = useCallback(async () => {
  console.log('🔄 handleConsultationSubmit called - starting consultation submission');
  setIsSubmitting(true);
  setFormErrorMessage('');
    setFieldErrors({});
  
  try {
    await submitConsultation({
      isEditing: consultationManagement.isEditingConsultation,
      selectedConsultation: consultationManagement.selectedConsultation,
        formData: consultationManagement.consultationFormData,
      tempConsultationId: consultationManagement.tempConsultationId,
        consultationStudies: getCurrentConsultationStudies(),
        setFormErrorMessage,
        setFieldErrors,
        setIsSubmitting,
      setTempClinicalStudies: consultationManagement.setTempClinicalStudies,
      showSuccessMessage,
      onSuccess: async () => {
        consultationManagement.setConsultationDialogOpen(false);
          await consultationManagement.fetchConsultations();
        }
      });
    } catch (error) {
      console.error('Consultation submission failed:', error);
    }
  }, [getCurrentConsultationStudies, setFormErrorMessage, setFieldErrors, setIsSubmitting, showSuccessMessage]); // Removed consultationManagement dependency

// Clinical Studies handlers
const handleAddClinicalStudy = useCallback(() => {
  let consultationId: string | number;
  let patientId: string | number;
  
  if (consultationManagement.selectedConsultation) {
    // Consulta existente seleccionada
    consultationId = consultationManagement.selectedConsultation.id;
    patientId = consultationManagement.selectedConsultation.patient_id;
    } else if (consultationManagement.tempConsultationId) {
    // Consulta nueva con ID temporal
      consultationId = consultationManagement.tempConsultationId;
      patientId = consultationManagement.consultationFormData.patient_id;
  } else {
    // No hay consulta - crear ID temporal para nueva consulta
    const newTempId = `temp_consultation_${Date.now()}`;
    consultationManagement.setTempConsultationId(newTempId);
    consultationId = newTempId;
    patientId = consultationManagement.consultationFormData.patient_id || '';
  }
    
    // Si no hay paciente, se seleccionará en el dialog de estudio clínico
    // No es necesario validar patientId aquí

    // Formatear información completa del médico solicitante
    const formatDoctorFullInfo = (doctorProfile: any, user: any) => {
      if (doctorProfile) {
        const title = doctorProfile.title || 'Dr.';
        const firstName = doctorProfile.first_name || '';
        const paternalSurname = doctorProfile.paternal_surname || '';
        const maternalSurname = doctorProfile.maternal_surname || '';
        const license = doctorProfile.professional_license || '';
        
        let fullName = `${title} ${firstName} ${paternalSurname}`;
        if (maternalSurname) {
          fullName += ` ${maternalSurname}`;
        }
        
        if (license) {
          fullName += ` - Cédula Profesional: ${license}`;
        }
        
        return fullName;
      }
      
      return user?.person?.full_name || 'Dr. García';
    };

    const orderingDoctorInfo = formatDoctorFullInfo(doctorProfile, user);

    setClinicalStudyFormData({
      consultation_id: consultationId,
      patient_id: patientId || 0,
      study_type: 'hematologia',
    study_name: '',
    study_description: '',
      ordered_date: new Date().toISOString().split('T')[0],
      status: 'pending',
    results_text: '',
    interpretation: '',
      ordering_doctor: orderingDoctorInfo,
    performing_doctor: '',
    institution: '',
    urgency: 'normal',
    clinical_indication: '',
    relevant_history: '',
      created_by: orderingDoctorInfo
    });
  
    setSelectedClinicalStudy(null);
    setIsEditingClinicalStudy(false);
    setClinicalStudyDialogOpen(true);
  setClinicalStudyFormErrorMessage('');
  setClinicalStudyFieldErrors({});
}, [consultationManagement.selectedConsultation, consultationManagement.tempConsultationId, consultationManagement.consultationFormData.patient_id, consultationManagement.setTempConsultationId, user?.person?.full_name, doctorProfile]);

const handleEditClinicalStudy = useCallback((study: ClinicalStudy) => {
  setSelectedClinicalStudy(study);
  setIsEditingClinicalStudy(true);
  setClinicalStudyFormData({
    consultation_id: study.consultation_id,
    patient_id: study.patient_id,
    study_type: study.study_type,
    study_name: study.study_name,
    study_description: study.study_description || '',
      ordered_date: study.ordered_date,
    status: study.status,
    results_text: study.results_text || '',
    interpretation: study.interpretation || '',
      ordering_doctor: study.ordering_doctor || '',
    performing_doctor: study.performing_doctor || '',
    institution: study.institution || '',
    urgency: study.urgency || 'normal',
    clinical_indication: study.clinical_indication || '',
    relevant_history: study.relevant_history || '',
      created_by: study.created_by || ''
  });
    setClinicalStudyDialogOpen(true);
  setClinicalStudyFormErrorMessage('');
  setClinicalStudyFieldErrors({});
}, []);

const handleDeleteClinicalStudy = useCallback((studyId: string | number) => {
  if (!consultationManagement.selectedConsultation) {
    console.error('❌ No hay consulta seleccionada para eliminar estudio');
    return;
  }
  
  const currentStudies = getCurrentConsultationStudies();
    const updatedStudies = currentStudies.filter(study => study.id !== studyId);
  updateCurrentConsultationStudies(updatedStudies);
}, [getCurrentConsultationStudies, updateCurrentConsultationStudies]); // Removed consultationManagement dependency

const handleClinicalStudySubmit = useCallback(async () => {
  if (!consultationManagement.selectedConsultation && !consultationManagement.tempConsultationId) {
    console.error('❌ No hay consulta seleccionada ni ID temporal');
      setClinicalStudyFormErrorMessage('Error: No hay consulta asociada');
    return;
  }

  setIsClinicalStudySubmitting(true);
  setClinicalStudyFormErrorMessage('');
    setClinicalStudyFieldErrors({});

    try {
      let savedStudy: ClinicalStudy;
      if (isEditingClinicalStudy && selectedClinicalStudy) {
        savedStudy = await apiService.updateClinicalStudy(selectedClinicalStudy.id, clinicalStudyFormData);
        logger.user.updated('Estudio clínico', savedStudy.study_name || 'Estudio');
      } else {
        savedStudy = await apiService.createClinicalStudy(clinicalStudyFormData);
        logger.user.created('Estudio clínico', savedStudy.study_name || 'Estudio');
      }

      const currentStudies = getCurrentConsultationStudies();
      let updatedStudies;
      
      if (isEditingClinicalStudy) {
        updatedStudies = currentStudies.map(study => 
          study.id === selectedClinicalStudy?.id ? savedStudy : study
        );
    } else {
        updatedStudies = [...currentStudies, savedStudy];
      }
      
      updateCurrentConsultationStudies(updatedStudies);
    
    setClinicalStudyDialogOpen(false);
    setSelectedClinicalStudy(null);
    setIsEditingClinicalStudy(false);
    
      const action = isEditingClinicalStudy ? 'actualizado' : 'creado';
      showSuccessMessage(`✅ Estudio clínico ${action} exitosamente`);
  } catch (error: any) {
      console.error('❌ Error al procesar estudio clínico:', error);
      
    if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          setClinicalStudyFormErrorMessage(error.response.data.detail);
        } else if (Array.isArray(error.response.data.detail)) {
          const fieldErrorsFromServer: {[key: string]: string} = {};
          error.response.data.detail.forEach((err: any) => {
            if (err.loc && err.msg) {
              const field = err.loc[err.loc.length - 1];
              fieldErrorsFromServer[field] = err.msg;
            }
          });
          setClinicalStudyFieldErrors(fieldErrorsFromServer);
          setClinicalStudyFormErrorMessage('Por favor corrija los errores en el formulario');
        }
    } else {
        setClinicalStudyFormErrorMessage('Error al procesar la solicitud. Inténtelo de nuevo.');
      }
  } finally {
      setIsClinicalStudySubmitting(false);
    }
  }, [isEditingClinicalStudy, selectedClinicalStudy, clinicalStudyFormData, getCurrentConsultationStudies, updateCurrentConsultationStudies, showSuccessMessage]); // Removed consultationManagement dependencies

  // Appointment handlers  
  const handleAppointmentSubmit = async () => {
    setIsSubmitting(true);
  setFormErrorMessage('');
    
    try {
      // Use the appointment manager's submit handler directly
      await appointmentManager.handleAppointmentSubmit();
  } catch (error: any) {
      console.error('Error submitting appointment:', error);
      setFormErrorMessage(error.response?.data?.detail || 'Error al procesar la cita');
  } finally {
    setIsSubmitting(false);
    }
  };


  return (
        <ProtectedRoute>
      <AppLayout
        activeView={activeView}
        onViewChange={setActiveView}
                    dashboardData={dashboardData} 
        onRefreshDashboard={refreshDashboard}
        patientManagement={patientManagement}
        consultationManagement={consultationManagement}
        appointmentManager={appointmentManager}
        medicalRecordsData={medicalRecordsData}
        onRefreshRecords={refreshMedicalRecords}
        doctorProfile={null}
        onSaveProfile={() => {}}
        onLogout={handleLogout}
        user={user}
        isLoading={patientManagement.isLoading || consultationManagement.isLoading || appointmentManager.isLoading}
        doctorProfileHook={doctorProfileHook}
      />

      {/* Dialog Components - These remain here as they're globally managed */}

        {/* Patient Dialog */}
        {patientManagement.patientDialogOpen && (
          <Suspense fallback={<LoadingFallback message="Cargando formulario..." />}>
            <PatientDialog
              key={`patient-dialog-${patientManagement.isEditingPatient ? 'edit' : 'create'}-${patientManagement.selectedPatient?.id || 'new'}`}
              open={patientManagement.patientDialogOpen}
            onClose={() => {
              patientManagement.setPatientDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            isEditing={patientManagement.isEditingPatient}
            formData={patientFormData}
            onFormDataChange={handleFieldChange}
            onSubmit={handlePatientSubmit}
            fieldErrors={fieldErrors}
            formErrorMessage={formErrorMessage}
            setFormErrorMessage={setFormErrorMessage}
            selectedPatient={patientManagement.selectedPatient}
            isSubmitting={isSubmitting}
          onDelete={patientManagement.isEditingPatient ? async () => {
            if (!patientManagement.selectedPatient) return;
            setIsSubmitting(true);
            try {
              await apiService.deletePatient(patientManagement.selectedPatient.id);
              patientManagement.setPatientDialogOpen(false);
              patientManagement.resetPatientForm();
              setFieldErrors({});
              setActiveView('patients');
              await patientManagement.fetchPatients();
              showSuccessMessage('✅ Paciente eliminado exitosamente');
            } catch (error: any) {
              setFormErrorMessage(error.response?.data?.detail || 'Error al eliminar paciente');
            } finally {
              setIsSubmitting(false);
            }
          } : undefined}
            />
          </Suspense>
        )}

        {/* Consultation Dialog */}
        {consultationManagement.consultationDialogOpen && (
          <Suspense fallback={<LoadingFallback message="Cargando formulario de consulta..." />}>
            <ConsultationDialog
              open={consultationManagement.consultationDialogOpen}
            onClose={() => {
              consultationManagement.setConsultationDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            isEditing={consultationManagement.isEditingConsultation}
            formData={consultationManagement.consultationFormData}
            setFormData={consultationManagement.setConsultationFormData}
            onSubmit={handleConsultationSubmit}
            patients={patientManagement.patients}
            appointments={consultationManagement.allAvailableAppointments}
            formErrorMessage={formErrorMessage}
            setFormErrorMessage={setFormErrorMessage}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
            onCreateNewPatient={() => {
              consultationManagement.setConsultationDialogOpen(false);
              patientManagement.setIsEditingPatient(false);
              consultationManagement.setCreatingPatientFromConsultation(true);
              patientManagement.setPatientDialogOpen(true);
            }}
            onEditPatient={(patient: Patient) => {
              consultationManagement.setConsultationDialogOpen(false);
              patientManagement.setIsEditingPatient(true);
              patientManagement.setSelectedPatient(patient);
              patientManagement.setPatientDialogOpen(true);
            }}
            clinicalStudies={currentConsultationStudies}
            onAddClinicalStudy={handleAddClinicalStudy}
            onEditClinicalStudy={handleEditClinicalStudy}
            onDeleteClinicalStudy={(studyId: string | number) => handleDeleteClinicalStudy(typeof studyId === 'string' ? parseInt(studyId) : studyId)}
            selectedConsultation={consultationManagement.selectedConsultation}
            tempConsultationId={consultationManagement.tempConsultationId}
          onCreateAppointment={async (appointmentData: any) => {
            try {
              logger.api.request('create-appointment', 'POST', appointmentData);
              
              // Instead of using the form state, directly call the API with the data
              await appointmentManager.createAppointmentDirect(appointmentData);
              showSuccessMessage('✅ Cita de seguimiento creada exitosamente');
            } catch (error: any) {
              logger.api.error('create-appointment', error);
              setFormErrorMessage(error.response?.data?.detail || 'Error al crear cita de seguimiento');
            }
          }}
            />
          </Suspense>
        )}

        {/* Appointment Dialog */}
        {appointmentManager.appointmentDialogOpen && (
          <Suspense fallback={<LoadingFallback message="Cargando formulario de cita..." />}>
            <AppointmentDialog
              open={appointmentManager.appointmentDialogOpen}
              onClose={() => {
                appointmentManager.setAppointmentDialogOpen(false);
                setFormErrorMessage('');
                setFieldErrors({});
              }}
              onSubmit={appointmentManager.handleAppointmentSubmit}
              onNewPatient={() => {
                appointmentManager.setAppointmentDialogOpen(false);
                patientManagement.setIsEditingPatient(false);
                consultationManagement.setCreatingPatientFromConsultation(true);
                patientManagement.setPatientDialogOpen(true);
              }}
              formData={appointmentManager.appointmentFormData}
              patients={patientManagement.patients}
              isEditing={appointmentManager.isEditingAppointment}
              loading={isSubmitting}
              formErrorMessage={formErrorMessage}
              fieldErrors={appointmentManager.fieldErrors}
              onFormDataChange={appointmentManager.setAppointmentFormData}
              doctorProfile={appointmentManager.doctorProfile}
            />
          </Suspense>
        )}

        {/* Doctor Profile Dialog */}
        {doctorProfileDialogOpenFromHook && (
          <Suspense fallback={<LoadingFallback message="Cargando perfil..." />}>
            <DoctorProfileDialog
              open={doctorProfileDialogOpenFromHook}
            onClose={() => {
              console.log('🔍 DIALOG: onClose called');
              handleCancelFromHook();
            }}
            isEditing={isEditingFromHook}
            formData={formDataFromHook}
            setFormData={setFormDataFromHook}
            onSubmit={() => {
              console.log('🔍 DIALOG: onSubmit called');
              handleSubmitFromHook();
            }}
            formErrorMessage={formErrorMessageFromHook}
            setFormErrorMessage={setFormErrorMessageFromHook}
            isSubmitting={isSubmittingFromHook}
            fieldErrors={fieldErrorsFromHook}
            />
          </Suspense>
        )}

        {/* Clinical Study Dialog */}
        {clinicalStudyDialogOpen && (
          <Suspense fallback={<LoadingFallback message="Cargando formulario de estudio clínico..." />}>
            <ClinicalStudyDialog
              open={clinicalStudyDialogOpen}
              onClose={() => {
                setClinicalStudyDialogOpen(false);
                setSelectedClinicalStudy(null);
                setIsEditingClinicalStudy(false);
                setClinicalStudyFormErrorMessage('');
                setClinicalStudyFieldErrors({});
              }}
              isEditing={isEditingClinicalStudy}
              formData={clinicalStudyFormData}
              setFormData={setClinicalStudyFormData}
              onSubmit={handleClinicalStudySubmit}
              formErrorMessage={clinicalStudyFormErrorMessage}
              setFormErrorMessage={setClinicalStudyFormErrorMessage}
              isSubmitting={isClinicalStudySubmitting}
              fieldErrors={clinicalStudyFieldErrors}
            />
          </Suspense>
        )}

        {/* Logout Confirmation Dialog */}
        <LogoutConfirmDialog
          open={logoutDialogOpen}
          onClose={cancelLogout}
          onConfirm={confirmLogout}
          userName={user?.person?.full_name || 'Usuario'}
        />
        </ProtectedRoute>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
