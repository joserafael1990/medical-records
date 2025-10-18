// ============================================================================
// CLINICAL STUDIES HOOK - Gestión de estudios clínicos
// ============================================================================

import { useState, useCallback } from 'react';
import { ClinicalStudy, CreateClinicalStudyData, UpdateClinicalStudyData } from '../types';
import { apiService } from '../services/api';

export interface UseClinicalStudiesReturn {
  // State
  studies: ClinicalStudy[];
  isLoading: boolean;
  error: string | null;
  clinicalStudyDialogOpen: boolean;
  isEditingClinicalStudy: boolean;
  selectedClinicalStudy: ClinicalStudy | null;
  clinicalStudyFormData: CreateClinicalStudyData;
  isSubmitting: boolean;

  // Actions
  fetchStudies: (consultationId: string) => Promise<void>;
  createStudy: (studyData: CreateClinicalStudyData) => Promise<ClinicalStudy>;
  updateStudy: (studyId: string, studyData: UpdateClinicalStudyData) => Promise<ClinicalStudy>;
  deleteStudy: (studyId: string) => Promise<void>;
  
  // Dialog management
  openAddDialog: (consultationId: string, patientId: string, doctorName: string) => void;
  openEditDialog: (study: ClinicalStudy) => void;
  closeDialog: () => void;
  
  // Form management
  updateFormData: (data: Partial<CreateClinicalStudyData>) => void;
  submitForm: (studyData?: CreateClinicalStudyData) => Promise<void>;
  
  // Utility functions
  clearTemporaryStudies: () => void;
  
  // File operations
  downloadFile: (fileUrl: string, fileName: string) => void;
  viewFile: (fileUrl: string) => void;
}

