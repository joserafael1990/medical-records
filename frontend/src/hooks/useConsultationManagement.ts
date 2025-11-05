/**
 * Consultation Management Hook
 * Centralized hook for all consultation-related operations extracted from App.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Consultation, ConsultationFormData, ClinicalStudy } from '../types';
import { getCurrentCDMXDateTime } from '../constants';
import { useAuth } from '../contexts/AuthContext';
interface ConsultationManagementState {
  consultations: Consultation[];
  selectedConsultation: Consultation | null;
  consultationDialogOpen: boolean;
  isEditingConsultation: boolean;
  consultationDetailView: boolean;
  consultationFormData: ConsultationFormData;
  consultationStudies: ClinicalStudy[];
  consultationSearchTerm: string;
  isSubmitting: boolean;
  isLoading: boolean;
  // Temporary state for new consultations
  tempConsultationId: string | null;
  tempClinicalStudies: ClinicalStudy[];
  // Missing properties for patient creation flow
  creatingPatientFromConsultation: boolean;
  // All available appointments for consultation dialog
  allAvailableAppointments: any[];
}

interface ConsultationManagementActions {
  // Data operations
  fetchConsultations: () => Promise<void>;
  loadAllAppointments: () => Promise<void>;
  setAllAvailableAppointments: (appointments: any[]) => void;
  createConsultation: (data: ConsultationFormData) => Promise<Consultation>;
  updateConsultation: (id: string, data: ConsultationFormData) => Promise<Consultation>;
  deleteConsultation: (id: string) => Promise<void>;
  
  // Clinical studies
  loadConsultationStudies: (consultationId: string) => Promise<void>;
  setConsultationStudies: (studies: ClinicalStudy[]) => void;
  
  // Temporary state management
  setTempConsultationId: (id: string | null) => void;
  setTempClinicalStudies: (studies: ClinicalStudy[]) => void;
  
  // UI state management
  setConsultations: (consultations: Consultation[] | ((prev: Consultation[]) => Consultation[])) => void;
  setSelectedConsultation: (consultation: Consultation | null) => void;
  setConsultationDialogOpen: (open: boolean) => void;
  setIsEditingConsultation: (editing: boolean) => void;
  setConsultationDetailView: (view: boolean) => void;
  setConsultationFormData: (data: ConsultationFormData | ((prev: ConsultationFormData) => ConsultationFormData)) => void;
  setConsultationSearchTerm: (term: string) => void;
  setCreatingPatientFromConsultation: (creating: boolean) => void;
  
  // Handler functions that were in App.tsx
  handleNewConsultation: () => void;
  handleEditConsultation: (consultation: Consultation) => void;
  handleViewConsultation: (consultation: Consultation) => void;
  handleBackFromConsultationDetail: () => void;
  
  // Utility functions
  resetConsultationForm: () => void;
  openConsultationDialog: (consultation?: Consultation) => void;
  closeConsultationDialog: () => void;
}

export type ConsultationManagementReturn = ConsultationManagementState & ConsultationManagementActions;

// Function moved to imports section above

export const useConsultationManagement = (onNavigate?: (view: string) => void): ConsultationManagementReturn => {
  // Authentication
  const { isAuthenticated } = useAuth();
  
  // State
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [isEditingConsultation, setIsEditingConsultation] = useState(false);
  const [consultationDetailView, setConsultationDetailView] = useState(false);
  const [consultationStudies, setConsultationStudies] = useState<ClinicalStudy[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allAvailableAppointments, setAllAvailableAppointments] = useState<any[]>([]);
  
  // Temporary state for new consultations
  const [tempConsultationId, setTempConsultationId] = useState<string | null>(null);
  const [tempClinicalStudies, setTempClinicalStudies] = useState<ClinicalStudy[]>([]);
  
  // Additional state
  const [consultationSearchTerm, setConsultationSearchTerm] = useState('');
  const [creatingPatientFromConsultation, setCreatingPatientFromConsultation] = useState(false);
  
  // Form data with default values
  const [consultationFormData, setConsultationFormData] = useState<ConsultationFormData>(() => ({
    patient_id: '',
    date: getCurrentCDMXDateTime(),
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
  }));

  // Load consultation studies
  const loadConsultationStudies = useCallback(async (consultationId: string) => {
    try {
      // NOTE: Clinical studies API endpoint not yet implemented in backend
      const studies: ClinicalStudy[] = [];
      setConsultationStudies(studies);
    } catch (error: any) {
      console.error('❌ Error loading clinical studies from backend:', error?.message || 'Unknown error');
      setConsultationStudies([]);
      throw error;
    }
  }, []);

  // Load all available appointments for consultation dialog
  const loadAllAppointments = useCallback(async () => {
    try {
      // Get appointments available for consultation (only confirmed appointments)
      const consultationAppointments = await apiService.getAppointments({ 
        available_for_consultation: true 
      });
      
      setAllAvailableAppointments(consultationAppointments || []);
    } catch (error: any) {
      console.error('❌ Error loading available appointments:', error?.message || 'Unknown error');
      setAllAvailableAppointments([]);
    }
  }, []);

  // Load consultations on mount - only if authenticated
  useEffect(() => {
    console.log('🔄 useConsultationManagement useEffect triggered, isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      console.log('⚠️ User not authenticated, skipping consultations fetch');
      return;
    }
    
    console.log('✅ User authenticated, fetching consultations...');
    fetchConsultations().catch(error => {
      console.warn('⚠️ Could not load consultations on mount:', error.message);
      console.error('⚠️ Full error:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated, fetchConsultations is stable

  // localStorage functions removed - backend-only approach

  // Fetch consultations from API
  const fetchConsultations = useCallback(async () => {
    try {
      console.log('🔄 Fetching consultations from backend...');
      setIsLoading(true);
      const data = await apiService.getConsultations();
      console.log('📊 Raw consultations data from API:', data);
      console.log('📊 Data type:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('📊 Data length:', Array.isArray(data) ? data.length : 'N/A');
      
      if (!data || !Array.isArray(data)) {
        console.warn('⚠️ API returned invalid data format:', data);
        setConsultations([]);
        setIsLoading(false);
        return;
      }
      
      // Transform consultation data
      const transformedData = data.map((consultation: any) => ({
        ...consultation,
        patient_name: consultation.patient_name || 
                    `${consultation.patient?.first_name || ''} ${consultation.patient?.paternal_surname || ''}`.trim(),
        date: consultation.date || consultation.consultation_date,
        id: consultation.id || consultation.consultation_id
      }));
      
      console.log(`📈 Total consultations loaded: ${transformedData.length}`);
      console.log('📊 Transformed consultations:', transformedData);
      setConsultations(transformedData);
    } catch (error: any) {
      console.error('❌ Error fetching consultations:', error?.message || 'Unknown error');
      console.error('❌ Full error:', error);
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new consultation
  const createConsultation = useCallback(async (data: ConsultationFormData): Promise<Consultation> => {
    setIsSubmitting(true);
    try {
      const newConsultation = await apiService.createConsultation(data.patient_id.toString(), data);
      await fetchConsultations(); // Refresh list
      
      // Navigate to consultations view after successful creation
      if (onNavigate) {
        setTimeout(() => {
          onNavigate('consultations');
        }, 1000); // Small delay to show success message
      }
      
      return newConsultation;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear consulta');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchConsultations, onNavigate]);

  // Update existing consultation
  const updateConsultation = useCallback(async (id: string, data: ConsultationFormData): Promise<Consultation> => {
    setIsSubmitting(true);
    try {
      const updatedConsultation = await apiService.updateConsultation(id, data);
      await fetchConsultations(); // Refresh list
      return updatedConsultation;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar consulta');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchConsultations]);

  // Delete consultation
  const deleteConsultation = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      await apiService.deleteConsultation(id);
      await fetchConsultations(); // Refresh list
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar consulta');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchConsultations]);

  // Reset form state (keeps dialog open for new consultations)
  const resetConsultationFormData = useCallback(() => {
    const currentDateTime = getCurrentCDMXDateTime();
    setConsultationFormData({
      patient_id: '',
      date: currentDateTime,
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
  }, []);

  // Reset form state and close dialog
  const resetConsultationForm = useCallback(() => {
    console.log('🔄 resetConsultationForm called - setting selectedConsultation to null');
    setSelectedConsultation(null);
    setIsEditingConsultation(false);
    setConsultationDialogOpen(false);
    setConsultationDetailView(false);
    setConsultationStudies([]);
    resetConsultationFormData();
  }, [resetConsultationFormData]);

  // Open consultation dialog for create/edit
  const openConsultationDialog = useCallback((consultation?: Consultation) => {
    if (consultation) {
      console.log('🔄 openConsultationDialog called with consultation:', consultation.id);
      setSelectedConsultation(consultation);
      setIsEditingConsultation(true);
      // Populate form with consultation data
      setConsultationFormData({
        patient_id: consultation.patient_id,
        date: consultation.date || getCurrentCDMXDateTime(),
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
      
      // Load clinical studies for this consultation
      if (consultation.id) {
        loadConsultationStudies(consultation.id);
      }
    } else {
      resetConsultationForm();
    }
    setConsultationDialogOpen(true);
  }, [loadConsultationStudies, resetConsultationForm]);

  // Close consultation dialog
  const closeConsultationDialog = useCallback(() => {
    console.log('🔄 closeConsultationDialog called - this is causing the consultation prop to become null');
    setConsultationDialogOpen(false);
    setConsultationDetailView(false);
    setSelectedConsultation(null);
    setIsEditingConsultation(false);
  }, []);

  // Add logging for selectedConsultation changes
  useEffect(() => {
    console.log('🔄 selectedConsultation changed:', selectedConsultation?.id || 'null');
  }, [selectedConsultation]);

  // Handler functions
  const handleNewConsultation = useCallback(() => {
    console.log('🆕 handleNewConsultation called - setting selectedConsultation to null');
    setSelectedConsultation(null);
    setIsEditingConsultation(false);
    resetConsultationFormData();
    
    // Load all appointments when opening consultation dialog
    loadAllAppointments();
    
    setConsultationDialogOpen(true);
  }, [resetConsultationFormData, loadAllAppointments]);

  const handleEditConsultation = useCallback(async (consultation: Consultation) => {
    try {
      console.log('🔄 handleEditConsultation called with consultation:', consultation.id);
      // First set the basic consultation data
      setSelectedConsultation(consultation);
      setIsEditingConsultation(true);
      setConsultationDialogOpen(true);
      
      // Fetch complete consultation data from backend
      console.log('🔄 Fetching complete consultation data for ID:', consultation.id);
      console.log('🔄 Making API call to:', `/api/consultations/${consultation.id}`);
      const response = await apiService.get(`/api/consultations/${consultation.id}`);
      console.log('🔄 API response received:', response);
      const fullConsultationData = response.data || response;
      
      console.log('🔄 Full consultation data received:', fullConsultationData?.id || 'null/undefined');
      // Update the selectedConsultation with the fresh data so the dialog's useEffect will re-run
      setSelectedConsultation(fullConsultationData);
    } catch (error) {
      console.error('Error fetching consultation data:', error);
      // Keep the original consultation data if fetch fails
    }
  }, []);

  const handleViewConsultation = useCallback((consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setConsultationDetailView(true);
  }, []);

  const handleBackFromConsultationDetail = useCallback(() => {
    console.log('🔄 handleBackFromConsultationDetail called - setting selectedConsultation to null');
    setConsultationDetailView(false);
    setSelectedConsultation(null);
  }, []);
  return {
    // State
    consultations,
    selectedConsultation,
    consultationDialogOpen,
    isEditingConsultation,
    consultationDetailView,
    consultationFormData,
    consultationStudies,
    consultationSearchTerm,
    isSubmitting,
    isLoading,
    tempConsultationId,
    tempClinicalStudies,
    creatingPatientFromConsultation,
    allAvailableAppointments,
    
    // Actions
    fetchConsultations,
    loadAllAppointments,
    setAllAvailableAppointments,
    createConsultation,
    updateConsultation,
    deleteConsultation,
    loadConsultationStudies,
    setConsultationStudies,
    setTempConsultationId,
    setTempClinicalStudies,
    setConsultations,
    setSelectedConsultation,
    setConsultationDialogOpen,
    setIsEditingConsultation,
    setConsultationDetailView,
    setConsultationFormData,
    setConsultationSearchTerm,
    setCreatingPatientFromConsultation,
    handleNewConsultation,
    handleEditConsultation,
    handleViewConsultation,
    handleBackFromConsultationDetail,
    resetConsultationForm,
    openConsultationDialog,
    closeConsultationDialog
  };
};
