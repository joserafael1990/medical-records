import { useState, useEffect, useCallback } from 'react';
import { Patient, PatientFormData } from '../types';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { useScrollToError } from './useScrollToError';
import { disablePaymentDetection } from '../utils/disablePaymentDetection';

export interface EmergencyRelationship {
  code: string;
  name: string;
}

export interface UsePatientDialogProps {
  patient?: Patient | null;
  onSubmit: (data: PatientFormData) => Promise<void>;
  doctorProfile?: any;
}

export interface UsePatientDialogReturn {
  // Form state
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
  
  // Loading states
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Error handling
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  // Dialog states
  privacyConsentDialogOpen: boolean;
  setPrivacyConsentDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  arcoRequestDialogOpen: boolean;
  setArcoRequestDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Data
  emergencyRelationships: EmergencyRelationship[];
  countries: Array<{id: number, name: string}>;
  states: Array<{id: number, name: string}>;
  birthStates: Array<{id: number, name: string}>;
  
  // Actions
  handleInputChange: (field: string, value: any) => void;
  handleSubmit: () => Promise<void>;
  handleReset: () => void;
  handleClose: () => void;
  loadStatesForCountry: (countryId: string, type: 'address' | 'birth') => Promise<void>;
  
  // Validation
  validateForm: () => boolean;
  validateField: (field: string, value: any) => string;
  
  // Error refs
  errorRef: React.RefObject<HTMLDivElement>;
}

