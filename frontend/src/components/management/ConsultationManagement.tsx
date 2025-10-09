import React, { useState, useCallback } from 'react';
import { ConsultationFormData, ClinicalStudy } from '../../types';
import { apiService } from '../../services/api';
import { submitConsultation } from '../../utils/consultationHelpers';
// useApiErrorHandler removed - using simplified error handling

export interface ConsultationManagementState {
  consultations: any[];
  consultationSearchTerm: string;
  consultationDialogOpen: boolean;
  isEditingConsultation: boolean;
  creatingPatientFromConsultation: boolean;
  selectedConsultation: any;
  consultationDetailView: boolean;
  consultationFormData: ConsultationFormData;
  tempConsultationId: string | null;
  tempClinicalStudies: ClinicalStudy[];
}

export interface ConsultationManagementActions {
  setConsultations: React.Dispatch<React.SetStateAction<any[]>>;
  setConsultationSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setConsultationDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditingConsultation: React.Dispatch<React.SetStateAction<boolean>>;
  setCreatingPatientFromConsultation: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedConsultation: React.Dispatch<React.SetStateAction<any>>;
  setConsultationDetailView: React.Dispatch<React.SetStateAction<boolean>>;
  setConsultationFormData: React.Dispatch<React.SetStateAction<ConsultationFormData>>;
  setTempConsultationId: React.Dispatch<React.SetStateAction<string | null>>;
  setTempClinicalStudies: React.Dispatch<React.SetStateAction<ClinicalStudy[]>>;
  handleNewConsultation: () => void;
  handleEditConsultation: (consultation: any) => Promise<void>;
  handleViewConsultation: (consultation: any) => Promise<void>;
  handleDeleteConsultation: (consultation: any) => Promise<void>;
  handleBackFromConsultationDetail: () => void;
  fetchConsultations: () => Promise<void>;
}

export interface UseConsultationManagementReturn extends ConsultationManagementState, ConsultationManagementActions {}

export function useConsultationManagement(
  doctorProfile: any,
  showSuccessMessage?: (message: string) => void,
  saveStudiesToStorage?: (consultationId: string | number, studies: any[]) => void,
  showErrorMessage?: (message: string) => void
): UseConsultationManagementReturn {
  
  // Consultations management state
  const [consultations, setConsultations] = useState<any[]>([]);
  const [consultationSearchTerm, setConsultationSearchTerm] = useState('');
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [isEditingConsultation, setIsEditingConsultation] = useState(false);
  const [creatingPatientFromConsultation, setCreatingPatientFromConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [consultationDetailView, setConsultationDetailView] = useState(false);
  const [consultationFormData, setConsultationFormData] = useState<ConsultationFormData>({
    patient_id: '',
    date: new Date().toISOString().split('T')[0],
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
    doctor_name: '',
    doctor_professional_license: '',
    doctor_specialty: ''
  });

  // Clinical Studies for temporary storage
  const [tempConsultationId, setTempConsultationId] = useState<string | null>(null);
  const [tempClinicalStudies, setTempClinicalStudies] = useState<ClinicalStudy[]>([]);
  
  // Error handling
  // Simplified API call execution - removed useApiErrorHandler dependency
  const executeApiCall = async (apiCall: () => Promise<any>, successMessage?: string) => {
    try {
      const result = await apiCall();
      if (successMessage && showSuccessMessage) showSuccessMessage(successMessage);
      return result;
    } catch (error: any) {
      if (showErrorMessage) showErrorMessage(error.message || 'Error en la operación');
      throw error;
    }
  };

  // Fetch consultations
  const fetchConsultations = useCallback(async () => {
    // Skip if no success handler (means not authenticated)
    if (!showSuccessMessage) {
      console.log('🔒 ConsultationManagement - No auth context, skipping consultation load');
      return;
    }
    
    console.log('📋 Cargando lista de consultas...');
    
    const result = await executeApiCall(
      () => apiService.getConsultations({}),
      undefined // No mostrar mensaje de éxito para carga inicial
    );
    
    if (result) {
      console.log('✅ Consultas cargadas exitosamente:', result.length);
      setConsultations(result);
    }
  }, [executeApiCall, showSuccessMessage]);

  // Handle new consultation
  const handleNewConsultation = useCallback(() => {
    console.log('🆕 Iniciando nueva consulta...');
    setSelectedConsultation(null);
    setIsEditingConsultation(false);
    setConsultationFormData({
      patient_id: 0,
      date: new Date().toISOString().split('T')[0],
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
      doctor_name: '',
      doctor_professional_license: '',
      doctor_specialty: ''
    });
    setConsultationDialogOpen(true);
  }, []);

  // Handle edit consultation
  const handleEditConsultation = useCallback(async (consultation: any) => {
    console.log('✏️ Editando consulta:', consultation.id);
    try {
      setSelectedConsultation(consultation);
      setIsEditingConsultation(true);
      
      setConsultationFormData({
        patient_id: typeof consultation.patient_id === 'string' ? parseInt(consultation.patient_id) : consultation.patient_id,
        date: consultation.date ? new Date(consultation.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
        doctor_name: consultation.doctor_name || '',
        doctor_professional_license: consultation.doctor_professional_license || '',
        doctor_specialty: consultation.doctor_specialty || ''
      });
      
      setConsultationDialogOpen(true);
    } catch (error) {
      console.error('❌ Error al preparar edición de consulta:', error);
    }
  }, []);

  // Handle view consultation
  const handleViewConsultation = useCallback(async (consultation: any) => {
    console.log('👁️ Viendo consulta completa:', consultation.id);
    setSelectedConsultation(consultation);
    setConsultationDetailView(true);
  }, []);

  // Handle delete consultation
  const handleDeleteConsultation = useCallback(async (consultation: any) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta consulta? Esta acción no se puede deshacer.')) {
      try {
        console.log('🗑️ Eliminando consulta:', consultation.id);
        await apiService.deleteConsultation(consultation.id.toString());
        setConsultations(prev => prev.filter(c => c.id !== consultation.id));
        showSuccessMessage?.('Consulta eliminada exitosamente');
      } catch (error) {
        console.error('❌ Error eliminando consulta:', error);
      }
    }
  }, [showSuccessMessage]);

  // Handle back from consultation detail
  const handleBackFromConsultationDetail = useCallback(() => {
    console.log('🔙 Regresando de vista detalle de consulta');
    setConsultationDetailView(false);
    setSelectedConsultation(null);
  }, []);

  return {
    consultations,
    consultationSearchTerm,
    consultationDialogOpen,
    isEditingConsultation,
    creatingPatientFromConsultation,
    selectedConsultation,
    consultationDetailView,
    consultationFormData,
    tempConsultationId,
    tempClinicalStudies,
    setConsultations,
    setConsultationSearchTerm,
    setConsultationDialogOpen,
    setIsEditingConsultation,
    setCreatingPatientFromConsultation,
    setSelectedConsultation,
    setConsultationDetailView,
    setConsultationFormData,
    setTempConsultationId,
    setTempClinicalStudies,
    handleNewConsultation,
    handleEditConsultation,
    handleViewConsultation,
    handleDeleteConsultation,
    handleBackFromConsultationDetail,
    fetchConsultations
  };
}


