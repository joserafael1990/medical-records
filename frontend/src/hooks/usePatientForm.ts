import { useState, useEffect, useCallback } from 'react';
import { Patient, PatientFormData } from '../types';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';
import { extractCountryCode } from '../utils/countryCodes';
import { disablePaymentDetection } from '../utils/disablePaymentDetection';
import { AmplitudeService } from '../services/analytics/AmplitudeService';

export interface EmergencyRelationship {
  code: string;
  name: string;
}

export interface UsePatientFormProps {
  open: boolean;
  patient?: Patient | null;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onClose: () => void;
}

export interface UsePatientFormReturn {
  // Form state
  formData: PatientFormData;
  setFormData: React.Dispatch<React.SetStateAction<PatientFormData>>;
  loading: boolean;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  
  // Phone state
  phoneCountryCode: string;
  setPhoneCountryCode: React.Dispatch<React.SetStateAction<string>>;
  phoneNumber: string;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  
  // Documents state
  personalDocuments: Array<{
    document_id: number | null;
    document_value: string;
    id?: number;
  }>;
  setPersonalDocuments: React.Dispatch<React.SetStateAction<Array<{
    document_id: number | null;
    document_value: string;
    id?: number;
  }>>>;
  
  // Dialog states
  privacyConsentDialogOpen: boolean;
  setPrivacyConsentDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  arcoRequestDialogOpen: boolean;
  setArcoRequestDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Catalog data
  emergencyRelationships: EmergencyRelationship[];
  countries: Array<{id: number, name: string}>;
  states: Array<{id: number, name: string}>;
  birthStates: Array<{id: number, name: string}>;
  
  // Handlers
  handleChange: (field: keyof PatientFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>
  ) => void;
  handleCountryChange: (field: 'address_country_id' | 'birth_country_id', countryId: string) => Promise<void>;
  handlePhoneChange: (code: string, number: string) => void;
  handleSubmit: () => Promise<void>;
  handleClose: () => void;
  
  // Computed
  isEditing: boolean;
}

