/**
 * Patient management using generic CRUD hook
 * Demonstrates how to use the generic useCRUD hook for specific resources
 */
import { useCRUD } from './useCRUD';
import { apiService } from '../services/api';
import { Patient, PatientFormData } from '../types';
import { VALIDATION_RULES } from '../constants';

// Validation function for patient data
const validatePatient = (data: PatientFormData): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Required fields validation
  VALIDATION_RULES.REQUIRED_FIELDS.PATIENT.forEach(field => {
    if (!data[field as keyof PatientFormData] || 
        String(data[field as keyof PatientFormData]).trim() === '') {
      errors[field] = `${field.replace('_', ' ')} es obligatorio`;
    }
  });
  
  // Email validation (if provided)
  if (data.email && !VALIDATION_RULES.EMAIL.REGEX?.test(data.email)) {
    errors.email = 'Formato de email inválido';
  }
  
  // CURP validation (if provided)
  if (data.curp && !VALIDATION_RULES.CURP.REGEX?.test(data.curp)) {
    errors.curp = 'Formato de CURP inválido';
  }
  
  // Phone validation (if provided)
  if (data.phone && !VALIDATION_RULES.PHONE.MEXICO_REGEX?.test(data.phone)) {
    errors.phone = 'Formato de teléfono inválido';
  }
  
  return errors;
};

// Transform data for API
const transformForCreate = (data: PatientFormData) => ({
  ...data,
  status: 'active' as const,
  // Convert empty strings to appropriate values
  birth_state_code: data.birth_state_code || '',
  nationality: data.nationality || 'Mexicana',
  curp: data.curp || '',
  internal_id: data.internal_id || '',
  email: data.email || '',
  neighborhood: data.neighborhood || '',
  municipality: data.municipality || '',
  state: data.state || '',
  postal_code: data.postal_code || '',
  civil_status: data.civil_status || '',
  education_level: data.education_level || '',
  occupation: data.occupation || '',
  religion: data.religion || '',
  insurance_type: data.insurance_type || '',
  insurance_number: data.insurance_number || '',
  emergency_contact_name: data.emergency_contact_name || '',
  emergency_contact_phone: data.emergency_contact_phone || '',
  emergency_contact_relationship: data.emergency_contact_relationship || '',
  emergency_contact_address: data.emergency_contact_address || '',
  allergies: data.allergies || '',
  chronic_conditions: data.chronic_conditions || '',
  current_medications: data.current_medications || '',
  blood_type: data.blood_type || '',
  previous_hospitalizations: data.previous_hospitalizations || '',
  surgical_history: data.surgical_history || ''
});

// Initial form data
const initialFormData: PatientFormData = {
  // Required fields
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  birth_date: '',
  gender: '',
  address: '',
  
  // Optional fields
  birth_state_code: '',
  nationality: 'Mexicana',
  curp: '',
  internal_id: '',
  phone: '',
  email: '',
  neighborhood: '',
  municipality: '',
  state: '',
  postal_code: '',
  civil_status: '',
  education_level: '',
  occupation: '',
  religion: '',
  insurance_type: '',
  insurance_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  emergency_contact_address: '',
  allergies: '',
  chronic_conditions: '',
  current_medications: '',
  blood_type: '',
  previous_hospitalizations: '',
  surgical_history: '',
  status: 'active' as 'active' | 'inactive'
};

export const usePatientCRUD = () => {
  return useCRUD<Patient, PatientFormData>({
    resourceName: 'paciente',
    api: {
      getAll: apiService.getPatients,
      create: apiService.createPatient,
      update: apiService.updatePatient,
      delete: apiService.deletePatient
    },
    initialFormData,
    validate: validatePatient,
    transformForCreate,
    transformForUpdate: transformForCreate, // Same transformation for update
    messages: {
      created: '✅ Paciente creado exitosamente',
      updated: '✅ Paciente actualizado exitosamente',
      deleted: '🗑️ Paciente eliminado exitosamente'
    }
  });
};
