// ============================================================================
// CONSULTATION MANAGER HOOK - Gestión de consultas médicas
// ============================================================================

import { useState, useCallback } from 'react';
import { Consultation, ConsultationFormData } from '../types';
import { apiService } from '../services/api';

export interface UseConsultationManagerReturn {
  // State
  consultations: Consultation[];
  consultationDialogOpen: boolean;
  isEditingConsultation: boolean;
  selectedConsultation: Consultation | null;
  consultationFormData: ConsultationFormData;
  consultationFormErrorMessage: string;
  consultationFieldErrors: { [key: string]: string };
  isConsultationSubmitting: boolean;
  consultationSearchTerm: string;
  consultationDetailView: boolean;

  // Actions
  setConsultations: (consultations: Consultation[]) => void;
  setConsultationDialogOpen: (open: boolean) => void;
  setIsEditingConsultation: (editing: boolean) => void;
  setSelectedConsultation: (consultation: Consultation | null) => void;
  setConsultationFormData: (data: ConsultationFormData | ((prev: ConsultationFormData) => ConsultationFormData)) => void;
  setConsultationFormErrorMessage: (message: string) => void;
  setConsultationFieldErrors: (errors: { [key: string]: string }) => void;
  setIsConsultationSubmitting: (submitting: boolean) => void;
  setConsultationSearchTerm: (term: string) => void;
  setConsultationDetailView: (view: boolean) => void;

  // Handlers
  fetchConsultations: () => Promise<void>;
  handleNewConsultation: (fetchPatients: () => Promise<void>) => void;
  handleEditConsultation: (consultation: Consultation, fetchPatients: () => Promise<void>) => void;
  handleDeleteConsultation: (consultation: Consultation) => Promise<void>;
  handleConsultationSubmit: (
    doctorProfile: any,
    tempConsultationId: string | null,
    tempClinicalStudies: any[],
    saveStudiesToStorage: (consultationId: string, studies: any[]) => void,
    setTempConsultationId: (id: string | null) => void,
    setTempClinicalStudies: (studies: any[]) => void,
    showSuccessMessage: (message: string) => void
  ) => Promise<void>;
  handleViewConsultation: (consultation: Consultation) => void;
  handlePrintConsultation: (consultation: Consultation) => void;
  handleBackFromConsultationDetail: () => void;
}

