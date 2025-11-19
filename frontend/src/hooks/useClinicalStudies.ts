// ============================================================================
// CLINICAL STUDIES HOOK - Gestión de estudios clínicos
// ============================================================================

import { useState, useCallback } from 'react';
import { ClinicalStudy, CreateClinicalStudyData, UpdateClinicalStudyData } from '../types';
import { apiService } from '../services';
import { logger } from '../utils/logger';

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
  addTemporaryStudy: (study: ClinicalStudy) => void;
  
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
    status: 'ordered',
    results_text: '',
    interpretation: '',
    ordering_doctor: '',
    performing_doctor: '',
    institution: '',
    urgency: 'routine',
    clinical_indication: '',
    relevant_history: '',
    created_by: ''
  });

  // Fetch studies for a consultation
  const fetchStudies = useCallback(async (consultationId: string) => {
    logger.debug('Fetching clinical studies for consultation', { consultationId }, 'api');
    setIsLoading(true);
    setError(null);
    
    try {
      const studiesData = await apiService.clinicalStudies.getClinicalStudiesByConsultation(consultationId);
      logger.debug('Clinical studies fetched successfully', { count: studiesData?.length }, 'api');
      setStudies(studiesData || []);
    } catch (err: any) {
      logger.error('Error fetching clinical studies', err, 'api');
      setError('Error al cargar los estudios clínicos');
      setStudies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new study
  const createStudy = useCallback(async (studyData: CreateClinicalStudyData): Promise<ClinicalStudy> => {
    try {
      logger.debug('Creating clinical study', { studyName: studyData.study_name }, 'api');
      const newStudy = await apiService.clinicalStudies.createClinicalStudy(studyData);
      logger.debug('Clinical study created successfully', { id: newStudy.id }, 'api');
      
      // Add to local state
      setStudies(prev => [...prev, newStudy]);
      
      return newStudy;
    } catch (err: any) {
      logger.error('Error creating clinical study', err, 'api');
      throw err;
    }
  }, []);

  // Update an existing study
  const updateStudy = useCallback(async (studyId: string, studyData: UpdateClinicalStudyData): Promise<ClinicalStudy> => {
    try {
      logger.debug('Updating clinical study', { studyId }, 'api');
      const updatedStudy = await apiService.clinicalStudies.updateClinicalStudy(studyId, studyData);
      logger.debug('Clinical study updated successfully', { id: updatedStudy.id }, 'api');
      
      // Update local state
      setStudies(prev => prev.map(study => 
        study.id === studyId ? updatedStudy : study
      ));
      
      return updatedStudy;
    } catch (err: any) {
      logger.error('Error updating clinical study', err, 'api');
      throw err;
    }
  }, []);

  // Delete a study
  const deleteStudy = useCallback(async (studyId: string) => {
    try {
      // Check if it's a temporary study (starts with 'temp_')
      if (studyId.startsWith('temp_')) {
        logger.debug('Deleting temporary clinical study', { studyId }, 'api');
        // For temporary studies, just remove from local state
        setStudies(prev => prev.filter(study => study.id !== studyId));
        return;
      }
      
      // For persistent studies, call the API
      logger.debug('Deleting clinical study', { studyId }, 'api');
      await apiService.clinicalStudies.deleteClinicalStudy(studyId);
      logger.debug('Clinical study deleted successfully', { studyId }, 'api');
      
      // Remove from local state
      setStudies(prev => prev.filter(study => study.id !== studyId));
      
    } catch (err: any) {
      logger.error('Error deleting clinical study', err, 'api');
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
      status: 'ordered',
      results_text: '',
      interpretation: '',
      ordering_doctor: doctorName,
      performing_doctor: '',
      institution: '',
      urgency: 'routine',
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

  // Add temporary study (for new consultations before saving)
  const addTemporaryStudy = useCallback((study: ClinicalStudy) => {
    setStudies(prev => {
      const newStudies = [...prev, study];
      return newStudies;
    });
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
        // Refresh studies after update
        if (dataToSubmit.consultation_id && dataToSubmit.consultation_id !== 'temp_consultation') {
          await fetchStudies(dataToSubmit.consultation_id);
        }
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
          // For existing consultations, create in database and refresh
          await createStudy(dataToSubmit);
          // Refresh studies from database to ensure we have the latest data
          if (dataToSubmit.consultation_id) {
            await fetchStudies(dataToSubmit.consultation_id);
          }
        }
      }
    } catch (err) {
      logger.error('Error submitting clinical study form', err, 'api');
      setError('Error al guardar el estudio clínico');
      throw err; // Re-throw to let the dialog handle it
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingClinicalStudy, selectedClinicalStudy, clinicalStudyFormData, createStudy, updateStudy, fetchStudies]);

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
      logger.error('Error downloading file', err, 'ui');
    }
  }, []);

  const viewFile = useCallback((fileUrl: string) => {
    try {
      window.open(fileUrl, '_blank');
    } catch (err) {
      logger.error('Error viewing file', err, 'ui');
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
    addTemporaryStudy,
    
    // File operations
    downloadFile,
    viewFile
  };
};