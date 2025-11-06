import { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient, AppointmentFormData as BaseAppointmentFormData, PatientFormData, Office, AppointmentType } from '../types';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';
import { useScrollToErrorInDialog } from './useScrollToError';

// Extended appointment form data for internal use (includes UI-specific fields)
export interface AppointmentFormData extends BaseAppointmentFormData {
  appointment_type?: string; // 'primera vez' | 'seguimiento' (UI field)
  date_time?: string; // Combined date+time for UI (YYYY-MM-DDTHH:MM format)
}

export interface UseAppointmentFormProps {
  formData: AppointmentFormData;
  patients: Patient[];
  isEditing: boolean;
  doctorProfile?: any;
  onFormDataChange?: (formData: AppointmentFormData) => void;
  onSubmit: (formData: AppointmentFormData) => Promise<void>;
  onSuccess?: () => void;
  open: boolean;
  fieldErrors?: Record<string, string>;
}

export interface UseAppointmentFormReturn {
  // Form state
  localFormData: AppointmentFormData;
  setLocalFormData: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
  validationError: string;
  setValidationError: (error: string) => void;
  loading: boolean;
  
  // Time management
  availableTimes: any[];
  loadingTimes: boolean;
  selectedDate: string;
  selectedTime: string;
  
  // Patient state
  selectedPatient: Patient | null;
  newPatientData: any;
  personalDocument: { document_id: number | null; document_value: string };
  setPersonalDocument: (doc: { document_id: number | null; document_value: string }) => void;
  showAdvancedPatientData: boolean;
  setShowAdvancedPatientData: (show: boolean) => void;
  
  // Catalog data
  countries: any[];
  states: any[];
  birthStates: any[];
  emergencyRelationships: any[];
  appointmentTypes: AppointmentType[];
  offices: Office[];
  
  // Handlers
  handleDateChange: (date: string) => void;
  handleTimeChange: (time: string) => void;
  handlePatientChange: (patient: Patient | null) => void;
  handleFieldChange: (field: keyof AppointmentFormData) => (event: any) => void;
  handleNewPatientFieldChange: (field: string, value: string) => void;
  handleNewPatientCountryChange: (field: 'address_country_id' | 'birth_country_id', countryId: string) => Promise<void>;
  handleSubmit: () => Promise<void>;
  
  // Validation
  isFormComplete: () => boolean;
  getValidationErrorMessage: () => string;
  areAppointmentFieldsEnabled: () => boolean;
  isPatientSelectionEnabled: () => boolean;
  getFieldError: (field: string) => string;
  hasFieldError: (field: string) => boolean;
  
  // Utilities
  formatTimeToAMPM: (timeString: string) => string;
  formatPatientNameWithAge: (patient: Patient) => string;
  isReadOnly: boolean;
  computedIsEditing: boolean;
  
  // Conditional display
  shouldShowPatientSection: boolean;
  shouldShowNewPatientForm: boolean;
}

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch (error) {
    logger.error('Error calculating age', error, 'system');
    return 0;
  }
};

