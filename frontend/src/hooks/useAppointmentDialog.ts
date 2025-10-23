import { useState, useEffect, useCallback } from 'react';
import { Patient, AppointmentFormData } from '../types';
import { apiService } from '../services/api';
import { useToast } from '../components/common/ToastNotification';
import { useScrollToError } from './useScrollToError';

export interface UseAppointmentDialogProps {
  formData: AppointmentFormData;
  patients: Patient[];
  isEditing: boolean;
  doctorProfile?: any;
  onFormDataChange?: (formData: AppointmentFormData) => void;
}

export interface UseAppointmentDialogReturn {
  // Form state
  localFormData: AppointmentFormData;
  setLocalFormData: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
  
  // Time management
  availableTimes: any[];
  selectedDate: string;
  selectedTime: string;
  loadingTimes: boolean;
  
  // Patient management
  selectedPatient: Patient | null;
  newPatientData: any;
  
  // Validation
  validationError: string;
  setValidationError: React.Dispatch<React.SetStateAction<string>>;
  
  // Actions
  handleDateChange: (date: string) => void;
  handleTimeChange: (time: string) => void;
  handlePatientChange: (patient: Patient | null) => void;
  handleInputChange: (field: string, value: any) => void;
  handleNewPatientInputChange: (field: string, value: any) => void;
  handleSubmit: (onSubmit: (formData: AppointmentFormData) => Promise<void>) => Promise<void>;
  handleReset: () => void;
  
  // Utilities
  formatTimeToAMPM: (timeString: string) => string;
  formatPatientNameWithAge: (patient: Patient) => string;
  calculateAge: (birthDate: string) => number;
  
  // Error refs
  validationErrorRef: React.RefObject<HTMLDivElement>;
  formErrorRef: React.RefObject<HTMLDivElement>;
}

export const useAppointmentDialog = ({
  formData,
  patients,
  isEditing,
  doctorProfile,
  onFormDataChange
}: UseAppointmentDialogProps): UseAppointmentDialogReturn => {
  const { showSuccess, showError } = useToast();
  
  // State for available time slots
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [localFormData, setLocalFormData] = useState<AppointmentFormData>(formData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [validationError, setValidationError] = useState<string>('');

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
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    blood_type: '',
    allergies: '',
    current_medications: '',
    medical_conditions: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_group_number: '',
    insurance_phone: '',
    insurance_email: '',
    insurance_address: '',
    insurance_city: '',
    insurance_postal_code: '',
    insurance_country_id: '',
    insurance_state_id: '',
    is_first_visit: true
  });

  // Auto-scroll to error when it appears
  const { errorRef: validationErrorRef } = useScrollToError(validationError);
  const { errorRef: formErrorRef } = useScrollToError('');

  // Utility functions
  const calculateAge = useCallback((birthDate: string): number => {
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
  }, []);

  const formatPatientNameWithAge = useCallback((patient: Patient): string => {
    const age = calculateAge(patient.birth_date);
    const fullName = [
      patient.first_name,
      patient.paternal_surname,
      patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
    ].filter(part => part && part.trim()).join(' ');
    return `${fullName} (${age} años)`;
  }, [calculateAge]);

  const formatTimeToAMPM = useCallback((timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  // Load available times when date changes
  const loadAvailableTimes = useCallback(async (date: string) => {
    if (!date || !doctorProfile?.id) return;
    
    setLoadingTimes(true);
    try {
      const times = await apiService.getAvailableTimes(doctorProfile.id, date);
      setAvailableTimes(times);
    } catch (error) {
      console.error('Error loading available times:', error);
      showError('Error al cargar horarios disponibles');
    } finally {
      setLoadingTimes(false);
    }
  }, [doctorProfile?.id, showError]);

  // Handle date change
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setLocalFormData(prev => ({
      ...prev,
      date_time: date,
      time: ''
    }));
    loadAvailableTimes(date);
  }, [loadAvailableTimes]);

  // Handle time change
  const handleTimeChange = useCallback((time: string) => {
    setSelectedTime(time);
    setLocalFormData(prev => ({
      ...prev,
      time: time
    }));
  }, []);

  // Handle patient change
  const handlePatientChange = useCallback((patient: Patient | null) => {
    setSelectedPatient(patient);
    setLocalFormData(prev => ({
      ...prev,
      patient_id: patient?.id || ''
    }));
  }, []);

  // Handle input change
  const handleInputChange = useCallback((field: string, value: any) => {
    setLocalFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      onFormDataChange?.(newData);
      return newData;
    });
  }, [onFormDataChange]);

  // Handle new patient input change
  const handleNewPatientInputChange = useCallback((field: string, value: any) => {
    setNewPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    if (!localFormData.patient_id) {
      setValidationError('Debe seleccionar un paciente');
      return false;
    }
    
    if (!localFormData.date_time) {
      setValidationError('Debe seleccionar una fecha');
      return false;
    }
    
    if (!localFormData.time) {
      setValidationError('Debe seleccionar una hora');
      return false;
    }
    
    if (!localFormData.appointment_type) {
      setValidationError('Debe seleccionar un tipo de consulta');
      return false;
    }
    
    setValidationError('');
    return true;
  }, [localFormData]);

  // Handle submit
  const handleSubmit = useCallback(async (onSubmit: (formData: AppointmentFormData) => Promise<void>) => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(localFormData);
      showSuccess(isEditing ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente');
    } catch (error: any) {
      console.error('Error submitting appointment:', error);
      showError(error.message || 'Error al guardar la cita');
    }
  }, [localFormData, validateForm, isEditing, showSuccess, showError]);

  // Handle reset
  const handleReset = useCallback(() => {
    setLocalFormData(formData);
    setSelectedDate('');
    setSelectedTime('');
    setSelectedPatient(null);
    setValidationError('');
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
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      blood_type: '',
      allergies: '',
      current_medications: '',
      medical_conditions: '',
      insurance_provider: '',
      insurance_policy_number: '',
      insurance_group_number: '',
      insurance_phone: '',
      insurance_email: '',
      insurance_address: '',
      insurance_city: '',
      insurance_postal_code: '',
      insurance_country_id: '',
      insurance_state_id: '',
      is_first_visit: true
    });
  }, [formData]);

  // Initialize form data
  useEffect(() => {
    setLocalFormData(formData);
    
    if (formData.date_time) {
      const date = new Date(formData.date_time);
      const dateString = date.toISOString().split('T')[0];
      setSelectedDate(dateString);
      loadAvailableTimes(dateString);
    }
    
    if (formData.time) {
      setSelectedTime(formData.time);
    }
    
    if (formData.patient_id) {
      const patient = patients.find(p => p.id === formData.patient_id);
      setSelectedPatient(patient || null);
    }
  }, [formData, patients, loadAvailableTimes]);

  return {
    localFormData,
    setLocalFormData,
    availableTimes,
    selectedDate,
    selectedTime,
    loadingTimes,
    selectedPatient,
    newPatientData,
    validationError,
    setValidationError,
    handleDateChange,
    handleTimeChange,
    handlePatientChange,
    handleInputChange,
    handleNewPatientInputChange,
    handleSubmit,
    handleReset,
    formatTimeToAMPM,
    formatPatientNameWithAge,
    calculateAge,
    validationErrorRef,
    formErrorRef
  };
};
