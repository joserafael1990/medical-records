export const submitConsultation = async (consultationData: any) => {
  // Implementation for consultation submission
  console.log('Submitting consultation:', consultationData);
  return consultationData;
};

export const validateConsultation = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (!data.patient_id) {
    errors.patient_id = 'Paciente requerido';
  }
  
  if (!data.chief_complaint) {
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