export const useAppointmentForm = (props: UseAppointmentFormProps): UseAppointmentFormReturn => {
  const {
    formData,
    patients,
    isEditing,
    doctorProfile,
    onFormDataChange,
    onSubmit,
    onSuccess,
    open,
    fieldErrors = {}
  } = props;

  const { showSuccess, showError } = useToast();
  const computedIsEditing = isEditing || Boolean((formData as any)?.id) || Boolean(formData?.patient_id && formData?.appointment_date);

  // State for available time slots
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [localFormData, setLocalFormData] = useState<AppointmentFormData>(formData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);

  // State for inline patient creation (first visit)
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
    civil_status: '',
    birth_city: '',
    birth_country_id: '',
    birth_state_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    insurance_provider: '',
    insurance_number: ''
  });

  // State for personal document (only one allowed)
  const [personalDocument, setPersonalDocument] = useState<{
    document_id: number | null;
    document_value: string;
  }>({ document_id: null, document_value: '' });

  // State for advanced patient data
  const [showAdvancedPatientData, setShowAdvancedPatientData] = useState<boolean>(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [birthStates, setBirthStates] = useState<any[]>([]);
  const [emergencyRelationships, setEmergencyRelationships] = useState<any[]>([]);

  // Auto-scroll to error when it appears
  const { errorRef: validationErrorRef } = useScrollToErrorInDialog(validationError);

  // Function to format time from HH:MM to AM/PM format
  const formatTimeToAMPM = useCallback((timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  // Function to format patient name with age
  const formatPatientNameWithAge = useCallback((patient: Patient): string => {
    const age = calculateAge(patient.birth_date || '');
    const fullName = [
      patient.first_name,
      patient.paternal_surname,
      patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
    ].filter(part => part && part.trim()).join(' ');
    return `${fullName} (${age} años)`;
  }, []);

  // Function to load available times for a specific date
  const loadAvailableTimes = useCallback(async (date: string) => {
    if (!date) return [];
    
    try {
      setLoadingTimes(true);
      logger.debug('Loading available times for date', { date }, 'api');
      const response = await apiService.appointments.getAvailableTimesForBooking(date);
      const times = response.available_times || [];
      logger.debug(`Found ${times.length} available times`, { count: times.length }, 'api');
      setAvailableTimes(times);
      return times;
    } catch (error) {
      logger.error('Error loading available times', error, 'api');
      setAvailableTimes([]);
      return [];
    } finally {
      setLoadingTimes(false);
    }
  }, []);

  // Handle date change and load available times
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    setSelectedTime('');
    
    if (newDate) {
      const dateOnly = newDate.split('T')[0];
      loadAvailableTimes(dateOnly);
    } else {
      setAvailableTimes([]);
    }
  }, [loadAvailableTimes]);

  // Handle time selection
  const handleTimeChange = useCallback((time: string) => {
    setSelectedTime(time);
    
    if (selectedDate && time) {
      const dateOnly = selectedDate.split('T')[0];
      const dateTime = `${dateOnly}T${time}`;
      
      const updatedFormData = { ...localFormData, date_time: dateTime };
      setLocalFormData(updatedFormData);
      onFormDataChange?.(updatedFormData);
    }
  }, [selectedDate, localFormData, onFormDataChange]);

  // Handle new patient data changes
  const handleNewPatientFieldChange = useCallback((field: string, value: string) => {
    setNewPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle country change for new patients
  const handleNewPatientCountryChange = useCallback(async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    handleNewPatientFieldChange(field, countryId);
    
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
  }, [handleNewPatientFieldChange]);

  // Determine if appointment fields should be enabled
  const areAppointmentFieldsEnabled = useCallback((): boolean => {
    if (!localFormData.appointment_type) return false;
    
    if (localFormData.appointment_type === 'primera vez') {
      return Boolean(localFormData.patient_id) || (
        Boolean(newPatientData.first_name) && 
        Boolean(newPatientData.paternal_surname) && 
        Boolean(newPatientData.primary_phone)
      );
    } else {
      return selectedPatient !== null;
    }
  }, [localFormData.appointment_type, localFormData.patient_id, newPatientData, selectedPatient]);

  // Determine if patient selection should be enabled
  const isPatientSelectionEnabled = useCallback((): boolean => {
    return patients.length > 0 && Boolean(localFormData.appointment_type);
  }, [patients.length, localFormData.appointment_type]);

  // Determine if the form is complete and ready to submit
  const isFormComplete = useCallback((): boolean => {
    if (!localFormData.appointment_type && patients.length > 0) {
      return false;
    }
    
    if (localFormData.appointment_type === 'primera vez' || patients.length === 0) {
      if (!localFormData.patient_id && (!newPatientData.first_name || 
          !newPatientData.paternal_surname || 
          !newPatientData.primary_phone ||
          !newPatientData.gender)) {
        return false;
      }
    } else {
      if (!selectedPatient || !localFormData.patient_id) {
        return false;
      }
    }
    
    if (!selectedDate || !selectedTime) {
      return false;
    }
    
    if (selectedTime && availableTimes.length > 0) {
      const isTimeValid = availableTimes.some(timeSlot => timeSlot.time === selectedTime);
      if (!isTimeValid) {
        return false;
      }
    }
    
    return true;
  }, [localFormData, patients.length, newPatientData, selectedPatient, selectedDate, selectedTime, availableTimes]);

  // Get validation error message
  const getValidationErrorMessage = useCallback((): string => {
    const errors = [];
    
    if (!localFormData.appointment_type && patients.length > 0) {
      errors.push('Selecciona el tipo de consulta');
    }
    
    if (localFormData.appointment_type === 'primera vez' || patients.length === 0) {
      if (!localFormData.patient_id && (!newPatientData.first_name || 
          !newPatientData.paternal_surname || 
          !newPatientData.primary_phone ||
          !newPatientData.gender)) {
        errors.push('Selecciona un paciente existente o completa los datos básicos del nuevo paciente (nombre, apellido, teléfono y género son requeridos)');
      }
      
      if (!localFormData.patient_id && newPatientData.first_name) {
        if (!newPatientData.first_name) errors.push('El nombre es requerido');
        if (!newPatientData.paternal_surname) errors.push('El apellido paterno es requerido');
        if (!newPatientData.primary_phone) errors.push('El teléfono es requerido');
        if (!newPatientData.gender) errors.push('El género es requerido');
      }
    } else {
      if (!selectedPatient || !localFormData.patient_id) {
        errors.push('Selecciona un paciente');
      }
    }
    
    if (!selectedDate) {
      errors.push('La fecha es requerida');
    } else if (!selectedTime) {
      if (availableTimes.length === 0) {
        errors.push('No hay horarios disponibles para la fecha seleccionada');
      } else {
        errors.push('Debe seleccionar un horario disponible para la cita');
      }
    } else if (selectedTime && availableTimes.length > 0) {
      const isTimeValid = availableTimes.some(timeSlot => timeSlot.time === selectedTime);
      if (!isTimeValid) {
        errors.push('El horario seleccionado no está disponible');
      }
    }
    
    return errors.length > 0 ? errors.join(', ') : '';
  }, [localFormData, patients.length, newPatientData, selectedPatient, selectedDate, selectedTime, availableTimes]);

  // Determine if fields should be read-only
  const isReadOnly = useMemo(() => {
    return computedIsEditing && 
           formData.status === 'cancelled' && 
           localFormData.status === 'cancelled';
  }, [computedIsEditing, formData.status, localFormData.status]);

  // Conditional display helpers
  const shouldShowPatientSection = useMemo(() => {
    return Boolean(localFormData.appointment_type) || patients.length === 0;
  }, [localFormData.appointment_type, patients.length]);

  const shouldShowNewPatientForm = useMemo(() => {
    return patients.length === 0 || localFormData.appointment_type === 'primera vez';
  }, [patients.length, localFormData.appointment_type]);

  // Load initial data (countries, emergency relationships, appointment types, offices)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [countriesData, relationshipsData] = await Promise.all([
          apiService.catalogs.getCountries(),
          apiService.catalogs.getEmergencyRelationships()
        ]);
        setCountries(countriesData);
        setEmergencyRelationships(relationshipsData);
        // Appointment types are not needed for appointment creation (they're just 'primera vez' or 'seguimiento')
        setAppointmentTypes([]);
        
        // Load offices if doctor profile exists
        if (doctorProfile?.id) {
          try {
            const officesData = await apiService.offices.getOffices(doctorProfile.id);
            setOffices(officesData || []);
          } catch (error) {
            logger.error('Error loading offices', error, 'api');
          }
        }
      } catch (error) {
        logger.error('Error loading initial data', error, 'api');
      }
    };

    if (open) {
      loadInitialData();
    }
  }, [open, doctorProfile?.id]);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      logger.debug('Initializing form data on dialog open', {
        appointment_type: formData.appointment_type,
        patients_count: patients.length
      }, 'ui');
      
        const updatedFormData: AppointmentFormData = {
          ...formData,
          status: formData.status || 'confirmed',
          appointment_type: (formData as AppointmentFormData).appointment_type ? (formData as AppointmentFormData).appointment_type!.toLowerCase() : (patients.length === 0 ? 'primera vez' : ''),
          auto_reminder_enabled: (formData as any)?.auto_reminder_enabled ?? false,
          auto_reminder_offset_minutes: (formData as any)?.auto_reminder_offset_minutes ?? 360
        };
      
      logger.debug('Final appointment type set', { appointment_type: updatedFormData.appointment_type }, 'ui');
      setLocalFormData(updatedFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle patient selection when formData.patient_id changes
  useEffect(() => {
    if (formData.patient_id && patients.length > 0) {
      const patient = patients.find(p => {
        const patientId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
        const formPatientId = typeof formData.patient_id === 'string' ? parseInt(formData.patient_id, 10) : formData.patient_id;
        return patientId === formPatientId;
      });
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [formData.patient_id, patients]);

  // Handle appointment type changes - clear patient data when switching to "seguimiento"
  useEffect(() => {
    logger.debug('Appointment type changed', { appointment_type: localFormData.appointment_type }, 'ui');
    if (localFormData.appointment_type === 'seguimiento') {
      logger.debug('Clearing new patient data for seguimiento', undefined, 'ui');
      setPersonalDocument({ document_id: null, document_value: '' });
      setNewPatientData({
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
        civil_status: '',
        birth_city: '',
        birth_country_id: '',
        birth_state_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        insurance_provider: '',
        insurance_number: ''
      });
    }
  }, [localFormData.appointment_type]);

  // Handle date/time initialization for editing
  useEffect(() => {
    const extendedFormData = formData as AppointmentFormData;
    if (open && extendedFormData.date_time && isEditing) {
      const dateTime = extendedFormData.date_time;
      const [datePart, timePart] = dateTime.split('T');
      setSelectedDate(dateTime);
      
      if (datePart) {
        loadAvailableTimes(datePart).then((times) => {
          if (timePart) {
            setSelectedTime(timePart);
          }
        });
      }
    } else if (open && !isEditing) {
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
    }
  }, [open, isEditing, formData, loadAvailableTimes]);

  const handleFieldChange = useCallback((field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;
    
    const newFormData = {
      ...localFormData,
      [field]: value
    };
    
    setLocalFormData(newFormData);
    
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  }, [localFormData, onFormDataChange]);

  const handlePatientChange = useCallback((patient: Patient | null) => {
    setSelectedPatient(patient);
    const patientId = patient?.id ? (typeof patient.id === 'string' ? parseInt(patient.id, 10) : patient.id) : 0;
    const newFormData: AppointmentFormData = {
      ...localFormData,
      patient_id: patientId
    };
    
    setLocalFormData(newFormData);
    
    if (patient) {
      setPersonalDocument({ document_id: null, document_value: '' });
      setNewPatientData({
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
        civil_status: '',
        birth_city: '',
        birth_country_id: '',
        birth_state_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        insurance_provider: '',
        insurance_number: ''
      });
    }
    
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  }, [localFormData, onFormDataChange]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setValidationError('');
    
    if (!isFormComplete()) {
      const errorMessage = getValidationErrorMessage();
      setValidationError(errorMessage);
      return;
    }
    
    if (!selectedTime || selectedTime.trim() === '') {
      setValidationError('Debe seleccionar un horario disponible para la cita');
      return;
    }
    
    if (availableTimes.length > 0) {
      const isTimeValid = availableTimes.some(timeSlot => timeSlot.time === selectedTime);
      if (!isTimeValid) {
        setValidationError('El horario seleccionado no está disponible');
        return;
      }
    } else {
      setValidationError('No hay horarios disponibles para la fecha seleccionada');
      return;
    }

    setLoading(true);
    
    // Handle "Primera vez" (first visit) - create patient inline if no patient selected
    if (!computedIsEditing && localFormData.appointment_type === 'primera vez' && !localFormData.patient_id) {
      try {
        const patientData: PatientFormData = {
          first_name: newPatientData.first_name,
          paternal_surname: newPatientData.paternal_surname,
          maternal_surname: newPatientData.maternal_surname || '',
          email: newPatientData.email || '',
          birth_date: newPatientData.birth_date,
          primary_phone: newPatientData.primary_phone,
          gender: newPatientData.gender,
          civil_status: newPatientData.civil_status || '',
          home_address: newPatientData.home_address || '',
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
          insurance_provider: newPatientData.insurance_provider || '',
          insurance_number: newPatientData.insurance_number || '',
          active: true,
          is_active: true
        };

        const newPatient = await apiService.patients.createPatient(patientData);

        const finalFormData = {
          ...localFormData,
          patient_id: newPatient.id,
          status: localFormData.status || 'confirmed'
        };

        await onSubmit(finalFormData);
        
        if (computedIsEditing) {
          showSuccess('Cita actualizada exitosamente', '¡Edición completada!');
        } else {
          showSuccess('Cita creada exitosamente', '¡Operación completada!');
        }
        
        setTimeout(() => {
          onSuccess?.();
        }, 1000);
        
      } catch (error) {
        logger.error('Error creating patient', error, 'api');
        showError('Error al crear la cita', 'Error en la operación');
      } finally {
        setLoading(false);
      }
    } else {
      // Regular flow for existing patients
      const finalFormData = {
        ...localFormData,
        status: localFormData.status || 'confirmed'
      };
      
      try {
        await onSubmit(finalFormData);
        
        if (computedIsEditing) {
          showSuccess('Cita actualizada exitosamente', '¡Edición completada!');
        } else {
          showSuccess('Cita creada exitosamente', '¡Creación completada!');
        }
        
        setTimeout(() => {
          onSuccess?.();
        }, 1000);
        
      } catch (error) {
        logger.error('Error saving appointment', error, 'api');
        showError('Error al guardar la cita', 'Error en la operación');
      } finally {
        setLoading(false);
      }
    }
  }, [
    isFormComplete,
    getValidationErrorMessage,
    selectedTime,
    availableTimes,
    computedIsEditing,
    localFormData,
    newPatientData,
    personalDocument,
    onSubmit,
    onSuccess,
    showSuccess,
    showError
  ]);

  const getFieldError = useCallback((field: string): string => {
    return fieldErrors[field] || '';
  }, [fieldErrors]);

  const hasFieldError = useCallback((field: string): boolean => {
    return Boolean(getFieldError(field));
  }, [getFieldError]);

  return {
    // Form state
    localFormData,
    setLocalFormData,
    validationError,
    setValidationError,
    loading,
    
    // Time management
    availableTimes,
    loadingTimes,
    selectedDate,
    selectedTime,
    
    // Patient state
    selectedPatient,
    newPatientData,
    personalDocument,
    setPersonalDocument,
    showAdvancedPatientData,
    setShowAdvancedPatientData,
    
    // Catalog data
    countries,
    states,
    birthStates,
    emergencyRelationships,
    appointmentTypes,
    offices,
    
    // Handlers
    handleDateChange,
    handleTimeChange,
    handlePatientChange,
    handleFieldChange,
    handleNewPatientFieldChange,
    handleNewPatientCountryChange,
    handleSubmit,
    
    // Validation
    isFormComplete,
    getValidationErrorMessage,
    areAppointmentFieldsEnabled,
    isPatientSelectionEnabled,
    getFieldError,
    hasFieldError,
    
    // Utilities
    formatTimeToAMPM,
    formatPatientNameWithAge,
    isReadOnly,
    computedIsEditing,
    
    // Conditional display
    shouldShowPatientSection,
    shouldShowNewPatientForm
  };
};

