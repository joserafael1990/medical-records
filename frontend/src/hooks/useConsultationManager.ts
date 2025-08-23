// ============================================================================
// CONSULTATION MANAGER HOOK - Gestión completa de consultas médicas
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { validateConsultationForm, getErrorMessage } from '../utils';
import { SUCCESS_MESSAGES, UI_CONFIG } from '../constants';
import type { Consultation, ConsultationFormData, FieldErrors } from '../types';

interface UseConsultationManagerReturn {
  // State
  consultations: Consultation[];
  selectedConsultation: Consultation | null;
  consultationFormData: ConsultationFormData;
  fieldErrors: FieldErrors;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string;
  
  // Dialog state
  dialogOpen: boolean;
  isEditing: boolean;
  
  // Actions
  fetchConsultations: (filters?: any) => Promise<void>;
  fetchPatientConsultations: (patientId: string) => Promise<void>;
  handleNewConsultation: () => void;
  handleEditConsultation: (consultation: Consultation) => void;
  handleDeleteConsultation: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleFieldChange: (field: keyof ConsultationFormData, value: string) => void;
  
  // Dialog actions
  openDialog: () => void;
  closeDialog: () => void;
  
  // Utility actions
  resetForm: () => void;
  clearErrors: () => void;
  showSuccess: (message: string) => void;
}

const initialFormData: ConsultationFormData = {
  patient_id: '',
  date: '',
  chief_complaint: '',
  history_present_illness: '',
  physical_examination: '',
  primary_diagnosis: '',
  primary_diagnosis_cie10: '',
  secondary_diagnoses: '',
  secondary_diagnoses_cie10: '',
  treatment_plan: '',
  therapeutic_plan: '',
  follow_up_instructions: '',
  prognosis: '',
  laboratory_results: '',
  imaging_studies: '',
  interconsultations: '',
  doctor_name: 'Dr. García Martínez',
  doctor_professional_license: '1234567',
  doctor_specialty: 'Medicina General'
};

export const useConsultationManager = (): UseConsultationManagerReturn => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [consultationFormData, setConsultationFormData] = useState<ConsultationFormData>(initialFormData);
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

  const fetchConsultations = useCallback(async (filters?: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getConsultations(filters);
      setConsultations(data);
    } catch (err: any) {
      console.error('Error fetching consultations:', err);
      setError(getErrorMessage(err));
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPatientConsultations = useCallback(async (patientId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getPatientConsultations(patientId);
      setConsultations(data);
    } catch (err: any) {
      console.error('Error fetching patient consultations:', err);
      setError(getErrorMessage(err));
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // FORM OPERATIONS
  // ============================================================================

  const resetForm = useCallback(() => {
    setConsultationFormData(initialFormData);
    setFieldErrors({});
    setError(null);
  }, []);

  const handleFieldChange = useCallback((field: keyof ConsultationFormData, value: string) => {
    setConsultationFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleNewConsultation = useCallback(() => {
    setSelectedConsultation(null);
    setIsEditing(false);
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const handleEditConsultation = useCallback((consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsEditing(true);
    
    // Populate form with consultation data
    setConsultationFormData({
      patient_id: consultation.patient_id || '',
      date: consultation.date || '',
      chief_complaint: consultation.chief_complaint || '',
      history_present_illness: consultation.history_present_illness || '',
      physical_examination: consultation.physical_examination || '',
      primary_diagnosis: consultation.primary_diagnosis || '',
      primary_diagnosis_cie10: consultation.primary_diagnosis_cie10 || '',
      secondary_diagnoses: consultation.secondary_diagnoses || '',
      secondary_diagnoses_cie10: consultation.secondary_diagnoses_cie10 || '',
      treatment_plan: consultation.treatment_plan || '',
      therapeutic_plan: consultation.therapeutic_plan || '',
      follow_up_instructions: consultation.follow_up_instructions || '',
      prognosis: consultation.prognosis || '',
      laboratory_results: consultation.laboratory_results || '',
      imaging_studies: consultation.imaging_studies || '',
      interconsultations: consultation.interconsultations || '',
      doctor_name: consultation.doctor_name || 'Dr. García Martínez',
      doctor_professional_license: consultation.doctor_professional_license || '1234567',
      doctor_specialty: consultation.doctor_specialty || 'Medicina General'
    });
    
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate form
    const errors = validateConsultationForm(consultationFormData);
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setError(null);

    try {
      if (isEditing && selectedConsultation) {
        // Update existing consultation
        await apiService.updateConsultation(selectedConsultation.id, consultationFormData);
        showSuccess(SUCCESS_MESSAGES.CONSULTATION_UPDATED);
      } else {
        // Create new consultation
        await apiService.createConsultation(consultationFormData.patient_id, consultationFormData);
        showSuccess(SUCCESS_MESSAGES.CONSULTATION_CREATED);
      }

      // Close dialog and refresh list
      setDialogOpen(false);
      await fetchConsultations();
      
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [consultationFormData, isEditing, selectedConsultation, fetchConsultations]);

  const handleDeleteConsultation = useCallback(async () => {
    if (!selectedConsultation) return;

    const confirmDelete = window.confirm(
      `⚠️ ¿Estás seguro de que deseas eliminar esta consulta?\n\n` +
      `Paciente: ${selectedConsultation.patient_name || 'N/A'}\n` +
      `Fecha: ${new Date(selectedConsultation.date).toLocaleDateString('es-MX')}\n` +
      `Diagnóstico: ${selectedConsultation.primary_diagnosis}\n\n` +
      `Esta acción NO se puede deshacer.`
    );
    
    if (!confirmDelete) return;

    setIsSubmitting(true);
    
    try {
      await apiService.deleteConsultation(selectedConsultation.id);
      showSuccess('Consulta eliminada exitosamente');
      setDialogOpen(false);
      await fetchConsultations();
    } catch (err: any) {
      console.error('Error deleting consultation:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedConsultation, fetchConsultations]);

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
    consultations,
    selectedConsultation,
    consultationFormData,
    fieldErrors,
    isSubmitting,
    isLoading,
    error,
    successMessage,
    
    // Dialog state
    dialogOpen,
    isEditing,
    
    // Actions
    fetchConsultations,
    fetchPatientConsultations,
    handleNewConsultation,
    handleEditConsultation,
    handleDeleteConsultation,
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

export default useConsultationManager;
