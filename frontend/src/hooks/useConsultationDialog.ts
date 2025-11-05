import { useState, useEffect, useCallback } from 'react';
import { useConsultationManagement } from './useConsultationManagement';
import { useStudyCatalog } from './useStudyCatalog';
import { usePatientManagement } from './usePatientManagement';
import { useAppointmentManager } from './useAppointmentManager';
import { useScrollToError } from './useScrollToError';
import { useToast } from '../components/common/ToastNotification';

export interface ConsultationFormData {
  patient_id: string;
  appointment_id?: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  perinatal_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  notes: string;
  vital_signs: {
    blood_pressure_systolic: number;
    blood_pressure_diastolic: number;
    heart_rate: number;
    temperature: number;
    weight: number;
    height: number;
    bmi: number;
  };
  clinical_studies: Array<{
    id: string;
    study_name: string;
    study_type: string;
    description?: string;
    is_temporary?: boolean;
  }>;
  prescriptions: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    via_administracion: string;
    instructions: string;
  }>;
}

export interface UseConsultationDialogReturn {
  // Form state
  formData: ConsultationFormData;
  setFormData: React.Dispatch<React.SetStateAction<ConsultationFormData>>;
  
  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Error handling
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  // Form actions
  handleInputChange: (field: string, value: any) => void;
  handleVitalSignsChange: (field: string, value: number) => void;
  handleAddStudy: (study: any) => void;
  handleRemoveStudy: (studyId: string) => void;
  handleAddPrescription: (prescription: any) => void;
  handleRemovePrescription: (prescriptionId: string) => void;
  handleSubmit: (onSuccess?: () => void) => Promise<void>;
  handleReset: () => void;
  
  // Validation
  validateForm: () => boolean;
  calculateBMI: (weight: number, height: number) => number;
  
  // Data
  patients: any[];
  appointments: any[];
  studies: any[];
  medications: any[];
}

