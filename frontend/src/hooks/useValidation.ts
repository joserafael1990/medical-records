
/**
 * Unified Validation Hook
 * React hook that provides centralized validation functionality
 */

import { useState, useCallback, useRef } from 'react';
import {
  ValidationResult,
  ValidationRule,
  FieldValidation,
  validateField,
  validateForm,
  hasValidationErrors,
  getValidationErrors,
  MEDICAL_VALIDATION_RULES
} from '../utils/validation';

interface UseValidationConfig {
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showSuccessMessages?: boolean;
}

interface UseValidationReturn {
  // State
  fieldValidations: FieldValidation;
  isValidating: Record<string, boolean>;
  hasErrors: boolean;
  errorMessages: string[];
  
  // Actions
  validateSingleField: (fieldName: string, value: any, rules: ValidationRule[], context?: any) => Promise<ValidationResult>;
  validateFormData: (formData: Record<string, any>, validationRules: Record<string, ValidationRule[]>) => FieldValidation;
  clearFieldValidation: (fieldName: string) => void;
  clearAllValidations: () => void;
  setFieldValidation: (fieldName: string, result: ValidationResult) => void;
  
  // Utilities
  getFieldError: (fieldName: string) => string;
  isFieldValid: (fieldName: string) => boolean;
  isFormValid: () => boolean;
}

export const useValidation = (config: UseValidationConfig = {}): UseValidationReturn => {
  const {
    debounceMs = 500,
    validateOnChange = true,
    validateOnBlur = true,
    showSuccessMessages = false
  } = config;

  const [fieldValidations, setFieldValidations] = useState<FieldValidation>({});
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({});
  const validationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clear existing timeout for a field
  const clearValidationTimeout = useCallback((fieldName: string) => {
    const existingTimeout = validationTimeouts.current.get(fieldName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      validationTimeouts.current.delete(fieldName);
    }
  }, []);

  // Validate a single field with debouncing
  const validateSingleField = useCallback(async (
    fieldName: string,
    value: any,
    rules: ValidationRule[],
    context?: any
  ): Promise<ValidationResult> => {
    // Clear existing timeout
    clearValidationTimeout(fieldName);

    // Set validating state
    setIsValidating(prev => ({ ...prev, [fieldName]: true }));

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        try {
          const result = validateField(value, rules, context);
          
          setFieldValidations(prev => ({
            ...prev,
            [fieldName]: result
          }));
          
          setIsValidating(prev => ({ ...prev, [fieldName]: false }));
          
          resolve(result);
        } catch (error) {
          const errorResult: ValidationResult = {
            isValid: false,
            message: 'Error de validación',
            severity: 'error'
          };
          
          setFieldValidations(prev => ({
            ...prev,
            [fieldName]: errorResult
          }));
          
          setIsValidating(prev => ({ ...prev, [fieldName]: false }));
          
          resolve(errorResult);
        }
        
        validationTimeouts.current.delete(fieldName);
      }, debounceMs);

      validationTimeouts.current.set(fieldName, timeoutId);
    });
  }, [debounceMs, clearValidationTimeout]);

  // Validate entire form immediately (no debouncing)
  const validateFormData = useCallback((
    formData: Record<string, any>,
    validationRules: Record<string, ValidationRule[]>
  ): FieldValidation => {
    const results = validateForm(formData, validationRules);
    setFieldValidations(results);
    return results;
  }, []);

  // Clear validation for a specific field
  const clearFieldValidation = useCallback((fieldName: string) => {
    clearValidationTimeout(fieldName);
    setFieldValidations(prev => {
      const newValidations = { ...prev };
      delete newValidations[fieldName];
      return newValidations;
    });
    setIsValidating(prev => ({
      ...prev,
      [fieldName]: false
    }));
  }, [clearValidationTimeout]);

  // Clear all validations
  const clearAllValidations = useCallback(() => {
    // Clear all timeouts
    validationTimeouts.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    validationTimeouts.current.clear();
    
    setFieldValidations({});
    setIsValidating({});
  }, []);

  // Manually set field validation result
  const setFieldValidation = useCallback((fieldName: string, result: ValidationResult) => {
    setFieldValidations(prev => ({
      ...prev,
      [fieldName]: result
    }));
  }, []);

  // Utility functions
  const getFieldError = useCallback((fieldName: string): string => {
    const validation = fieldValidations[fieldName];
    return validation && !validation.isValid ? validation.message : '';
  }, [fieldValidations]);

  const isFieldValid = useCallback((fieldName: string): boolean => {
    const validation = fieldValidations[fieldName];
    return !validation || validation.isValid;
  }, [fieldValidations]);

  const isFormValid = useCallback((): boolean => {
    return !hasValidationErrors(fieldValidations);
  }, [fieldValidations]);

  // Computed values
  const hasErrors = hasValidationErrors(fieldValidations);
  const errorMessages = getValidationErrors(fieldValidations);

  return {
    // State
    fieldValidations,
    isValidating,
    hasErrors,
    errorMessages,
    
    // Actions
    validateSingleField,
    validateFormData,
    clearFieldValidation,
    clearAllValidations,
    setFieldValidation,
    
    // Utilities
    getFieldError,
    isFieldValid,
    isFormValid
  };
};

// Pre-configured validation hooks for specific forms
export const usePatientValidation = (config?: UseValidationConfig) => {
  const validation = useValidation(config);
  
  const validatePatientForm = useCallback((formData: Record<string, any>) => {
    return validation.validateFormData(formData, MEDICAL_VALIDATION_RULES.patient);
  }, [validation]);

  return {
    ...validation,
    validatePatientForm,
    patientRules: MEDICAL_VALIDATION_RULES.patient
  };
};

export const useDoctorValidation = (config?: UseValidationConfig) => {
  const validation = useValidation(config);
  
  const validateDoctorForm = useCallback((formData: Record<string, any>) => {
    return validation.validateFormData(formData, MEDICAL_VALIDATION_RULES.doctor);
  }, [validation]);

  return {
    ...validation,
    validateDoctorForm,
    doctorRules: MEDICAL_VALIDATION_RULES.doctor
  };
};

export const useConsultationValidation = (config?: UseValidationConfig) => {
  const validation = useValidation(config);
  
  const validateConsultationForm = useCallback((formData: Record<string, any>) => {
    return validation.validateFormData(formData, MEDICAL_VALIDATION_RULES.consultation);
  }, [validation]);

  return {
    ...validation,
    validateConsultationForm,
    consultationRules: MEDICAL_VALIDATION_RULES.consultation
  };
};

export const useAppointmentValidation = (config?: UseValidationConfig) => {
  const validation = useValidation(config);
  
  const validateAppointmentForm = useCallback((formData: Record<string, any>) => {
    return validation.validateFormData(formData, MEDICAL_VALIDATION_RULES.appointment);
  }, [validation]);

  return {
    ...validation,
    validateAppointmentForm,
    appointmentRules: MEDICAL_VALIDATION_RULES.appointment
  };
};