export const usePatientDialog = ({
  patient,
  onSubmit,
  doctorProfile
}: UsePatientDialogProps): UsePatientDialogReturn => {
  const { showSuccess, showError } = useToast();
  const isEditing = !!patient;
  
  // Form state
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    date_of_birth: '',
    gender: '',
    email: '',
    primary_phone: '',
    phone: '',
    home_address: '',
    curp: '',
    rfc: '',
    civil_status: '',
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
    medical_history: '',
    insurance_provider: '',
    insurance_number: '',
    active: true,
    is_active: true
  });
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Error handling
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Dialog states
  const [privacyConsentDialogOpen, setPrivacyConsentDialogOpen] = useState(false);
  const [arcoRequestDialogOpen, setArcoRequestDialogOpen] = useState(false);
  
  // Data
  const [emergencyRelationships, setEmergencyRelationships] = useState<EmergencyRelationship[]>([]);
  const [countries, setCountries] = useState<Array<{id: number, name: string}>>([]);
  const [states, setStates] = useState<Array<{id: number, name: string}>>([]);
  const [birthStates, setBirthStates] = useState<Array<{id: number, name: string}>>([]);
  
  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToError(error);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Disable payment detection for insurance fields
        setTimeout(() => {
          disablePaymentDetection();
        }, 100);
        
        const [relationships, countriesData] = await Promise.all([
          apiService.getEmergencyRelationships(),
          apiService.getCountries()
        ]);
        
        setEmergencyRelationships(relationships);
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading data:', error);
        showError('Error al cargar datos del formulario');
      }
    };
    
    loadData();
  }, [showError]);
  
  // Load states when country IDs change
  useEffect(() => {
    const loadStatesForCountries = async () => {
      try {
        // Load states for address country
        if (formData.address_country_id) {
          const addressStatesData = await apiService.getStates(parseInt(formData.address_country_id));
          setStates(addressStatesData);
        }
        
        // Load states for birth country
        if (formData.birth_country_id) {
          const birthStatesData = await apiService.getStates(parseInt(formData.birth_country_id));
          setBirthStates(birthStatesData);
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    };
    
    loadStatesForCountries();
  }, [formData.address_country_id, formData.birth_country_id]);
  
  // Initialize form data when patient changes
  useEffect(() => {
    if (patient) {
      setFormData({
        first_name: patient.first_name || '',
        paternal_surname: patient.paternal_surname || '',
        maternal_surname: patient.maternal_surname || '',
        birth_date: patient.birth_date || '',
        date_of_birth: patient.birth_date || '',
        gender: patient.gender || '',
        email: patient.email || '',
        primary_phone: patient.primary_phone || '',
        phone: patient.primary_phone || '',
        home_address: patient.home_address || '',
        curp: patient.curp || '',
        rfc: patient.rfc || '',
        civil_status: patient.civil_status || '',
        address_city: patient.address_city || '',
        city: patient.address_city || '',
        address_state_id: patient.address_state_id || '',
        state: patient.address_state_id || '',
        address_postal_code: patient.address_postal_code || '',
        zip_code: patient.address_postal_code || '',
        address_country_id: patient.address_country_id || '',
        country: patient.address_country_id || '',
        birth_city: patient.birth_city || '',
        birth_state_id: patient.birth_state_id || '',
        birth_country_id: patient.birth_country_id || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        emergency_contact_relationship: patient.emergency_contact_relationship || '',
        medical_history: patient.medical_history || '',
        insurance_provider: patient.insurance_provider || '',
        insurance_number: patient.insurance_number || '',
        active: patient.active ?? true,
        is_active: patient.is_active ?? true
      });
    } else {
      // Reset form for new patient
      setFormData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        birth_date: '',
        date_of_birth: '',
        gender: '',
        email: '',
        primary_phone: '',
        phone: '',
        home_address: '',
        curp: '',
        rfc: '',
        civil_status: '',
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
        medical_history: '',
        insurance_provider: '',
        insurance_number: '',
        active: true,
        is_active: true
      });
    }
  }, [patient]);
  
  // Handle input change
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);
  
  // Validate individual field
  const validateField = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'first_name':
        return !value ? 'El nombre es obligatorio' : '';
      case 'paternal_surname':
        return !value ? 'El apellido paterno es obligatorio' : '';
      case 'email':
        if (!value) return 'El email es obligatorio';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'El email no es válido' : '';
      case 'primary_phone':
        return !value ? 'El teléfono es obligatorio' : '';
      case 'curp':
        if (!value) return 'El CURP es obligatorio';
        const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
        return !curpRegex.test(value) ? 'El CURP no es válido' : '';
      case 'birth_date':
        return !value ? 'La fecha de nacimiento es obligatoria' : '';
      case 'gender':
        return !value ? 'El género es obligatorio' : '';
      default:
        return '';
    }
  }, []);
  
  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const requiredFields = [
      'first_name', 'paternal_surname', 'email', 'primary_phone', 
      'curp', 'birth_date', 'gender'
    ];
    
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof PatientFormData]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);
  
  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      setError('Por favor corrige los errores en el formulario');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await onSubmit(formData);
      showSuccess(isEditing ? 'Paciente actualizado exitosamente' : 'Paciente creado exitosamente');
    } catch (error: any) {
      console.error('Error submitting patient:', error);
      setError(error.message || 'Error al guardar el paciente');
      showError(error.message || 'Error al guardar el paciente');
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, onSubmit, isEditing, showSuccess, showError]);
  
  // Handle reset
  const handleReset = useCallback(() => {
    setFormData({
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      birth_date: '',
      date_of_birth: '',
      gender: '',
      email: '',
      primary_phone: '',
      phone: '',
      home_address: '',
      curp: '',
      rfc: '',
      civil_status: '',
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
      medical_history: '',
      insurance_provider: '',
      insurance_number: '',
      active: true,
      is_active: true
    });
    setErrors({});
    setError('');
  }, []);
  
  // Handle close
  const handleClose = useCallback(() => {
    handleReset();
  }, [handleReset]);
  
  // Load states for specific country
  const loadStatesForCountry = useCallback(async (countryId: string, type: 'address' | 'birth') => {
    try {
      const statesData = await apiService.getStates(parseInt(countryId));
      if (type === 'address') {
        setStates(statesData);
      } else {
        setBirthStates(statesData);
      }
    } catch (error) {
      console.error('Error loading states:', error);
    }
  }, []);
  
  return {
    formData,
    setFormData,
    loading,
    setLoading,
    error,
    setError,
    errors,
    setErrors,
    privacyConsentDialogOpen,
    setPrivacyConsentDialogOpen,
    arcoRequestDialogOpen,
    setArcoRequestDialogOpen,
    emergencyRelationships,
    countries,
    states,
    birthStates,
    handleInputChange,
    handleSubmit,
    handleReset,
    handleClose,
    loadStatesForCountry,
    validateForm,
    validateField,
    errorRef
  };
};
