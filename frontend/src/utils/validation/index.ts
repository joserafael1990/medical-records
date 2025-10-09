/**
 * Unified Validation System
 * Consolidates all validation logic into a centralized, reusable system
 */

import validationSchemas from '../../shared_validation_schemas.json';

// Types
export interface ValidationResult {
  isValid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  field?: string;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'curp' | 'rfc' | 'date' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  message: string;
  value?: any;
  validator?: (value: any) => boolean;
}

export interface FieldValidation {
  [fieldName: string]: ValidationResult;
}

// Language support
type Language = 'es' | 'en';
const currentLanguage: Language = 'es'; // TODO: Get from context

// Validation patterns from centralized schema
const PATTERNS = {
  email: new RegExp(validationSchemas.patterns.email),
  phone: new RegExp(validationSchemas.patterns.phone_mexico),
  curp: new RegExp(validationSchemas.patterns.curp),
  rfc: new RegExp(validationSchemas.patterns.rfc),
  professionalLicense: new RegExp(validationSchemas.patterns.professional_license),
  postalCode: new RegExp(validationSchemas.patterns.postal_code_mexico)
};

// Centralized validation messages
const getValidationMessage = (key: string, params?: Record<string, any>): string => {
  const messages = validationSchemas.messages[currentLanguage] as Record<string, string>;
  let message = messages[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      message = message.replace(`{${param}}`, value.toString());
    });
  }
  
  return message;
};

// Core validation functions
export const validateRequired = (value: any): ValidationResult => {
  const isEmpty = value === null || value === undefined || 
                 (typeof value === 'string' && value.trim() === '') ||
                 (Array.isArray(value) && value.length === 0);
  
  return {
    isValid: !isEmpty,
    message: isEmpty ? getValidationMessage('required') : '',
    severity: 'error'
  };
};

export const validateEmail = (value: string): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  const isValid = PATTERNS.email.test(value);
  return {
    isValid,
    message: isValid ? '' : getValidationMessage('email'),
    severity: 'error'
  };
};

export const validatePhone = (value: string): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  const cleanValue = value.replace(/\s/g, '');
  const isValid = PATTERNS.phone.test(cleanValue);
  
  return {
    isValid,
    message: isValid ? '' : getValidationMessage('phone'),
    severity: 'error'
  };
};

export const validateCURP = (value: string): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  const isValid = PATTERNS.curp.test(value.toUpperCase());
  return {
    isValid,
    message: isValid ? '' : getValidationMessage('curp'),
    severity: 'error'
  };
};

export const validateRFC = (value: string): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  const isValid = PATTERNS.rfc.test(value.toUpperCase());
  return {
    isValid,
    message: isValid ? '' : getValidationMessage('rfc'),
    severity: 'error'
  };
};

export const validateProfessionalLicense = (value: string): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  const isValid = PATTERNS.professionalLicense.test(value);
  return {
    isValid,
    message: isValid ? '' : getValidationMessage('professional_license'),
    severity: 'error'
  };
};

export const validateDate = (value: string, options: { allowFuture?: boolean; allowPast?: boolean } = {}): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  const date = new Date(value);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      message: getValidationMessage('date_format'),
      severity: 'error'
    };
  }
  
  if (!options.allowFuture && date > now) {
    return {
      isValid: false,
      message: getValidationMessage('future_date'),
      severity: 'error'
    };
  }
  
  if (!options.allowPast && date < now) {
    return {
      isValid: false,
      message: getValidationMessage('past_date'),
      severity: 'error'
    };
  }
  
  return { isValid: true, message: '', severity: 'info' };
};

export const validateLength = (value: string, min?: number, max?: number): ValidationResult => {
  if (!value) return { isValid: true, message: '', severity: 'info' };
  
  if (min && value.length < min) {
    return {
      isValid: false,
      message: getValidationMessage('min_length', { min }),
      severity: 'error'
    };
  }
  
  if (max && value.length > max) {
    return {
      isValid: false,
      message: getValidationMessage('max_length', { max }),
      severity: 'error'
    };
  }
  
  return { isValid: true, message: '', severity: 'info' };
};

// Medical-specific validations
export const validateVitalSigns = (field: string, value: number, patientAge?: number): ValidationResult => {
  if (!value && value !== 0) return { isValid: true, message: '', severity: 'info' };
  
  let isValid = true;
  let message = '';
  let severity: 'error' | 'warning' | 'info' | 'success' = 'info';
  
  switch (field) {
    case 'systolic':
      if (value < 70 || value > 200) {
        isValid = false;
        message = 'Presión sistólica fuera del rango normal (70-200 mmHg)';
        severity = value < 90 || value > 180 ? 'error' : 'warning';
      }
      break;
      
    case 'diastolic':
      if (value < 40 || value > 130) {
        isValid = false;
        message = 'Presión diastólica fuera del rango normal (40-130 mmHg)';
        severity = value < 60 || value > 110 ? 'error' : 'warning';
      }
      break;
      
    case 'heartRate':
      const minRate = patientAge && patientAge < 18 ? 70 : 60;
      const maxRate = patientAge && patientAge < 18 ? 130 : 100;
      
      if (value < minRate || value > maxRate) {
        isValid = false;
        message = `Frecuencia cardíaca fuera del rango normal (${minRate}-${maxRate} bpm)`;
        severity = value < 50 || value > 150 ? 'error' : 'warning';
      }
      break;
      
    case 'temperature':
      if (value < 35 || value > 42) {
        isValid = false;
        message = 'Temperatura fuera del rango normal (35-42°C)';
        severity = value < 36 || value > 39 ? 'error' : 'warning';
      }
      break;
  }
  
  return { isValid, message, severity };
};

