// ============================================================================
// UTILITIES - Funciones de utilidad reutilizables
// ============================================================================

import { VALIDATION_RULES } from '../constants';
import type { Patient, FieldErrors, ValidationError } from '../types';

// ============================================================================
// DATE UTILITIES
// ============================================================================

export const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isToday = (dateString: string): boolean => {
  const today = new Date();
  const date = new Date(dateString);
  return date.toDateString() === today.toDateString();
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.EMAIL.REGEX.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_RULES.PHONE.MEXICO_REGEX.test(phone);
};

export const validateCURP = (curp: string): boolean => {
  return VALIDATION_RULES.CURP.REGEX.test(curp.toUpperCase());
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength;
};

// ============================================================================
// FORM UTILITIES
// ============================================================================

export const validatePatientForm = (formData: any): FieldErrors => {
  const errors: FieldErrors = {};

  // Required fields validation
  VALIDATION_RULES.REQUIRED_FIELDS.PATIENT.forEach(field => {
    if (!validateRequired(formData[field] || '')) {
      errors[field] = `${getFieldLabel(field)} es obligatorio`;
    }
  });

  // Phone validation
  if (formData.phone && !validatePhone(formData.phone)) {
    errors.phone = 'Formato de teléfono no válido para México';
  }

  // Email validation
  if (formData.email && !validateEmail(formData.email)) {
    errors.email = 'Formato de email no válido';
  }

  // CURP validation
  if (formData.curp && !validateCURP(formData.curp)) {
    errors.curp = 'Formato de CURP no válido';
  }

  // Name length validation
  ['first_name', 'paternal_surname', 'maternal_surname'].forEach(field => {
    const value = formData[field] || '';
    if (value && !validateMinLength(value, VALIDATION_RULES.NAME.MIN_LENGTH)) {
      errors[field] = `${getFieldLabel(field)} debe tener al menos ${VALIDATION_RULES.NAME.MIN_LENGTH} caracteres`;
    }
    if (value && !validateMaxLength(value, VALIDATION_RULES.NAME.MAX_LENGTH)) {
      errors[field] = `${getFieldLabel(field)} no puede exceder ${VALIDATION_RULES.NAME.MAX_LENGTH} caracteres`;
    }
  });

  return errors;
};

export const validateConsultationForm = (formData: any): FieldErrors => {
  const errors: FieldErrors = {};

  // Required fields validation
  VALIDATION_RULES.REQUIRED_FIELDS.CONSULTATION.forEach(field => {
    if (!validateRequired(formData[field] || '')) {
      errors[field] = `${getFieldLabel(field)} es obligatorio`;
    }
  });

  return errors;
};

const getFieldLabel = (field: string): string => {
  const labels: { [key: string]: string } = {
    first_name: 'Nombre',
    paternal_surname: 'Apellido paterno',
    maternal_surname: 'Apellido materno',
    birth_date: 'Fecha de nacimiento',
    gender: 'Género',
    address: 'Dirección',
    family_history: 'Antecedentes familiares',
    personal_pathological_history: 'Antecedentes patológicos',
    personal_non_pathological_history: 'Antecedentes no patológicos',
    patient_id: 'Paciente',
    chief_complaint: 'Motivo de consulta',
    history_present_illness: 'Historia de enfermedad actual',
    physical_examination: 'Exploración física',
    primary_diagnosis: 'Diagnóstico principal',
    treatment_plan: 'Plan de tratamiento',
    follow_up_instructions: 'Indicaciones de seguimiento'
    // doctor_name, doctor_professional_license: se obtienen automáticamente del perfil
  };
  return labels[field] || field;
};

// ============================================================================
// STRING UTILITIES
// ============================================================================

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str: string): string => {
  return str.split(' ').map(capitalizeFirst).join(' ');
};

export const formatPatientName = (patient: Patient): string => {
  return `${patient.first_name} ${patient.paternal_surname} ${patient.maternal_surname}`;
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

export const sortByDate = <T extends { date?: string; created_at?: string; date_time?: string }>(
  items: T[], 
  ascending = false
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at || a.date_time || '').getTime();
    const dateB = new Date(b.date || b.created_at || b.date_time || '').getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

export const filterBySearchTerm = <T>(
  items: T[], 
  searchTerm: string, 
  searchFields: (keyof T)[]
): T[] => {
  if (!searchTerm.trim()) return items;
  
  const term = searchTerm.toLowerCase();
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      return typeof value === 'string' && value.toLowerCase().includes(term);
    })
  );
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export const parseApiError = (error: any): string => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    
    if (typeof detail === 'string') {
      return detail;
    }
    
    if (Array.isArray(detail)) {
      return detail
        .map((err: ValidationError) => `${err.loc?.[1] || 'Campo'}: ${err.msg}`)
        .join(', ');
    }
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Ha ocurrido un error inesperado';
};

export const getErrorMessage = (error: any): string => {
  if (error.code === 'ERR_NETWORK') {
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
  
  if (error.response?.status === 404) {
    return 'El recurso solicitado no fue encontrado.';
  }
  
  if (error.response?.status === 401) {
    return 'No tienes permisos para realizar esta acción.';
  }
  
  if (error.response?.status >= 500) {
    return 'Error interno del servidor. Intenta más tarde.';
  }
  
  return parseApiError(error);
};

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ============================================================================
// LOCAL STORAGE UTILITIES
// ============================================================================

export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

export const measurePerformance = (name: string, fn: () => void): void => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};
