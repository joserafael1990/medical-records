import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  curp?: boolean;
  custom?: (value: T, formData?: any) => string | null;
  message?: string;
}

export interface FieldValidation {
  isValid: boolean;
  isValidating: boolean;
  error: string | null;
  warning: string | null;
  touched: boolean;
}

export interface ValidationSchema<T> {
  [K in keyof T]?: ValidationRule<T[K]>;
}

export interface UseRealTimeValidationOptions {
  debounceMs?: number;
  validateOnMount?: boolean;
  showErrorsOnlyAfterTouch?: boolean;
}

export interface UseRealTimeValidationReturn<T> {
  validation: Record<keyof T, FieldValidation>;
  isFormValid: boolean;
  isFormValidating: boolean;
  touchedFields: Record<keyof T, boolean>;
  validateField: (field: keyof T, value: T[keyof T], formData?: T) => Promise<void>;
  touchField: (field: keyof T) => void;
  validateForm: (formData: T) => Promise<boolean>;
  resetValidation: () => void;
  getFieldProps: (field: keyof T) => {
    error: boolean;
    helperText: string;
    color: 'primary' | 'success' | 'warning' | 'error';
  };
}

// Validation helpers
const validationHelpers = {
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phone: (value: string): boolean => {
    // Mexican phone number format
    const phoneRegex = /^(\+52\s?)?(\d{2,3}\s?)?\d{3}\s?\d{4}$/;
    return phoneRegex.test(value.replace(/[\s-]/g, ''));
  },

  curp: (value: string): boolean => {
    // CURP validation (basic format)
    const curpRegex = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]{1}$/;
    return curpRegex.test(value.toUpperCase());
  },

  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
};