// Form validation using rules
export const validateField = (value: any, rules: ValidationRule[], context?: any): ValidationResult => {
  for (const rule of rules) {
    let result: ValidationResult;
    
    switch (rule.type) {
      case 'required':
        result = validateRequired(value);
        break;
        
      case 'email':
        result = validateEmail(value);
        break;
        
      case 'phone':
        result = validatePhone(value);
        break;
        
      case 'curp':
        result = validateCURP(value);
        break;
        
      case 'rfc':
        result = validateRFC(value);
        break;
        
      case 'date':
        result = validateDate(value, rule.value);
        break;
        
      case 'minLength':
        result = validateLength(value, rule.value);
        break;
        
      case 'maxLength':
        result = validateLength(value, undefined, rule.value);
        break;
        
      case 'pattern':
        const pattern = new RegExp(rule.value);
        const isValid = !value || pattern.test(value);
        result = {
          isValid,
          message: isValid ? '' : rule.message,
          severity: 'error'
        };
        break;
        
      case 'custom':
        const customValid = !value || (rule.validator ? rule.validator(value) : true);
        result = {
          isValid: customValid,
          message: customValid ? '' : rule.message,
          severity: 'error'
        };
        break;
        
      default:
        result = { isValid: true, message: '', severity: 'info' };
    }
    
    if (!result.isValid) {
      return { ...result, message: rule.message || result.message };
    }
  }
  
  return { isValid: true, message: '', severity: 'info' };
};

// Validate entire form
export const validateForm = (formData: Record<string, any>, validationRules: Record<string, ValidationRule[]>): FieldValidation => {
  const results: FieldValidation = {};
  
  Object.entries(validationRules).forEach(([fieldName, rules]) => {
    const fieldValue = formData[fieldName];
    results[fieldName] = validateField(fieldValue, rules, formData);
  });
  
  return results;
};

// Pre-defined validation rule sets for common medical forms
export const MEDICAL_VALIDATION_RULES = {
  // Patient validation rules (NOM-004 compliant)
  patient: {
    first_name: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'minLength' as const, value: 2, message: getValidationMessage('min_length', { min: 2 }) },
      { type: 'maxLength' as const, value: 50, message: getValidationMessage('max_length', { max: 50 }) }
    ],
    paternal_surname: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'minLength' as const, value: 2, message: getValidationMessage('min_length', { min: 2 }) },
      { type: 'maxLength' as const, value: 50, message: getValidationMessage('max_length', { max: 50 }) }
    ],
    email: [
      { type: 'email' as const, message: getValidationMessage('email') }
    ],
    phone: [
      { type: 'phone' as const, message: getValidationMessage('phone') }
    ],
    date_of_birth: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'date' as const, value: { allowFuture: false }, message: getValidationMessage('future_date') }
    ],
    curp: [
      { type: 'curp' as const, message: getValidationMessage('curp') }
    ],
    gender: [
      { type: 'required' as const, message: getValidationMessage('required') }
    ]
  },
  
  // Doctor validation rules
  doctor: {
    first_name: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'minLength' as const, value: 2, message: getValidationMessage('min_length', { min: 2 }) }
    ],
    paternal_surname: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'minLength' as const, value: 2, message: getValidationMessage('min_length', { min: 2 }) }
    ],
    email: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'email' as const, message: getValidationMessage('email') }
    ],
    professional_license: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'pattern' as const, value: PATTERNS.professionalLicense.source, message: getValidationMessage('professional_license') }
    ]
  },
  
  // Consultation validation rules
  consultation: {
    patient_id: [
      { type: 'required' as const, message: 'Debe seleccionar un paciente' }
    ],
    consultation_date: [
      { type: 'required' as const, message: getValidationMessage('required') }
    ],
    reason: [
      { type: 'required' as const, message: getValidationMessage('required') },
      { type: 'minLength' as const, value: 5, message: getValidationMessage('min_length', { min: 5 }) }
    ]
  },
  
  // Appointment validation rules
  appointment: {
    patient_id: [
      { type: 'required' as const, message: 'Debe seleccionar un paciente' }
    ],
    appointment_date: [
      { type: 'required' as const, message: getValidationMessage('required') }
    ],
    appointment_time: [
      { type: 'required' as const, message: getValidationMessage('required') }
    ]
  }
};

// Utility to check if form has any validation errors
export const hasValidationErrors = (validationResults: FieldValidation): boolean => {
  return Object.values(validationResults).some(result => !result.isValid);
};

// Utility to get all error messages from validation results
export const getValidationErrors = (validationResults: FieldValidation): string[] => {
  return Object.values(validationResults)
    .filter(result => !result.isValid)
    .map(result => result.message);
};

// Export validation patterns for external use
export { PATTERNS as VALIDATION_PATTERNS };

// Re-export validation schemas for backward compatibility
export { validationSchemas };
