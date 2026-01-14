/**
 * Hook para validación en tiempo real con debounce
 * Mejora la UX al prevenir errores antes del submit
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  isChecking: boolean;
  suggestions?: string[];
}

export interface FieldValidation {
  [fieldName: string]: ValidationResult;
}

export interface ValidationConfig {
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showSuccessMessages?: boolean;
}

export interface MedicalValidationRules {
  // Validaciones específicas médicas
  curp?: {
    required?: boolean;
    format?: boolean;
    existenceCheck?: boolean;
  };
  rfc?: {
    required?: boolean;
    format?: boolean;
  };
  phone?: {
    required?: boolean;
    format?: 'mexico' | 'international';
    mobile?: boolean;
  };
  email?: {
    required?: boolean;
    format?: boolean;
    domain?: string[];
  };
  medicalLicense?: {
    required?: boolean;
    specialty?: string;
    state?: string;
  };
  vitalSigns?: {
    systolic?: { min: number; max: number };
    diastolic?: { min: number; max: number };
    heartRate?: { min: number; max: number };
    temperature?: { min: number; max: number };
    weight?: { min: number; max: number };
    height?: { min: number; max: number };
  };
  patientAge?: {
    min?: number;
    max?: number;
    context?: 'pediatric' | 'adult' | 'geriatric';
  };
  medicationDosage?: {
    medication?: string;
    patientWeight?: number;
    patientAge?: number;
  };
}

// Expresiones regulares para validaciones médicas
const VALIDATION_PATTERNS = {
  curp: /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/,
  rfc: /^[A-ZÑ&]{3,4}[0-9]{6}[A-V1-9][A-Z1-9][0-9]$/,
  mexicanPhone: /^(\+52\s?)?(\d{2,3}\s?)?\d{4}\s?\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  medicalLicense: /^[A-Z0-9]{8,12}$/
};

// Validaciones específicas médicas
const validateCURP = async (curp: string): Promise<ValidationResult> => {
  if (!curp) {
    return {
      isValid: false,
      message: 'CURP es requerida',
      severity: 'error',
      isChecking: false
    };
  }

  if (!VALIDATION_PATTERNS.curp.test(curp.toUpperCase())) {
    return {
      isValid: false,
      message: 'Formato de CURP inválido',
      severity: 'error',
      isChecking: false,
      suggestions: [
        'Debe tener 18 caracteres',
        'Formato: AAAA######HAAAAA##',
        'Ejemplo: GOMJ850101HDFMRN09'
      ]
    };
  }

  // Validación de fecha de nacimiento en CURP
  const year = parseInt(curp.substring(4, 6));
  const month = parseInt(curp.substring(6, 8));
  const day = parseInt(curp.substring(8, 10));
  
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = year <= currentYear ? 2000 + year : 1900 + year;
  
  const birthDate = new Date(fullYear, month - 1, day);
  if (birthDate.getMonth() !== month - 1) {
    return {
      isValid: false,
      message: 'Fecha de nacimiento inválida en CURP',
      severity: 'error',
      isChecking: false
    };
  }

  const age = new Date().getFullYear() - fullYear;
  if (age < 0 || age > 120) {
    return {
      isValid: false,
      message: 'Edad calculada de CURP es inválida',
      severity: 'warning',
      isChecking: false
    };
  }

  return {
    isValid: true,
    message: `CURP válida (Edad: ${age} años)`,
    severity: 'success',
    isChecking: false
  };
};

const validateRFC = async (rfc: string): Promise<ValidationResult> => {
  if (!rfc) {
    return {
      isValid: false,
      message: 'RFC es requerido',
      severity: 'error',
      isChecking: false
    };
  }

  if (!VALIDATION_PATTERNS.rfc.test(rfc.toUpperCase())) {
    return {
      isValid: false,
      message: 'Formato de RFC inválido',
      severity: 'error',
      isChecking: false,
      suggestions: [
        'Debe tener 12-13 caracteres',
        'Persona física: AAAA######AAA',
        'Persona moral: AAA######AAA'
      ]
    };
  }

  return {
    isValid: true,
    message: 'RFC válido',
    severity: 'success',
    isChecking: false
  };
};

const validateMexicanPhone = async (phone: string): Promise<ValidationResult> => {
  if (!phone) {
    return {
      isValid: false,
      message: 'Teléfono es requerido',
      severity: 'error',
      isChecking: false
    };
  }

  const cleanPhone = phone.replace(/\s/g, '');
  
  if (!VALIDATION_PATTERNS.mexicanPhone.test(phone)) {
    return {
      isValid: false,
      message: 'Formato de teléfono inválido',
      severity: 'error',
      isChecking: false,
      suggestions: [
        'Formato: +52 55 1234 5678',
        'O simplemente: 55 1234 5678',
        'Debe incluir código de área'
      ]
    };
  }

  // Validar que el número no sea obviamente falso
  const digits = cleanPhone.replace(/^\+52/, '').replace(/\D/g, '');
  if (digits.length < 10) {
    return {
      isValid: false,
      message: 'Número de teléfono incompleto',
      severity: 'error',
      isChecking: false
    };
  }

  return {
    isValid: true,
    message: 'Teléfono válido',
    severity: 'success',
    isChecking: false
  };
};

const validateVitalSigns = async (
  field: string, 
  value: number, 
  patientAge?: number
): Promise<ValidationResult> => {
  const vitalRanges = {
    systolic: { 
      normal: { min: 90, max: 140 },
      critical: { min: 60, max: 200 }
    },
    diastolic: { 
      normal: { min: 60, max: 90 },
      critical: { min: 40, max: 120 }
    },
    heartRate: { 
      normal: { min: 60, max: 100 },
      critical: { min: 40, max: 150 }
    },
    temperature: { 
      normal: { min: 36.0, max: 37.5 },
      critical: { min: 35.0, max: 42.0 }
    }
  };

  const ranges = vitalRanges[field as keyof typeof vitalRanges];
  if (!ranges) {
    return {
      isValid: true,
      message: '',
      severity: 'info',
      isChecking: false
    };
  }

  if (value < ranges.critical.min || value > ranges.critical.max) {
    return {
      isValid: false,
      message: `Valor crítico: ${value}. Verificar medición.`,
      severity: 'error',
      isChecking: false,
      suggestions: [
        'Revisar equipo de medición',
        'Confirmar con segunda medición',
        'Considerar condición médica especial'
      ]
    };
  }

  if (value < ranges.normal.min || value > ranges.normal.max) {
    return {
      isValid: true,
      message: `Valor fuera del rango normal (${ranges.normal.min}-${ranges.normal.max})`,
      severity: 'warning',
      isChecking: false,
      suggestions: [
        'Documenter en notas clínicas',
        'Considerar seguimiento'
      ]
    };
  }

  return {
    isValid: true,
    message: `Valor normal: ${value}`,
    severity: 'success',
    isChecking: false
  };
};

export const useRealTimeValidation = (
  rules: MedicalValidationRules,
  config: ValidationConfig = {}
) => {
  const {
    debounceMs = 500,
    validateOnChange: shouldValidateOnChange = true,
    validateOnBlur: shouldValidateOnBlur = true,
    showSuccessMessages = true
  } = config;

  const [fieldValidations, setFieldValidations] = useState<FieldValidation>({});
  const [isValidating, setIsValidating] = useState<Record<string, boolean>>({});
  const validationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const validateField = useCallback(async (
    fieldName: string, 
    value: any,
    context?: any
  ): Promise<ValidationResult> => {
    setIsValidating(prev => ({ ...prev, [fieldName]: true }));

    try {
      let result: ValidationResult;

      // Aplicar validaciones específicas según el campo
      switch (fieldName) {
        case 'curp':
          result = await validateCURP(value);
          break;
        case 'rfc':
          result = await validateRFC(value);
          break;
        case 'primary_phone':
        case 'emergency_contact_phone':
          result = await validateMexicanPhone(value);
          break;
        case 'systolic':
        case 'diastolic':
        case 'heartRate':
        case 'temperature':
          result = await validateVitalSigns(fieldName, parseFloat(value), context?.patientAge);
          break;
        default:
          result = {
            isValid: true,
            message: '',
            severity: 'info',
            isChecking: false
          };
      }

      setFieldValidations(prev => ({
        ...prev,
        [fieldName]: { ...result, isChecking: false }
      }));

      return result;

    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        message: 'Error en validación',
        severity: 'error',
        isChecking: false
      };

      setFieldValidations(prev => ({
        ...prev,
        [fieldName]: errorResult
      }));

      return errorResult;
    } finally {
      setIsValidating(prev => ({ ...prev, [fieldName]: false }));
    }
  }, []);

  const debouncedValidateField = useCallback((
    fieldName: string,
    value: any,
    context?: any
  ) => {
    // Clear existing timeout
    const existingTimeout = validationTimeouts.current.get(fieldName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set loading state immediately
    setFieldValidations(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isChecking: true
      }
    }));

    // Set new timeout
    const timeout = setTimeout(() => {
      validateField(fieldName, value, context);
      validationTimeouts.current.delete(fieldName);
    }, debounceMs);

    validationTimeouts.current.set(fieldName, timeout);
  }, [validateField, debounceMs]);

  const validateOnChangeHandler = useCallback((
    fieldName: string,
    value: any,
    context?: any
  ) => {
    if (shouldValidateOnChange) {
      debouncedValidateField(fieldName, value, context);
    }
  }, [debouncedValidateField, shouldValidateOnChange]);

  const validateOnBlurHandler = useCallback((
    fieldName: string,
    value: any,
    context?: any
  ) => {
    if (shouldValidateOnBlur) {
      validateField(fieldName, value, context);
    }
  }, [validateField, shouldValidateOnBlur]);

  const clearFieldValidation = useCallback((fieldName: string) => {
    setFieldValidations(prev => {
      const newValidations = { ...prev };
      delete newValidations[fieldName];
      return newValidations;
    });

    const timeout = validationTimeouts.current.get(fieldName);
    if (timeout) {
      clearTimeout(timeout);
      validationTimeouts.current.delete(fieldName);
    }
  }, []);

  const clearAllValidations = useCallback(() => {
    setFieldValidations({});
    validationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    validationTimeouts.current.clear();
  }, []);

  const getFieldValidation = useCallback((fieldName: string): ValidationResult | undefined => {
    return fieldValidations[fieldName];
  }, [fieldValidations]);

  const isFieldValid = useCallback((fieldName: string): boolean => {
    const validation = fieldValidations[fieldName];
    return validation ? validation.isValid : true;
  }, [fieldValidations]);

  const hasAnyErrors = useCallback((): boolean => {
    return Object.values(fieldValidations).some(validation => !validation.isValid);
  }, [fieldValidations]);

  const getErrorCount = useCallback((): number => {
    return Object.values(fieldValidations).filter(validation => !validation.isValid).length;
  }, [fieldValidations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      validationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      validationTimeouts.current.clear();
    };
  }, []);

  return {
    fieldValidations,
    isValidating,
    validateField,
    validateOnChange: validateOnChangeHandler,
    validateOnBlur: validateOnBlurHandler,
    clearFieldValidation,
    clearAllValidations,
    getFieldValidation,
    isFieldValid,
    hasAnyErrors,
    getErrorCount
  };
};

export default useRealTimeValidation;