export const usePatientForm = (props: UsePatientFormProps): UsePatientFormReturn => {
  const { open, patient, onSubmit, onClose } = props;
  const isEditing = !!patient;
  const { showSuccess, showError } = useToast();
  
  // Estados separados para código de país y número telefónico
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('+52');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  
  // State for personal documents
  const [personalDocuments, setPersonalDocuments] = useState<Array<{
    document_id: number | null;
    document_value: string;
    id?: number;
  }>>([{ document_id: null, document_value: '' }]);

  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    birth_date: '',
    date_of_birth: '',
    gender: '',
    email: '',
    primary_phone: '',
    phone: '',
    home_address: '',
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [privacyConsentDialogOpen, setPrivacyConsentDialogOpen] = useState(false);
  const [arcoRequestDialogOpen, setArcoRequestDialogOpen] = useState(false);
  
  const [emergencyRelationships, setEmergencyRelationships] = useState<EmergencyRelationship[]>([]);
  const [countries, setCountries] = useState<Array<{id: number, name: string}>>([]);
  const [states, setStates] = useState<Array<{id: number, name: string}>>([]);
  const [birthStates, setBirthStates] = useState<Array<{id: number, name: string}>>([]);

  // Función helper para extraer código de país del número telefónico
  const extractPhoneData = useCallback((phone: string) => {
    const phoneData = extractCountryCode(phone || '');
    setPhoneCountryCode(phoneData.countryCode);
    setPhoneNumber(phoneData.number);
  }, []);

  // Load emergency relationships, countries and states when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        // Disable payment detection for insurance fields
        setTimeout(() => {
          disablePaymentDetection();
        }, 100);
        try {
          const [relationships, countriesData] = await Promise.all([
            apiService.catalogs.getEmergencyRelationships(),
            apiService.catalogs.getCountries()
          ]);
          logger.debug('Countries loaded', { count: countriesData.length }, 'api');
          setEmergencyRelationships(relationships);
          setCountries(countriesData);
        } catch (error) {
          logger.error('Error loading data', error, 'api');
        }
      }
    };
    loadData();
  }, [open]);

  // Load states when formData has country IDs
  useEffect(() => {
    const loadStatesForCountries = async () => {
      try {
        // Load states for address country
        if (formData.address_country_id) {
          const addressStatesData = await apiService.catalogs.getStates(parseInt(formData.address_country_id));
          setStates(addressStatesData);
        }
        
        // Load states for birth country
        if (formData.birth_country_id) {
          const birthStatesData = await apiService.catalogs.getStates(parseInt(formData.birth_country_id));
          setBirthStates(birthStatesData);
        }
      } catch (error) {
        logger.error('Error loading states for countries', error, 'api');
      }
    };

    if (formData.address_country_id || formData.birth_country_id) {
      loadStatesForCountries();
    }
  }, [formData.address_country_id, formData.birth_country_id]);

  // Load patient data when editing
  useEffect(() => {
    const loadPatientData = async () => {
      if (patient && open) {
        try {
          // Get decrypted patient data from API
          const decryptedPatient = await apiService.patients.getPatientById(patient.id.toString());
          extractPhoneData(decryptedPatient.primary_phone || '');
          
          // Load person documents
          const documents = await apiService.documents.getPersonDocuments(patient.id);
          const personalDocs = documents
            .filter(doc => doc.document?.document_type_id === 1) // Personal documents
            .map(doc => ({
              id: doc.id,
              document_id: doc.document_id,
              document_value: doc.document_value
            }));
          
          setPersonalDocuments(personalDocs.length > 0 ? personalDocs : [{ document_id: null, document_value: '' }]);
          
          setFormData({
            name: decryptedPatient.name || '',
            birth_date: decryptedPatient.birth_date || '',
            date_of_birth: decryptedPatient.birth_date || '',
            gender: decryptedPatient.gender || '',
            email: decryptedPatient.email || '',
            primary_phone: decryptedPatient.primary_phone || '',
            phone: decryptedPatient.primary_phone || '',
            home_address: decryptedPatient.home_address || '',
            civil_status: decryptedPatient.civil_status || '',
            address_city: decryptedPatient.address_city || '',
            city: decryptedPatient.address_city || '',
            address_state_id: decryptedPatient.address_state_id?.toString() || '',
            state: '',
            address_postal_code: decryptedPatient.address_postal_code || '',
            zip_code: decryptedPatient.address_postal_code || '',
            address_country_id: decryptedPatient.address_country_id?.toString() || '',
            country: '',
            birth_city: decryptedPatient.birth_city || '',
            birth_state_id: decryptedPatient.birth_state_id?.toString() || '',
            birth_country_id: decryptedPatient.birth_country_id?.toString() || '',
            emergency_contact_name: decryptedPatient.emergency_contact_name || '',
            emergency_contact_phone: decryptedPatient.emergency_contact_phone || '',
            emergency_contact_relationship: decryptedPatient.emergency_contact_relationship || '',
            medical_history: '',
            insurance_provider: decryptedPatient.insurance_provider || '',
            insurance_number: decryptedPatient.insurance_number || '',
            active: true,
            is_active: true
          });
        } catch (error) {
          logger.error('Error loading decrypted patient data', error, 'api');
          // Fallback to encrypted data if API call fails
          extractPhoneData(patient.primary_phone || '');
          
          // Try to load documents even if patient data fails
          try {
            const documents = await apiService.documents.getPersonDocuments(patient.id);
            const personalDocs = documents
              .filter(doc => doc.document?.document_type_id === 1)
              .map(doc => ({
                id: doc.id,
                document_id: doc.document_id,
                document_value: doc.document_value
              }));
            setPersonalDocuments(personalDocs.length > 0 ? personalDocs : [{ document_id: null, document_value: '' }]);
          } catch (docError) {
            logger.error('Error loading documents', docError, 'api');
            setPersonalDocuments([{ document_id: null, document_value: '' }]);
          }
          
          setFormData({
            name: patient.name || patient.full_name || '',
            birth_date: patient.birth_date || '',
            date_of_birth: patient.birth_date || '',
            gender: patient.gender || '',
            email: patient.email || '',
            primary_phone: patient.primary_phone || '',
            phone: patient.primary_phone || '',
            home_address: patient.home_address || '',
            civil_status: patient.civil_status || '',
            address_city: patient.address_city || '',
            city: patient.address_city || '',
            address_state_id: patient.address_state_id?.toString() || '',
            state: '',
            address_postal_code: patient.address_postal_code || '',
            zip_code: patient.address_postal_code || '',
            address_country_id: patient.address_country_id?.toString() || '',
            country: '',
            birth_city: patient.birth_city || '',
            birth_state_id: patient.birth_state_id?.toString() || '',
            birth_country_id: patient.birth_country_id?.toString() || '',
            emergency_contact_name: patient.emergency_contact_name || '',
            emergency_contact_phone: patient.emergency_contact_phone || '',
            emergency_contact_relationship: patient.emergency_contact_relationship || '',
            medical_history: '',
            insurance_provider: patient.insurance_provider || '',
            insurance_number: patient.insurance_number || '',
            active: true,
            is_active: true
          });
        }
      } else {
        // Reset form when creating new patient or when dialog closes
        setPhoneCountryCode('+52');
        setPhoneNumber('');
        setPersonalDocuments([{ document_id: null, document_value: '' }]);
        
        setFormData({
          name: '',
          birth_date: '',
          date_of_birth: '',
          gender: '',
          email: '',
          primary_phone: '',
          phone: '',
          home_address: '',
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
        setError('');
      }
    };

    loadPatientData();
  }, [patient, open, extractPhoneData]);

  const handleChange = useCallback((field: keyof PatientFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for gender
    if (field === 'gender') {
      if (!value || value.trim() === '') {
        setErrors(prev => ({ ...prev, gender: 'El género es obligatorio' }));
      } else {
        setErrors(prev => ({ ...prev, gender: '' }));
      }
    }
  }, [errors]);

  const handleCountryChange = useCallback(async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    setFormData(prev => ({ ...prev, [field]: countryId }));
    
    // Load states for selected country
    if (countryId) {
      try {
        const statesData = await apiService.catalogs.getStates(parseInt(countryId));
        if (field === 'address_country_id') {
          setStates(statesData);
        } else {
          setBirthStates(statesData);
        }
      } catch (error) {
        logger.error('Error loading states', error, 'api');
      }
    }
    
    // Clear related fields when country changes
    if (field === 'address_country_id') {
      setFormData(prev => ({ ...prev, address_state_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, birth_state_id: '' }));
    }
  }, []);

  const handlePhoneChange = useCallback((code: string, number: string) => {
    setPhoneCountryCode(code);
    // Solo permitir números
    const value = number.replace(/\D/g, '');
    setPhoneNumber(value);
    // Actualizar errores
    if (!value || value.trim() === '') {
      setErrors(prev => ({ ...prev, primary_phone: 'El número telefónico es obligatorio' }));
    } else {
      setErrors(prev => ({ ...prev, primary_phone: '' }));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setError('');
    
    // Track form validation attempt
    try {
      const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
      trackAmplitudeEvent('patient_form_validated');
    } catch (error) {
      // Silently fail
    }
    
    // Basic validation (todos los campos son opcionales según modelos actualizados)
    
    setLoading(true);
    try {
      // Concatenar código de país + número telefónico
      const formDataToSubmit: Record<string, any> = { ...formData };

      if (phoneNumber && phoneNumber.trim() !== '') {
        const fullPhoneNumber = `${phoneCountryCode}${phoneNumber.trim()}`;
        formDataToSubmit.primary_phone = fullPhoneNumber;
        formDataToSubmit.phone = fullPhoneNumber;
      } else {
        delete formDataToSubmit.primary_phone;
        delete formDataToSubmit.phone;
      }

      const numericFields = [
        'address_state_id',
        'address_country_id',
        'birth_state_id',
        'birth_country_id'
      ];

      numericFields.forEach((field) => {
        const rawValue = formDataToSubmit[field];
        if (rawValue === '' || rawValue === undefined || rawValue === null) {
          delete formDataToSubmit[field];
          return;
        }

        const parsedValue = Number(rawValue);
        if (Number.isNaN(parsedValue)) {
          delete formDataToSubmit[field];
          return;
        }

        formDataToSubmit[field] = parsedValue;
      });

      if (formDataToSubmit.birth_date === '' || formDataToSubmit.birth_date === undefined) {
        delete formDataToSubmit.birth_date;
      }
      
      await onSubmit(formDataToSubmit);
      
      // Save/update documents after patient is created/updated
      const finalPatientId = patient?.id || (await apiService.patients.getPatients()).find(p => 
        p.name === formDataToSubmit.name
      )?.id;
      
      if (finalPatientId) {
        const validDocs = personalDocuments.filter(doc => doc.document_id && doc.document_value.trim());
        for (const doc of validDocs) {
          try {
            await apiService.documents.savePersonDocument(finalPatientId, {
              document_id: doc.document_id!,
              document_value: doc.document_value.trim()
            });
          } catch (docError) {
            logger.error('Error saving document', docError, 'api');
          }
        }
      }
      
      // Mostrar notificación de éxito según el tipo de operación
      if (isEditing) {
        showSuccess(
          'Paciente actualizado exitosamente',
          '¡Edición completada!'
        );
      } else {
        showSuccess(
          'Paciente creado exitosamente',
          '¡Creación completada!'
        );
      }
      
      // Cerrar el diálogo después de un breve delay para que el usuario vea la notificación
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Error al guardar paciente';
      setError(errorMessage);
      showError(
        errorMessage,
        'Error en la operación'
      );
    } finally {
      setLoading(false);
    }
  }, [formData, phoneCountryCode, phoneNumber, personalDocuments, patient, isEditing, onSubmit, onClose, showSuccess, showError]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    // Form state
    formData,
    setFormData,
    loading,
    error,
    setError,
    errors,
    setErrors,
    
    // Phone state
    phoneCountryCode,
    setPhoneCountryCode,
    phoneNumber,
    setPhoneNumber,
    
    // Documents state
    personalDocuments,
    setPersonalDocuments,
    
    // Dialog states
    privacyConsentDialogOpen,
    setPrivacyConsentDialogOpen,
    arcoRequestDialogOpen,
    setArcoRequestDialogOpen,
    
    // Catalog data
    emergencyRelationships,
    countries,
    states,
    birthStates,
    
    // Handlers
    handleChange,
    handleCountryChange,
    handlePhoneChange,
    handleSubmit,
    handleClose,
    
    // Computed
    isEditing
  };
};