export const useConsultationDialog = (
  consultation?: any,
  onSuccess?: () => void
): UseConsultationDialogReturn => {
  const { showSuccess, showError } = useToast();
  const { createConsultation, updateConsultation } = useConsultationManagement();
  const { studies, loadStudies } = useStudyCatalog();
  const { patients, loadPatients } = usePatientManagement();
  const { appointments, loadAppointments } = useAppointmentManager();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ConsultationFormData>({
    patient_id: '',
    appointment_id: '',
    chief_complaint: '',
    history_present_illness: '',
    family_history: '',
    perinatal_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    physical_examination: '',
    primary_diagnosis: '',
    secondary_diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    notes: '',
    vital_signs: {
      blood_pressure_systolic: 0,
      blood_pressure_diastolic: 0,
      heart_rate: 0,
      temperature: 0,
      weight: 0,
      height: 0,
      bmi: 0,
    },
    clinical_studies: [],
    prescriptions: [],
  });

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadPatients(),
          loadAppointments(),
          loadStudies(),
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        showError('Error al cargar los datos');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadPatients, loadAppointments, loadStudies, showError]);

  // Populate form when consultation is provided
  useEffect(() => {
    if (consultation) {
      setFormData({
        patient_id: consultation.patient_id || '',
        appointment_id: consultation.appointment_id || '',
        chief_complaint: consultation.chief_complaint || '',
        history_present_illness: consultation.history_present_illness || '',
        family_history: consultation.family_history || '',
        perinatal_history: consultation.perinatal_history || '',
        personal_pathological_history: consultation.personal_pathological_history || '',
        personal_non_pathological_history: consultation.personal_non_pathological_history || '',
        physical_examination: consultation.physical_examination || '',
        primary_diagnosis: consultation.primary_diagnosis || '',
        secondary_diagnosis: consultation.secondary_diagnosis || '',
        treatment_plan: consultation.treatment_plan || '',
        follow_up_instructions: consultation.follow_up_instructions || '',
        notes: consultation.notes || '',
        vital_signs: {
          blood_pressure_systolic: consultation.vital_signs?.blood_pressure_systolic || 0,
          blood_pressure_diastolic: consultation.vital_signs?.blood_pressure_diastolic || 0,
          heart_rate: consultation.vital_signs?.heart_rate || 0,
          temperature: consultation.vital_signs?.temperature || 0,
          weight: consultation.vital_signs?.weight || 0,
          height: consultation.vital_signs?.height || 0,
          bmi: consultation.vital_signs?.bmi || 0,
        },
        clinical_studies: consultation.clinical_studies || [],
        prescriptions: consultation.prescriptions || [],
      });
    }
  }, [consultation]);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const handleVitalSignsChange = useCallback((field: string, value: number) => {
    setFormData(prev => {
      const newVitalSigns = {
        ...prev.vital_signs,
        [field]: value
      };
      
      // Calculate BMI if weight or height changed
      if (field === 'weight' || field === 'height') {
        newVitalSigns.bmi = calculateBMI(newVitalSigns.weight, newVitalSigns.height);
      }
      
      return {
        ...prev,
        vital_signs: newVitalSigns
      };
    });
  }, []);

  const calculateBMI = useCallback((weight: number, height: number): number => {
    if (weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    return 0;
  }, []);

  const handleAddStudy = useCallback((study: any) => {
    setFormData(prev => ({
      ...prev,
      clinical_studies: [...prev.clinical_studies, {
        id: `temp_${Date.now()}`,
        study_name: study.name,
        study_type: study.category,
        description: study.description,
        is_temporary: true,
        ...study
      }]
    }));
  }, []);

  const handleRemoveStudy = useCallback((studyId: string) => {
    setFormData(prev => ({
      ...prev,
      clinical_studies: (prev.clinical_studies || []).filter(study => study.id !== studyId)
    }));
  }, []);

  const handleAddPrescription = useCallback((prescription: any) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        id: `temp_${Date.now()}`,
        medication_name: prescription.name,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        quantity: prescription.quantity,
        via_administracion: prescription.via_administracion,
        instructions: prescription.instructions,
        ...prescription
      }]
    }));
  }, []);

  const handleRemovePrescription = useCallback((prescriptionId: string) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter(prescription => prescription.id !== prescriptionId)
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.patient_id) {
      newErrors.patient_id = 'El paciente es obligatorio';
    }
    
    if (!formData.chief_complaint.trim()) {
      newErrors.chief_complaint = 'El motivo de consulta es obligatorio';
    }
    
    if (!formData.physical_examination.trim()) {
      newErrors.physical_examination = 'El examen físico es obligatorio';
    }
    
    if (!formData.primary_diagnosis.trim()) {
      newErrors.primary_diagnosis = 'El diagnóstico principal es obligatorio';
    }
    
    if (!formData.treatment_plan.trim()) {
      newErrors.treatment_plan = 'El plan de tratamiento es obligatorio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (onSuccessCallback?: () => void) => {
    if (!validateForm()) {
      showError('Por favor, corrige los errores en el formulario');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (consultation) {
        await updateConsultation(consultation.id, formData);
        showSuccess('Consulta actualizada exitosamente');
      } else {
        await createConsultation(formData);
        showSuccess('Consulta creada exitosamente');
      }
      
      onSuccessCallback?.();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving consultation:', error);
      showError(error.message || 'Error al guardar la consulta');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, consultation, validateForm, createConsultation, updateConsultation, showSuccess, showError, onSuccess]);

  const handleReset = useCallback(() => {
    setFormData({
      patient_id: '',
      appointment_id: '',
      chief_complaint: '',
      history_present_illness: '',
      family_history: '',
      personal_pathological_history: '',
      personal_non_pathological_history: '',
      physical_examination: '',
      primary_diagnosis: '',
      secondary_diagnosis: '',
      treatment_plan: '',
      follow_up_instructions: '',
      notes: '',
      vital_signs: {
        blood_pressure_systolic: 0,
        blood_pressure_diastolic: 0,
        heart_rate: 0,
        temperature: 0,
        weight: 0,
        height: 0,
        bmi: 0,
      },
      clinical_studies: [],
      prescriptions: [],
    });
    setErrors({});
  }, []);

  return {
    formData,
    setFormData,
    isLoading,
    isSubmitting,
    errors,
    setErrors,
    handleInputChange,
    handleVitalSignsChange,
    handleAddStudy,
    handleRemoveStudy,
    handleAddPrescription,
    handleRemovePrescription,
    handleSubmit,
    handleReset,
    validateForm,
    calculateBMI,
    patients,
    appointments,
    studies: studies || [],
    medications: [], // TODO: Implement medications hook
  };
};
