// ============================================================================
// PATIENT MANAGER HOOK - Gestión completa de pacientes
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { validatePatientForm, getErrorMessage } from '../utils';
import { SUCCESS_MESSAGES, UI_CONFIG } from '../constants';
import type { Patient, PatientFormData, FieldErrors, CompletePatientData } from '../types';

interface UsePatientManagerReturn {
  // State
  patients: Patient[];
  selectedPatient: Patient | null;
  selectedPatientData: CompletePatientData | null;
  patientFormData: PatientFormData;
  fieldErrors: FieldErrors;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string;
  
  // Dialog state
  dialogOpen: boolean;
  isEditing: boolean;
  
  // Actions
  fetchPatients: (search?: string) => Promise<void>;
  fetchPatientDetails: (id: string) => Promise<void>;
  handleNewPatient: () => void;
  handleEditPatient: (patient: Patient) => void;
  handleDeletePatient: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleFieldChange: (field: keyof PatientFormData, value: string) => void;
  
  // Dialog actions
  openDialog: () => void;
  closeDialog: () => void;
  
  // Utility actions
  resetForm: () => void;
  clearErrors: () => void;
  showSuccess: (message: string) => void;
}

const initialFormData: PatientFormData = {
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  birth_date: '',
  gender: '',
  address: '',
  birth_state_code: '',
  nationality: 'Mexicana',
  curp: '',
  internal_id: '',
  phone: '',
  email: '',
  neighborhood: '',
  municipality: '',
  state: '',
  postal_code: '',
  civil_status: '',
  education_level: '',
  occupation: '',
  religion: '',
  insurance_type: '',
  insurance_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  emergency_contact_address: '',
  allergies: '',
  chronic_conditions: '',
  current_medications: '',
  blood_type: '',
  previous_hospitalizations: '',
  surgical_history: ''
};

export const usePatientManager = (): UsePatientManagerReturn => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientData, setSelectedPatientData] = useState<CompletePatientData | null>(null);
  const [patientFormData, setPatientFormData] = useState<PatientFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FETCH OPERATIONS
  // ============================================================================

  const fetchPatients = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getPatients(search);
      setPatients(data);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(getErrorMessage(err));
      
      // Set empty array to prevent map errors
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPatientDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getCompletePatientInfo(id);
      setSelectedPatientData(data);
    } catch (err: any) {
      console.error('Error fetching patient details:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // FORM OPERATIONS
  // ============================================================================

  const resetForm = useCallback(() => {
    setPatientFormData(initialFormData);
    setFieldErrors({});
    setError(null);
  }, []);

  const handleFieldChange = useCallback((field: keyof PatientFormData, value: string) => {
    setPatientFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleNewPatient = useCallback(() => {
    setSelectedPatient(null);
    setIsEditing(false);
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const handleEditPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditing(true);
    
    // Populate form with patient data
    setPatientFormData({
      first_name: patient.first_name || '',
      paternal_surname: patient.paternal_surname || '',
      maternal_surname: patient.maternal_surname || '',
      birth_date: patient.birth_date || '',
      gender: patient.gender || '',
      address: patient.address || '',
      birth_state_code: '',
      nationality: 'Mexicana',
      curp: patient.curp || '',
      internal_id: '',
      phone: patient.phone || '',
      email: patient.email || '',
      neighborhood: '',
      municipality: '',
      state: '',
      postal_code: '',
      civil_status: '',
      education_level: '',
      occupation: '',
      religion: '',
      insurance_type: patient.insurance_type || '',
      insurance_number: patient.insurance_number || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      emergency_contact_relationship: patient.emergency_contact_relationship || '',
      emergency_contact_address: '',
      allergies: patient.allergies || '',
      chronic_conditions: patient.chronic_conditions || '',
      current_medications: patient.current_medications || '',
      blood_type: patient.blood_type || '',
      previous_hospitalizations: '',
      surgical_history: ''
    });
    
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate form
    const errors = validatePatientForm(patientFormData);
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setError(null);

    try {
      if (isEditing && selectedPatient) {
        // Update existing patient
        await apiService.updatePatient(selectedPatient.id, patientFormData);
        showSuccess(SUCCESS_MESSAGES.PATIENT_UPDATED);
      } else {
        // Create new patient
        await apiService.createPatient(patientFormData);
        showSuccess(SUCCESS_MESSAGES.PATIENT_CREATED);
      }

      // Close dialog and refresh list
      setDialogOpen(false);
      await fetchPatients();
      
    } catch (err: any) {
      console.error('Error saving patient:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [patientFormData, isEditing, selectedPatient, fetchPatients]);

  const handleDeletePatient = useCallback(async () => {
    if (!selectedPatient) return;

    const patientName = `${selectedPatient.first_name} ${selectedPatient.paternal_surname} ${selectedPatient.maternal_surname}`;
    
    // Confirmation dialog
    const confirmDelete = window.confirm(
      `⚠️ ¿Estás seguro de que deseas eliminar al paciente ${patientName}?\n\n` +
      `Esta acción NO se puede deshacer y se eliminará:\n` +
      `• Toda la información del paciente\n` +
      `• Historial médico\n` +
      `• Citas programadas\n` +
      `• Prescripciones\n\n` +
      `Escribe "ELIMINAR" en el siguiente campo si estás completamente seguro.`
    );
    
    if (!confirmDelete) return;
    
    // Additional confirmation
    const confirmText = window.prompt(
      `Para confirmar la eliminación del paciente ${patientName}, escribe exactamente: ELIMINAR`
    );
    
    if (confirmText !== 'ELIMINAR') {
      alert('Eliminación cancelada. El texto no coincide.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await apiService.deletePatient(selectedPatient.id);
      showSuccess(SUCCESS_MESSAGES.PATIENT_DELETED);
      setDialogOpen(false);
      await fetchPatients();
    } catch (err: any) {
      console.error('Error deleting patient:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPatient, fetchPatients]);

  // ============================================================================
  // DIALOG OPERATIONS
  // ============================================================================

  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setFieldErrors({});
    setError(null);
  }, []);

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setError(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    
    // Clear previous timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    
    // Set new timeout
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
    }, UI_CONFIG.SUCCESS_MESSAGE_DURATION);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    patients,
    selectedPatient,
    selectedPatientData,
    patientFormData,
    fieldErrors,
    isSubmitting,
    isLoading,
    error,
    successMessage,
    
    // Dialog state
    dialogOpen,
    isEditing,
    
    // Actions
    fetchPatients,
    fetchPatientDetails,
    handleNewPatient,
    handleEditPatient,
    handleDeletePatient,
    handleSubmit,
    handleFieldChange,
    
    // Dialog actions
    openDialog,
    closeDialog,
    
    // Utility actions
    resetForm,
    clearErrors,
    showSuccess
  };
};

export default usePatientManager;
