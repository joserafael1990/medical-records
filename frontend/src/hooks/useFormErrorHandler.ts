/**
 * Form Error Handler Hook
 * Hook personalizado para manejo de errores en formularios médicos
 */

import { useState, useCallback } from 'react';
import { ErrorHandler, ParsedError, useErrorHandler } from '../utils/errorHandler';

interface FormErrorState {
  message: string;
  fieldErrors: Record<string, string>;
  hasErrors: boolean;
  isRetryable: boolean;
}

interface UseFormErrorHandlerReturn {
  errorState: FormErrorState;
  setError: (error: any, context?: Record<string, any>) => void;
  setFieldError: (field: string, message: string) => void;
  clearError: () => void;
  clearFieldError: (field: string) => void;
  clearAllFieldErrors: () => void;
  validateField: (field: string, value: any, rules?: ValidationRule[]) => boolean;
  validateForm: (formData: Record<string, any>, validationRules: Record<string, ValidationRule[]>) => boolean;
}

interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'curp' | 'date' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  message: string;
  value?: any;
  validator?: (value: any) => boolean;
}

// NOM-004 specific validation patterns
const VALIDATION_PATTERNS = {
  curp: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+52\s?)?(\d{10}|\d{3}\s?\d{3}\s?\d{4})$/,
  professionalLicense: /^\d{7,8}$/
};

// Medical field validation messages in Spanish
const VALIDATION_MESSAGES = {
  required: 'Este campo es obligatorio según NOM-004',
  email: 'Ingresa un correo electrónico válido',
  phone: 'Ingresa un número telefónico válido (10 dígitos)',
  curp: 'La CURP debe tener 18 caracteres y formato válido',
  date: 'Ingresa una fecha válida',
  minLength: 'Mínimo {value} caracteres requeridos',
  maxLength: 'Máximo {value} caracteres permitidos',
  professionalLicense: 'La cédula profesional debe tener 7-8 dígitos'
};

export const useFormErrorHandler = (): UseFormErrorHandlerReturn => {
  const { handleError } = useErrorHandler();
  
  const [errorState, setErrorState] = useState<FormErrorState>({
    message: '',
    fieldErrors: {},
    hasErrors: false,
    isRetryable: false
  });

  const setError = useCallback((error: any, context?: Record<string, any>) => {
    const parsedError = handleError(error, context);
    
    setErrorState({
      message: parsedError.userFriendlyMessage,
      fieldErrors: parsedError.fieldErrors || {},
      hasErrors: true,
      isRetryable: parsedError.isRetryable
    });
  }, [handleError]);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrorState(prev => ({
      ...prev,
      fieldErrors: {
        ...prev.fieldErrors,
        [field]: message
      },
      hasErrors: true
    }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      message: '',
      fieldErrors: {},
      hasErrors: false,
      isRetryable: false
    });
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrorState(prev => {
      const newFieldErrors = { ...prev.fieldErrors };
      delete newFieldErrors[field];
      
      return {
        ...prev,
        fieldErrors: newFieldErrors,
        hasErrors: Object.keys(newFieldErrors).length > 0 || !!prev.message
      };
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      fieldErrors: {},
      hasErrors: !!prev.message
    }));
  }, []);

  const validateField = useCallback((
    field: string, 
    value: any, 
    rules: ValidationRule[] = []
  ): boolean => {
    // Clear existing field error
    clearFieldError(field);

    for (const rule of rules) {
      let isValid = true;
      let errorMessage = rule.message;

      switch (rule.type) {
        case 'required':
          isValid = value !== null && value !== undefined && value !== '';
          break;

        case 'email':
          isValid = !value || VALIDATION_PATTERNS.email.test(value);
          break;

        case 'phone':
          isValid = !value || VALIDATION_PATTERNS.phone.test(value.replace(/\s/g, ''));
          break;

        case 'curp':
          isValid = !value || VALIDATION_PATTERNS.curp.test(value.toUpperCase());
          break;

        case 'date':
          isValid = !value || !isNaN(Date.parse(value));
          break;

        case 'minLength':
          isValid = !value || value.length >= (rule.value || 0);
          errorMessage = errorMessage.replace('{value}', rule.value?.toString() || '0');
          break;

        case 'maxLength':
          isValid = !value || value.length <= (rule.value || 0);
          errorMessage = errorMessage.replace('{value}', rule.value?.toString() || '0');
          break;

        case 'pattern':
          isValid = !value || (rule.value && new RegExp(rule.value).test(value));
          break;

        case 'custom':
          isValid = !value || (rule.validator ? rule.validator(value) : true);
          break;

        default:
          console.warn(`Unknown validation rule type: ${rule.type}`);
          break;
      }

      if (!isValid) {
        setFieldError(field, errorMessage);
        return false;
      }
    }

    return true;
  }, [setFieldError, clearFieldError]);

  const validateForm = useCallback((
    formData: Record<string, any>, 
    validationRules: Record<string, ValidationRule[]>
  ): boolean => {
    clearAllFieldErrors();
    let isFormValid = true;

    Object.entries(validationRules).forEach(([field, rules]) => {
      const fieldValue = formData[field];
      const isFieldValid = validateField(field, fieldValue, rules);
      
      if (!isFieldValid) {
        isFormValid = false;
      }
    });

    return isFormValid;
  }, [validateField, clearAllFieldErrors]);

  return {
    errorState,
    setError,
    setFieldError,
    clearError,
    clearFieldError,
    clearAllFieldErrors,
    validateField,
    validateForm
  };
};

