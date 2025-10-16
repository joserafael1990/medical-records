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
  submitForm: () => Promise<void>;
  
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
    console.log('🔬 fetchStudies called with consultationId:', consultationId);
    console.log('🔬 fetchStudies type:', typeof consultationId);
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔬 Fetching clinical studies for consultation:', consultationId);
      const response = await apiService.get(`/api/clinical-studies/consultation/${consultationId}`);
      console.log('🔬 API response:', response);
      console.log('🔬 Response data:', response.data);
      setStudies(response.data || []);
      console.log('🔬 Clinical studies fetched and set:', response.data);
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
      console.log('🔬 Creating clinical study with data:', studyData);
      console.log('🔬 Study data type:', typeof studyData);
      console.log('🔬 Study data keys:', Object.keys(studyData));
      
      const response = await apiService.post('/api/clinical-studies', studyData);
      const newStudy = response.data;
      
      console.log('🔬 Backend response:', response);
      console.log('🔬 Created study:', newStudy);
      
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
      console.log('🔬 Updating clinical study:', studyId, studyData);
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
      console.log('🔬 Deleting clinical study:', studyId);
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

  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isEditingClinicalStudy && selectedClinicalStudy) {
        await updateStudy(selectedClinicalStudy.id, clinicalStudyFormData);
      } else {
        // For new consultations, add to temporary studies list
        if (clinicalStudyFormData.consultation_id === 'temp_consultation') {
          console.log('🔬 Adding temporary study:', clinicalStudyFormData);
          
          const tempStudy: ClinicalStudy = {
            id: `temp_${Date.now()}`,
            consultation_id: clinicalStudyFormData.consultation_id,
            patient_id: clinicalStudyFormData.patient_id,
            study_type: clinicalStudyFormData.study_type,
            study_name: clinicalStudyFormData.study_name,
            study_description: clinicalStudyFormData.study_description,
            ordered_date: clinicalStudyFormData.ordered_date,
            performed_date: clinicalStudyFormData.performed_date,
            results_date: clinicalStudyFormData.results_date,
            status: clinicalStudyFormData.status,
            urgency: clinicalStudyFormData.urgency,
            clinical_indication: clinicalStudyFormData.clinical_indication,
            relevant_history: clinicalStudyFormData.relevant_history,
            results_text: clinicalStudyFormData.results_text,
            interpretation: clinicalStudyFormData.interpretation,
            ordering_doctor: clinicalStudyFormData.ordering_doctor,
            performing_doctor: clinicalStudyFormData.performing_doctor,
            institution: clinicalStudyFormData.institution,
            file_name: clinicalStudyFormData.file_name,
            file_path: clinicalStudyFormData.file_path,
            file_type: clinicalStudyFormData.file_type,
            file_size: clinicalStudyFormData.file_size,
            created_by: clinicalStudyFormData.created_by,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('🔬 Temporary study created:', tempStudy);
          setStudies(prev => {
            const newStudies = [...prev, tempStudy];
            console.log('🔬 Updated studies list:', newStudies);
            return newStudies;
          });
        } else {
          await createStudy(clinicalStudyFormData);
        }
      }
      closeDialog();
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