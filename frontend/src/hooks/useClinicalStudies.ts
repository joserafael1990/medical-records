// ============================================================================
// CLINICAL STUDIES HOOK - Gestión de estudios clínicos
// ============================================================================

import { useState, useCallback } from 'react';
import { ClinicalStudy, ClinicalStudyFormData } from '../types';
import { apiService } from '../services/api';

export interface UseClinicalStudiesReturn {
  // State
  clinicalStudyDialogOpen: boolean;
  isEditingClinicalStudy: boolean;
  selectedClinicalStudy: ClinicalStudy | null;
  clinicalStudyFormData: ClinicalStudyFormData;
  clinicalStudyFormErrorMessage: string;
  clinicalStudyFieldErrors: { [key: string]: string };
  isClinicalStudySubmitting: boolean;
  tempConsultationId: string | null;
  tempClinicalStudies: ClinicalStudy[];

  // Actions
  setClinicalStudyDialogOpen: (open: boolean) => void;
  setIsEditingClinicalStudy: (editing: boolean) => void;
  setSelectedClinicalStudy: (study: ClinicalStudy | null) => void;
  setClinicalStudyFormData: (data: ClinicalStudyFormData) => void;
  setClinicalStudyFormErrorMessage: (message: string) => void;
  setClinicalStudyFieldErrors: (errors: { [key: string]: string }) => void;
  setIsClinicalStudySubmitting: (submitting: boolean) => void;
  setTempConsultationId: (id: string | null) => void;
  setTempClinicalStudies: (studies: ClinicalStudy[]) => void;

  // Utilities
  saveStudiesToStorage: (consultationId: string, studies: ClinicalStudy[]) => void;
  loadStudiesFromStorage: (consultationId: string) => ClinicalStudy[];
  getCurrentConsultationStudies: (selectedConsultation?: any) => ClinicalStudy[];
  updateCurrentConsultationStudies: (studies: ClinicalStudy[], selectedConsultation?: any) => void;

  // Handlers
  handleAddClinicalStudy: (selectedConsultation?: any, doctorProfile?: any, consultationFormData?: any) => void;
  handleEditClinicalStudy: (study: ClinicalStudy) => void;
  handleDeleteClinicalStudy: (studyId: string, selectedConsultation?: any) => void;
  handleClinicalStudySubmit: (selectedConsultation?: any) => Promise<void>;
}