export const useClinicalStudies = (): UseClinicalStudiesReturn => {
  // State
  const [studies, setStudies] = useState<ClinicalStudy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicalStudyDialogOpen, setClinicalStudyDialogOpen] = useState(false);
  const [isEditingClinicalStudy, setIsEditingClinicalStudy] = useState(false);
  const [selectedClinicalStudy, setSelectedClinicalStudy] = useState<ClinicalStudy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data with default values
  const [clinicalStudyFormData, setClinicalStudyFormData] = useState<CreateClinicalStudyData>({
    consultation_id: '',
    patient_id: '',
    study_type: 'hematologia',
    study_name: '',
    study_description: '',
    ordered_date: new Date().toISOString().split('T')[0],
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

  // Fetch studies for a consultation
  const fetchStudies = useCallback(async (consultationId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get(`/api/clinical-studies/consultation/${consultationId}`);
      setStudies(response.data || []);
    } catch (err) {
      console.error('❌ Error fetching clinical studies:', err);
      console.error('❌ Error details:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      setError('Error al cargar los estudios clínicos');
      setStudies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new study
  const createStudy = useCallback(async (studyData: CreateClinicalStudyData): Promise<ClinicalStudy> => {
    try {
      const response = await apiService.post('/api/clinical-studies', studyData);
      const newStudy = response.data;
      
      // Add to local state
      setStudies(prev => [...prev, newStudy]);
      
      console.log('✅ Clinical study created:', newStudy);
      return newStudy;
    } catch (err) {
      console.error('❌ Error creating clinical study:', err);
      console.error('❌ Error details:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      throw err;
    }
  }, []);

  // Update an existing study
  const updateStudy = useCallback(async (studyId: string, studyData: UpdateClinicalStudyData): Promise<ClinicalStudy> => {
    try {
      const response = await apiService.put(`/api/clinical-studies/${studyId}`, studyData);
      const updatedStudy = response.data;
      
      // Update local state
      setStudies(prev => prev.map(study => 
        study.id === studyId ? updatedStudy : study
      ));
      
      console.log('✅ Clinical study updated:', updatedStudy);
      return updatedStudy;
    } catch (err) {
      console.error('❌ Error updating clinical study:', err);
      throw err;
    }
  }, []);

  // Delete a study
  const deleteStudy = useCallback(async (studyId: string) => {
    try {
      await apiService.delete(`/api/clinical-studies/${studyId}`);
      
      // Remove from local state
      setStudies(prev => prev.filter(study => study.id !== studyId));
      
      console.log('✅ Clinical study deleted:', studyId);
    } catch (err) {
      console.error('❌ Error deleting clinical study:', err);
      throw err;
    }
  }, []);

  // Dialog management
  const openAddDialog = useCallback((consultationId: string, patientId: string, doctorName: string) => {
    console.log('🔍 useClinicalStudies.openAddDialog called with:', {
      consultationId,
      patientId,
      doctorName
    });
    
    setClinicalStudyFormData({
      consultation_id: consultationId,
      patient_id: patientId,
      study_type: 'hematologia',
      study_name: '',
      study_description: '',
      ordered_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      results_text: '',
      interpretation: '',
      ordering_doctor: doctorName,
      performing_doctor: '',
      institution: '',
      urgency: 'normal',
      clinical_indication: '',
      relevant_history: '',
      created_by: ''
    });
    setIsEditingClinicalStudy(false);
    setSelectedClinicalStudy(null);
    setClinicalStudyDialogOpen(true);
    
    console.log('🔍 Dialog state set to open');
  }, []);

  const openEditDialog = useCallback((study: ClinicalStudy) => {
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
      ordering_doctor: study.ordering_doctor,
      performing_doctor: study.performing_doctor || '',
      institution: study.institution || '',
      urgency: study.urgency,
      clinical_indication: study.clinical_indication || '',
      relevant_history: study.relevant_history || '',
      created_by: study.created_by
    });
    setIsEditingClinicalStudy(true);
    setSelectedClinicalStudy(study);
    setClinicalStudyDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setClinicalStudyDialogOpen(false);
    setIsEditingClinicalStudy(false);
    setSelectedClinicalStudy(null);
    setError(null);
  }, []);

  // Clear temporary studies (for new consultations)
  const clearTemporaryStudies = useCallback(() => {
    setStudies([]);
  }, []);

  // Form management
  const updateFormData = useCallback((data: Partial<CreateClinicalStudyData>) => {
    setClinicalStudyFormData(prev => ({ ...prev, ...data }));
  }, []);

  const submitForm = useCallback(async (studyData?: CreateClinicalStudyData) => {
    setIsSubmitting(true);
    setError(null);
    
    // Use provided studyData or fall back to internal form data
    const dataToSubmit = studyData || clinicalStudyFormData;
    
    
    try {
      if (isEditingClinicalStudy && selectedClinicalStudy) {
        await updateStudy(selectedClinicalStudy.id, dataToSubmit);
      } else {
        // For new consultations, add to temporary studies list
        if (dataToSubmit.consultation_id === 'temp_consultation') {
          
          // Generate unique ID with timestamp and random component
          const uniqueId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const tempStudy: ClinicalStudy = {
            id: uniqueId,
            consultation_id: dataToSubmit.consultation_id,
            patient_id: dataToSubmit.patient_id,
            study_type: dataToSubmit.study_type,
            study_name: dataToSubmit.study_name,
            study_description: dataToSubmit.study_description,
            ordered_date: dataToSubmit.ordered_date,
            performed_date: dataToSubmit.performed_date,
            results_text: dataToSubmit.results_text,
            status: dataToSubmit.status,
            urgency: dataToSubmit.urgency,
            clinical_indication: dataToSubmit.clinical_indication,
            relevant_history: dataToSubmit.relevant_history,
            interpretation: dataToSubmit.interpretation,
            ordering_doctor: dataToSubmit.ordering_doctor,
            performing_doctor: dataToSubmit.performing_doctor,
            institution: dataToSubmit.institution,
            file_name: dataToSubmit.file_name,
            file_path: dataToSubmit.file_path,
            file_type: dataToSubmit.file_type,
            file_size: dataToSubmit.file_size,
            created_by: dataToSubmit.created_by,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setStudies(prev => [...prev, tempStudy]);
        } else {
          await createStudy(dataToSubmit);
        }
      }
      
      // Close dialog after successful submission
      // The modal will handle its own closing logic
      // closeDialog();
    } catch (err) {
      console.error('❌ Error submitting clinical study form:', err);
      setError('Error al guardar el estudio clínico');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingClinicalStudy, selectedClinicalStudy, clinicalStudyFormData, createStudy, updateStudy, closeDialog]);

  // File operations
  const downloadFile = useCallback((fileUrl: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('❌ Error downloading file:', err);
    }
  }, []);

  const viewFile = useCallback((fileUrl: string) => {
    try {
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('❌ Error viewing file:', err);
    }
  }, []);

  return {
    // State
    studies,
    isLoading,
    error,
    clinicalStudyDialogOpen,
    isEditingClinicalStudy,
    selectedClinicalStudy,
    clinicalStudyFormData,
    isSubmitting,

    // Actions
    fetchStudies,
    createStudy,
    updateStudy,
    deleteStudy,
    
    // Dialog management
    openAddDialog,
    openEditDialog,
    closeDialog,
    
    // Form management
    updateFormData,
    submitForm,
    
    // Utility functions
    clearTemporaryStudies,
    
    // File operations
    downloadFile,
    viewFile
  };
};