export function useRealTimeValidation<T extends Record<string, any>>(
  schema: ValidationSchema<T>,
  options: UseRealTimeValidationOptions = {}
): UseRealTimeValidationReturn<T> {
  const {
    debounceMs = 300,
    validateOnMount = false,
    showErrorsOnlyAfterTouch = true
  } = options;

  // Initialize validation state
  const initialValidation = useMemo(() => {
    const initial: Record<keyof T, FieldValidation> = {} as any;
    for (const field in schema) {
      initial[field] = {
        isValid: true,
        isValidating: false,
        error: null,
        warning: null,
        touched: false
      };
    }
    return initial;
  }, [schema]);

  const [validation, setValidation] = useState<Record<keyof T, FieldValidation>>(initialValidation);
  const [touchedFields, setTouchedFields] = useState<Record<keyof T, boolean>>({} as any);

  // Debounced validation trigger
  const [validationTrigger, setValidationTrigger] = useState<{
    field: keyof T;
    value: T[keyof T];
    formData?: T;
  } | null>(null);

  const debouncedTrigger = useDebounce(validationTrigger, debounceMs);

  // Validate individual field
  const validateSingleField = useCallback(async (
    field: keyof T,
    value: T[keyof T],
    formData?: T
  ): Promise<string | null> => {
    const rule = schema[field];
    if (!rule) return null;

    // Required validation
    if (rule.required && !validationHelpers.required(value)) {
      return rule.message || `${String(field)} es requerido`;
    }

    // Skip other validations if field is empty and not required
    if (!validationHelpers.required(value) && !rule.required) {
      return null;
    }

    const stringValue = String(value);

    // Length validations
    if (rule.minLength && stringValue.length < rule.minLength) {
      return rule.message || `${String(field)} debe tener al menos ${rule.minLength} caracteres`;
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return rule.message || `${String(field)} no debe exceder ${rule.maxLength} caracteres`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return rule.message || `${String(field)} tiene un formato inválido`;
    }

    // Email validation
    if (rule.email && !validationHelpers.email(stringValue)) {
      return rule.message || 'Formato de email inválido';
    }

    // Phone validation
    if (rule.phone && !validationHelpers.phone(stringValue)) {
      return rule.message || 'Formato de teléfono inválido';
    }

    // CURP validation
    if (rule.curp && !validationHelpers.curp(stringValue)) {
      return rule.message || 'Formato de CURP inválido';
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value, formData);
    }

    return null;
  }, [schema]);

  // Validate field with debounce
  const validateField = useCallback(async (
    field: keyof T,
    value: T[keyof T],
    formData?: T
  ) => {
    // Set validating state immediately
    setValidation(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        isValidating: true
      }
    }));

    // Trigger debounced validation
    setValidationTrigger({ field, value, formData });
  }, []);

  // Touch field
  const touchField = useCallback((field: keyof T) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    setValidation(prev => ({
      ...prev,
      [field]: { ...prev[field], touched: true }
    }));
  }, []);

  // Effect to handle debounced validation
  useEffect(() => {
    if (!debouncedTrigger) return;

    const { field, value, formData } = debouncedTrigger;

    const performValidation = async () => {
      try {
        const error = await validateSingleField(field, value, formData);
        
        setValidation(prev => ({
          ...prev,
          [field]: {
            ...prev[field],
            isValid: !error,
            isValidating: false,
            error: error,
            warning: null // Could be extended for warnings
          }
        }));
      } catch (err) {
        setValidation(prev => ({
          ...prev,
          [field]: {
            ...prev[field],
            isValid: false,
            isValidating: false,
            error: 'Error de validación'
          }
        }));
      }
    };

    performValidation();
  }, [debouncedTrigger, validateSingleField]);

  // Validate entire form
  const validateForm = useCallback(async (formData: T): Promise<boolean> => {
    const validationPromises = Object.keys(schema).map(async (field) => {
      const error = await validateSingleField(field as keyof T, formData[field], formData);
      return { field: field as keyof T, error };
    });

    const results = await Promise.all(validationPromises);
    
    const newValidation = { ...validation };
    let isValid = true;

    results.forEach(({ field, error }) => {
      newValidation[field] = {
        ...newValidation[field],
        isValid: !error,
        error,
        touched: true,
        isValidating: false
      };
      if (error) isValid = false;
    });

    setValidation(newValidation);
    
    // Mark all fields as touched
    const allTouched = Object.keys(schema).reduce((acc, field) => {
      acc[field as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>);
    setTouchedFields(allTouched);

    return isValid;
  }, [schema, validateSingleField, validation]);

  // Reset validation
  const resetValidation = useCallback(() => {
    setValidation(initialValidation);
    setTouchedFields({} as Record<keyof T, boolean>);
  }, [initialValidation]);

  // Get field props for Material-UI components
  const getFieldProps = useCallback((field: keyof T) => {
    const fieldValidation = validation[field];
    const shouldShowError = showErrorsOnlyAfterTouch ? fieldValidation.touched : true;
    
    let color: 'primary' | 'success' | 'warning' | 'error' = 'primary';
    let helperText = '';

    if (fieldValidation.isValidating) {
      color = 'primary';
      helperText = 'Validando...';
    } else if (shouldShowError && fieldValidation.error) {
      color = 'error';
      helperText = fieldValidation.error;
    } else if (fieldValidation.warning) {
      color = 'warning';
      helperText = fieldValidation.warning;
    } else if (fieldValidation.touched && fieldValidation.isValid) {
      color = 'success';
      helperText = '✓ Válido';
    }

    return {
      error: shouldShowError && !!fieldValidation.error,
      helperText,
      color
    };
  }, [validation, showErrorsOnlyAfterTouch]);

  // Computed values
  const isFormValid = useMemo(() => {
    return Object.values(validation).every(field => field.isValid);
  }, [validation]);

  const isFormValidating = useMemo(() => {
    return Object.values(validation).some(field => field.isValidating);
  }, [validation]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      // This would require initial form data, so it's optional
    }
  }, [validateOnMount]);

  return {
    validation,
    isFormValid,
    isFormValidating,
    touchedFields,
    validateField,
    touchField,
    validateForm,
    resetValidation,
    getFieldProps
  };
}
