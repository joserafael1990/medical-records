
// ============================================================================
// UTILITIES - Funciones de utilidad reutilizables
// ============================================================================
//
// This file serves as the main barrel export for all utility functions.
// Individual utility modules are organized by category for better maintainability.
//
// ============================================================================

import { VALIDATION_RULES } from '../constants';
import type { Patient } from '../types';

// Re-export utilities from organized modules
export * from './dateHelpers';
export * from './validationHelpers';
export * from './formatters';
export * from './consultationHelpers';

// Legacy exports for backward compatibility

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
  return [
    patient.first_name,
    patient.paternal_surname,
    patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
  ].filter(part => part && part.trim()).join(' ');
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

// Normalize text by removing accents and converting to lowercase
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
    .trim();
};

export const filterBySearchTerm = <T>(
  items: T[], 
  searchTerm: string, 
  searchFields: (keyof T)[]
): T[] => {
  if (!searchTerm.trim()) return items;
  
  const normalizedTerm = normalizeText(searchTerm);
  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      return typeof value === 'string' && normalizeText(value).includes(normalizedTerm);
    })
  );
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================
// Re-export error handling utilities from errorHandler.ts (consolidated)
export { ErrorHandler, useErrorHandler, type ParsedError } from './errorHandler';
export { safeConsoleError } from './errorHandling'; // Keep safeConsoleError as it's widely used

// Simple wrapper for backwards compatibility
export const parseApiError = (error: any): string => {
  const parsed = ErrorHandler.parseApiError(error);
  return parsed.userFriendlyMessage || parsed.message;
};

export const getErrorMessage = (error: any): string => {
  // Simple error message extraction
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Ha ocurrido un error inesperado';
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
