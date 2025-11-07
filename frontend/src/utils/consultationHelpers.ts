import { apiService } from '../services';
import { logger } from '../utils/logger';

export const submitConsultation = async (params: {
  isEditing: boolean;
  selectedConsultation: any;
  formData: any;
  tempConsultationId: any;
  consultationStudies: any[];
  setFormErrorMessage: (message: string) => void;
  setFieldErrors: (errors: any) => void;
  setIsSubmitting: (loading: boolean) => void;
  setTempClinicalStudies: (studies: any[]) => void;
  showSuccessMessage: (message: string) => void;
  onSuccess: () => Promise<void>;
}) => {
  console.log('Submitting consultation:', params);
  
  try {
    const {
      isEditing,
      selectedConsultation,
      formData,
      tempConsultationId,
      consultationStudies,
      setFormErrorMessage,
      setFieldErrors,
      setIsSubmitting,
      setTempClinicalStudies,
      showSuccessMessage,
      onSuccess
    } = params;

    // Validate required fields
    const validationResult = validateConsultation(formData);
    console.log('📋 Validation result:', validationResult);
    
    if (!validationResult.isValid) {
      setFieldErrors(validationResult.errors);
      setFormErrorMessage('Por favor corrige los errores en el formulario');
      setIsSubmitting(false);
      return;
    }
    

    let result;
    
    if (isEditing && selectedConsultation) {
      // Update existing consultation
      console.log('🔄 Updating existing consultation:', selectedConsultation.id);
      console.log('📊 Sending update data:', formData);
      result = await apiService.consultations.updateConsultation(selectedConsultation.id.toString(), formData);
      showSuccessMessage('✅ Consulta actualizada exitosamente');
    } else {
      // Create new consultation
      console.log('🔄 Creating new consultation');
      result = await apiService.consultations.createConsultation(formData);
      showSuccessMessage('✅ Consulta creada exitosamente');
    }

    // Clear temporary data
    setTempClinicalStudies([]);
    
    // Call success callback
    console.log('🔄 Calling onSuccess callback to refresh consultations list...');
    await onSuccess();
    
    // Reset loading state
    setIsSubmitting(false);
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Error in submitConsultation:', error);
    
    const {
      setFormErrorMessage,
      setFieldErrors,
      setIsSubmitting
    } = params;
    
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        setFormErrorMessage(error.response.data.detail);
      } else if (Array.isArray(error.response.data.detail)) {
        const fieldErrorsFromServer: {[key: string]: string} = {};
        error.response.data.detail.forEach((err: any) => {
          if (err.loc && err.msg) {
            const field = err.loc[err.loc.length - 1];
            fieldErrorsFromServer[field] = err.msg;
          }
        });
        setFieldErrors(fieldErrorsFromServer);
        setFormErrorMessage('Hay errores en el formulario');
      }
    } else {
      setFormErrorMessage('Error al guardar la consulta');
    }
    
    setIsSubmitting(false);
    throw error;
  }
};

export const validateConsultation = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (!data.patient_id) {
    errors.patient_id = 'Paciente requerido';
  }
  
  if (!data.chief_complaint || data.chief_complaint.trim() === '') {
    errors.chief_complaint = 'Motivo de consulta requerido';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  submitConsultation,
  validateConsultation
};