export const useConsultationManager = (): UseConsultationManagerReturn => {
  // State
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [isEditingConsultation, setIsEditingConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [consultationFormData, setConsultationFormData] = useState<ConsultationFormData>({
    patient_id: '',
    date: '',
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
  const [consultationFormErrorMessage, setConsultationFormErrorMessage] = useState('');
  const [consultationFieldErrors, setConsultationFieldErrors] = useState<{[key: string]: string}>({});
  const [isConsultationSubmitting, setIsConsultationSubmitting] = useState(false);
  const [consultationSearchTerm, setConsultationSearchTerm] = useState('');
  const [consultationDetailView, setConsultationDetailView] = useState(false);

  // Helper to create empty form data
  const createEmptyConsultationFormData = (): ConsultationFormData => ({
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

  // Fetch consultations from API
  const fetchConsultations = useCallback(async () => {
    try {
      const data = await apiService.getConsultations({ 
        patient_search: consultationSearchTerm 
      });
      setConsultations(data);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    }
  }, [consultationSearchTerm]);

  // Handle new consultation
  const handleNewConsultation = useCallback((fetchPatients: () => Promise<void>) => {
    setSelectedConsultation(null);
    setIsEditingConsultation(false);
    setConsultationFormData(createEmptyConsultationFormData());
    setConsultationFormErrorMessage('');
    setConsultationFieldErrors({});
    fetchPatients();
    setConsultationDialogOpen(true);
    setConsultationDetailView(false);
  }, []);

  // Handle edit consultation
  const handleEditConsultation = useCallback((consultation: Consultation, fetchPatients: () => Promise<void>) => {
    setSelectedConsultation(consultation);
    setIsEditingConsultation(true);
    setConsultationFormData({
      ...createEmptyConsultationFormData(),
      patient_id: consultation.patient_id || '',
      date: consultation.date || '',
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
    setConsultationFormErrorMessage('');
    setConsultationFieldErrors({});
    fetchPatients();
    setConsultationDialogOpen(true);
    setConsultationDetailView(false);
  }, []);

  // Handle delete consultation
  const handleDeleteConsultation = useCallback(async (consultation: Consultation) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la consulta de ${consultation.patient_name}?`)) {
      return;
    }

    try {
      await apiService.deleteConsultation(consultation.id);
      await fetchConsultations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting consultation:', error);
      alert('Error al eliminar la consulta');
    }
  }, [fetchConsultations]);

  // Handle consultation form submission
  const handleConsultationSubmit = useCallback(async (
    doctorProfile: any,
    tempConsultationId: string | null,
    tempClinicalStudies: any[],
    saveStudiesToStorage: (consultationId: string, studies: any[]) => void,
    setTempConsultationId: (id: string | null) => void,
    setTempClinicalStudies: (studies: any[]) => void,
    showSuccessMessage: (message: string) => void
  ) => {
    setIsConsultationSubmitting(true);
    setConsultationFormErrorMessage('');
    
    try {
      // Map frontend data to backend format  
      const consultationData = {
        patient_id: consultationFormData.patient_id,
        date: consultationFormData.date ? new Date(consultationFormData.date).toISOString() : new Date().toISOString(),
        chief_complaint: consultationFormData.chief_complaint || '',
        history_present_illness: consultationFormData.history_present_illness || '',
        family_history: consultationFormData.family_history || '',
        personal_pathological_history: consultationFormData.personal_pathological_history || '',
        personal_non_pathological_history: consultationFormData.personal_non_pathological_history || '',
        physical_examination: consultationFormData.physical_examination || '',
        primary_diagnosis: consultationFormData.primary_diagnosis || '',
        secondary_diagnoses: consultationFormData.secondary_diagnoses || '',
        differential_diagnosis: '',
        treatment_plan: consultationFormData.treatment_plan || '',
        prescribed_medications: '',
        follow_up_instructions: consultationFormData.follow_up_instructions || '',
        therapeutic_plan: '',
        prognosis: '',
        laboratory_results: '',
        imaging_studies: '',
        interconsultations: '',
        doctor_name: doctorProfile 
          ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.paternal_surname} ${doctorProfile.maternal_surname || ''}`.trim()
          : 'Dr. Usuario',
        doctor_professional_license: doctorProfile?.professional_license || '',
        doctor_specialty: doctorProfile?.specialty || 'Medicina General'
      };
      
      let result: any;
      if (isEditingConsultation && selectedConsultation) {
        result = await apiService.updateConsultation(selectedConsultation.id, consultationData);
      } else {
        result = await apiService.createConsultation(consultationFormData.patient_id, consultationData);
      }
      
      // Update temporary clinical studies with real consultation ID if creating new consultation
      if (!isEditingConsultation && tempConsultationId && tempClinicalStudies.length > 0) {
        // Update the consultation_id in temporary studies
        const updatedStudies = tempClinicalStudies.map(study => ({
          ...study,
          consultation_id: result.id
        }));
        
        // Save studies to localStorage with real consultation ID
        saveStudiesToStorage(result.id, updatedStudies);
        
        // Clear temporary data
        setTempConsultationId(null);
        setTempClinicalStudies([]);
      }
      
      showSuccessMessage(
        isEditingConsultation 
          ? 'Consulta actualizada exitosamente' 
          : 'Consulta creada exitosamente'
      );
      setConsultationDialogOpen(false);
      fetchConsultations(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving consultation:', error);
      
      // Parse API errors properly
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          setConsultationFormErrorMessage(detail);
        } else if (Array.isArray(detail)) {
          // Handle Pydantic validation errors
          const errorMessages = detail.map((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0] || 'Campo';
            return `${field}: ${err.msg}`;
          }).join(', ');
          setConsultationFormErrorMessage(errorMessages);
          
          // Set individual field errors
          const newFieldErrors: {[key: string]: string} = {};
          detail.forEach((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0];
            if (field) {
              newFieldErrors[field] = err.msg;
            }
          });
          setConsultationFieldErrors(newFieldErrors);
        } else {
          setConsultationFormErrorMessage('Error al guardar la consulta');
        }
      } else {
        setConsultationFormErrorMessage('Error de conexión al guardar la consulta');
      }
    } finally {
      setIsConsultationSubmitting(false);
    }
  }, [consultationFormData, isEditingConsultation, selectedConsultation, fetchConsultations]);

  // Handle view consultation
  const handleViewConsultation = useCallback((consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setConsultationDetailView(true);
  }, []);

  // Handle print consultation
  const handlePrintConsultation = useCallback((consultation: Consultation) => {
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Consulta Médica - ${consultation.patient_name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #1976d2; }
              .section { margin: 10px 0; }
              .label { font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Consulta Médica</h1>
            <div class="section">
              <span class="label">Paciente:</span> ${consultation.patient_name}
            </div>
            <div class="section">
              <span class="label">Fecha:</span> ${consultation.date}
            </div>
            <div class="section">
              <span class="label">Motivo de consulta:</span> ${consultation.chief_complaint}
            </div>
            <div class="section">
              <span class="label">Historia de la enfermedad actual:</span> ${consultation.history_present_illness}
            </div>
            <div class="section">
              <span class="label">Exploración física:</span> ${consultation.physical_examination}
            </div>
            <div class="section">
              <span class="label">Diagnóstico principal:</span> ${consultation.primary_diagnosis}
            </div>
            <div class="section">
              <span class="label">Plan de tratamiento:</span> ${consultation.treatment_plan}
            </div>
            <div class="section">
              <span class="label">Instrucciones de seguimiento:</span> ${consultation.follow_up_instructions}
            </div>
            <div class="section">
              <span class="label">Médico:</span> ${consultation.doctor_name}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, []);

  // Handle back from consultation detail
  const handleBackFromConsultationDetail = useCallback(() => {
    setConsultationDetailView(false);
    setSelectedConsultation(null);
  }, []);

  return {
    // State
    consultations,
    consultationDialogOpen,
    isEditingConsultation,
    selectedConsultation,
    consultationFormData,
    consultationFormErrorMessage,
    consultationFieldErrors,
    isConsultationSubmitting,
    consultationSearchTerm,
    consultationDetailView,

    // Actions
    setConsultations,
    setConsultationDialogOpen,
    setIsEditingConsultation,
    setSelectedConsultation,
    setConsultationFormData,
    setConsultationFormErrorMessage,
    setConsultationFieldErrors,
    setIsConsultationSubmitting,
    setConsultationSearchTerm,
    setConsultationDetailView,

    // Handlers
    fetchConsultations,
    handleNewConsultation,
    handleEditConsultation,
    handleDeleteConsultation,
    handleConsultationSubmit,
    handleViewConsultation,
    handlePrintConsultation,
    handleBackFromConsultationDetail
  };
};