export const useClinicalStudies = (): UseClinicalStudiesReturn => {
  // State
  const [clinicalStudyDialogOpen, setClinicalStudyDialogOpen] = useState(false);
  const [isEditingClinicalStudy, setIsEditingClinicalStudy] = useState(false);
  const [selectedClinicalStudy, setSelectedClinicalStudy] = useState<ClinicalStudy | null>(null);
  const [clinicalStudyFormData, setClinicalStudyFormData] = useState<ClinicalStudyFormData>({
    consultation_id: '',
    patient_id: '',
    study_type: 'hematologia',
    study_name: '',
    study_description: '',
    ordered_date: '',
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
  const [clinicalStudyFormErrorMessage, setClinicalStudyFormErrorMessage] = useState('');
  const [clinicalStudyFieldErrors, setClinicalStudyFieldErrors] = useState<{[key: string]: string}>({});
  const [isClinicalStudySubmitting, setIsClinicalStudySubmitting] = useState(false);
  const [tempConsultationId, setTempConsultationId] = useState<string | null>(null);
  const [tempClinicalStudies, setTempClinicalStudies] = useState<ClinicalStudy[]>([]);

  // Helper functions for localStorage persistence
  const saveStudiesToStorage = (consultationId: string, studies: ClinicalStudy[]) => {
    try {
      localStorage.setItem(`clinical_studies_${consultationId}`, JSON.stringify(studies));
    } catch (error) {
      console.error('Error saving studies to localStorage:', error);
    }
  };

  const loadStudiesFromStorage = (consultationId: string): ClinicalStudy[] => {
    try {
      const stored = localStorage.getItem(`clinical_studies_${consultationId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading studies from localStorage:', error);
      return [];
    }
  };
  
  // Helper function to get clinical studies for current consultation
  const getCurrentConsultationStudies = (selectedConsultation?: any): ClinicalStudy[] => {
    // If we have a selected consultation (viewing/editing existing), load from localStorage
    if (selectedConsultation?.id) {
      return loadStudiesFromStorage(selectedConsultation.id);
    }
    // If we're creating a new consultation, use temporary studies
    if (tempConsultationId && !selectedConsultation) {
      return tempClinicalStudies;
    }
    return [];
  };

  // Helper function to update clinical studies for current consultation
  const updateCurrentConsultationStudies = (studies: ClinicalStudy[], selectedConsultation?: any) => {
    if (selectedConsultation?.id) {
      // Updating existing consultation - save to localStorage
      saveStudiesToStorage(selectedConsultation.id, studies);
    } else if (tempConsultationId) {
      // Updating temporary consultation
      setTempClinicalStudies(studies);
    }
  };

  // Handlers
  const handleAddClinicalStudy = useCallback((selectedConsultation?: any, doctorProfile?: any, consultationFormData?: any) => {
    let consultationId: string;
    let patientId: string;
    
    if (selectedConsultation) {
      // Existing consultation
      consultationId = selectedConsultation.id;
      patientId = selectedConsultation.patient_id;
    } else {
      // New consultation - generate temporary ID if not exists
      if (!tempConsultationId) {
        const newTempId = `temp_consultation_${Date.now()}`;
        setTempConsultationId(newTempId);
        consultationId = newTempId;
      } else {
        consultationId = tempConsultationId;
      }
      patientId = consultationFormData?.patient_id || '';
    }

    const currentStudies = getCurrentConsultationStudies(selectedConsultation);
    
    // Initialize form with consultation/patient data
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
      ordering_doctor: doctorProfile?.full_name || 'Dr. Usuario Sistema',
      performing_doctor: '',
      institution: '',
      urgency: 'normal',
      clinical_indication: '',
      relevant_history: '',
      created_by: doctorProfile?.id || ''
    });

    setIsEditingClinicalStudy(false);
    setSelectedClinicalStudy(null);
    setClinicalStudyFormErrorMessage('');
    setClinicalStudyFieldErrors({});
    setClinicalStudyDialogOpen(true);
  }, [tempConsultationId, getCurrentConsultationStudies]);

  const handleEditClinicalStudy = useCallback((study: ClinicalStudy) => {
    setSelectedClinicalStudy(study);
    setIsEditingClinicalStudy(true);
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
      urgency: study.urgency || 'normal',
      clinical_indication: study.clinical_indication || '',
      relevant_history: study.relevant_history || '',
      created_by: study.created_by
    });
    setClinicalStudyFormErrorMessage('');
    setClinicalStudyFieldErrors({});
    setClinicalStudyDialogOpen(true);
  }, []);

  const handleDeleteClinicalStudy = useCallback((studyId: string, selectedConsultation?: any) => {
    const currentStudies = getCurrentConsultationStudies(selectedConsultation);
    const updatedStudies = currentStudies.filter(study => study.id !== studyId);
    updateCurrentConsultationStudies(updatedStudies, selectedConsultation);
  }, [getCurrentConsultationStudies, updateCurrentConsultationStudies]);

  const handleClinicalStudySubmit = useCallback(async (selectedConsultation?: any) => {
    const currentStudies = getCurrentConsultationStudies(selectedConsultation);

    if (!selectedConsultation && !tempConsultationId) {
      console.error('❌ No hay consulta seleccionada ni ID temporal');
      setClinicalStudyFormErrorMessage('Error: No hay consulta disponible');
      return;
    }

    setIsClinicalStudySubmitting(true);
    setClinicalStudyFormErrorMessage('');
    
    try {
      if (isEditingClinicalStudy && selectedClinicalStudy) {
        // Update existing study
        const updatedStudy: ClinicalStudy = {
          ...selectedClinicalStudy,
          study_type: clinicalStudyFormData.study_type,
          study_name: clinicalStudyFormData.study_name,
          study_description: clinicalStudyFormData.study_description,
          ordered_date: clinicalStudyFormData.ordered_date,
          status: clinicalStudyFormData.status,
          results_text: clinicalStudyFormData.results_text,
          interpretation: clinicalStudyFormData.interpretation,
          ordering_doctor: clinicalStudyFormData.ordering_doctor,
          performing_doctor: clinicalStudyFormData.performing_doctor,
          institution: clinicalStudyFormData.institution,
          urgency: clinicalStudyFormData.urgency,
          clinical_indication: clinicalStudyFormData.clinical_indication,
          relevant_history: clinicalStudyFormData.relevant_history,
          created_by: clinicalStudyFormData.created_by
        };

        const updatedStudies = currentStudies.map(study => 
          study.id === selectedClinicalStudy.id ? updatedStudy : study
        );
        updateCurrentConsultationStudies(updatedStudies, selectedConsultation);
      } else {
        // Create new study
        const consultationId = selectedConsultation?.id || tempConsultationId;
        const patientId = selectedConsultation?.patient_id || clinicalStudyFormData.patient_id;
        
        if (!consultationId) {
          console.error('❌ No se pudo determinar el ID de consulta');
          setClinicalStudyFormErrorMessage('Error: No se pudo asociar el estudio a la consulta');
          return;
        }
        
        const newStudy: ClinicalStudy = {
          id: `cs_${Date.now()}`, // ID temporal
          consultation_id: consultationId,
          patient_id: patientId,
          study_type: clinicalStudyFormData.study_type,
          study_name: clinicalStudyFormData.study_name,
          study_description: clinicalStudyFormData.study_description,
          ordered_date: clinicalStudyFormData.ordered_date,
          performed_date: clinicalStudyFormData.performed_date,
          results_date: clinicalStudyFormData.results_date,
          status: clinicalStudyFormData.status,
          results_text: clinicalStudyFormData.results_text,
          interpretation: clinicalStudyFormData.interpretation,
          ordering_doctor: clinicalStudyFormData.ordering_doctor,
          performing_doctor: clinicalStudyFormData.performing_doctor,
          institution: clinicalStudyFormData.institution,
          urgency: clinicalStudyFormData.urgency,
          clinical_indication: clinicalStudyFormData.clinical_indication,
          relevant_history: clinicalStudyFormData.relevant_history,
          created_at: new Date().toISOString(),
          created_by: clinicalStudyFormData.created_by
        };
        
        const updatedStudies = [...currentStudies, newStudy];
        updateCurrentConsultationStudies(updatedStudies, selectedConsultation);
      }
      
      setClinicalStudyDialogOpen(false);
      setSelectedClinicalStudy(null);
      setIsEditingClinicalStudy(false);
      
    } catch (error) {
      console.error('Error al guardar estudio clínico:', error);
      setClinicalStudyFormErrorMessage('Error al guardar el estudio clínico');
    } finally {
      setIsClinicalStudySubmitting(false);
    }
  }, [isEditingClinicalStudy, selectedClinicalStudy, clinicalStudyFormData, tempConsultationId, getCurrentConsultationStudies, updateCurrentConsultationStudies]);

  return {
    // State
    clinicalStudyDialogOpen,
    isEditingClinicalStudy,
    selectedClinicalStudy,
    clinicalStudyFormData,
    clinicalStudyFormErrorMessage,
    clinicalStudyFieldErrors,
    isClinicalStudySubmitting,
    tempConsultationId,
    tempClinicalStudies,

    // Actions
    setClinicalStudyDialogOpen,
    setIsEditingClinicalStudy,
    setSelectedClinicalStudy,
    setClinicalStudyFormData,
    setClinicalStudyFormErrorMessage,
    setClinicalStudyFieldErrors,
    setIsClinicalStudySubmitting,
    setTempConsultationId,
    setTempClinicalStudies,

    // Utilities
    saveStudiesToStorage,
    loadStudiesFromStorage,
    getCurrentConsultationStudies,
    updateCurrentConsultationStudies,

    // Handlers
    handleAddClinicalStudy,
    handleEditClinicalStudy,
    handleDeleteClinicalStudy,
    handleClinicalStudySubmit
  };
};