// Pre-defined validation rules for common medical fields
export const MEDICAL_FIELD_VALIDATIONS = {
  // Patient fields
  firstName: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required },
    { type: 'minLength' as const, value: 2, message: VALIDATION_MESSAGES.minLength },
    { type: 'maxLength' as const, value: 50, message: VALIDATION_MESSAGES.maxLength }
  ],
  
  paternalSurname: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required },
    { type: 'minLength' as const, value: 2, message: VALIDATION_MESSAGES.minLength },
    { type: 'maxLength' as const, value: 50, message: VALIDATION_MESSAGES.maxLength }
  ],
  
  maternalSurname: [
    { type: 'minLength' as const, value: 2, message: VALIDATION_MESSAGES.minLength },
    { type: 'maxLength' as const, value: 50, message: VALIDATION_MESSAGES.maxLength }
  ],
  
  birthDate: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required },
    { type: 'date' as const, message: VALIDATION_MESSAGES.date }
  ],
  
  gender: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required }
  ],
  
  address: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required },
    { type: 'minLength' as const, value: 10, message: VALIDATION_MESSAGES.minLength }
  ],
  
  phone: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required },
    { type: 'phone' as const, message: VALIDATION_MESSAGES.phone }
  ],
  
  email: [
    { type: 'email' as const, message: VALIDATION_MESSAGES.email }
  ],
  
  curp: [
    { type: 'curp' as const, message: VALIDATION_MESSAGES.curp }
  ],

  // Doctor fields
  professionalLicense: [
    { type: 'required' as const, message: VALIDATION_MESSAGES.required },
    { type: 'pattern' as const, value: VALIDATION_PATTERNS.professionalLicense, message: VALIDATION_MESSAGES.professionalLicense }
  ],

  // Medical consultation fields
  chiefComplaint: [
    { type: 'required' as const, message: 'El motivo de consulta es obligatorio según NOM-004' },
    { type: 'minLength' as const, value: 5, message: 'Describe brevemente el motivo de la consulta' }
  ],
  
  physicalExamination: [
    { type: 'required' as const, message: 'La exploración física es obligatoria según NOM-004' },
    { type: 'minLength' as const, value: 10, message: 'Describe los hallazgos de la exploración física' }
  ],
  
  primaryDiagnosis: [
    { type: 'required' as const, message: 'El diagnóstico principal es obligatorio según NOM-004' },
    { type: 'minLength' as const, value: 5, message: 'Especifica el diagnóstico principal' }
  ],
  
  treatmentPlan: [
    { type: 'required' as const, message: 'El plan de tratamiento es obligatorio según NOM-004' },
    { type: 'minLength' as const, value: 10, message: 'Describe el plan de tratamiento' }
  ]
};

export default useFormErrorHandler;
