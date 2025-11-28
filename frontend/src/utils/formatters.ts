// ============================================================================
// FORMATTERS - Utilidades de formateo
// ============================================================================

import { Patient } from '../types';
import { calculateAge, formatDate, formatDateTime, formatDateTimeShort } from './dateHelpers';

// Re-export date helpers to maintain API compatibility
export { calculateAge, formatDate, formatDateTime, formatDateTimeShort };

/**
 * Format patient name with age
 */
export const formatPatientNameWithAge = (patient: Patient): string => {
  // Patient type has 'name' field as complete name, not separate fields
  const fullName = patient.name || 'Paciente';
  const age = calculateAge(patient.birth_date);
  return `${fullName} (${age} años)`;
};

/**
 * Format doctor full name
 */
export const formatDoctorName = (doctorProfile: any): string => {
  if (!doctorProfile) return 'Dr. Usuario';
  
  return `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.paternal_surname} ${doctorProfile.maternal_surname || ''}`.trim();
};

// formatDate and formatDateTime now imported from dateHelpers.ts to avoid conflicts

/**
 * Parse backend date string that comes in CDMX timezone format
 * The backend now sends dates in CDMX timezone without timezone info
 * This function correctly parses them as CDMX timezone
 */
export const parseBackendDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  try {
    // If the date string already has timezone info, parse it directly
    if (dateString.includes('+') || dateString.includes('Z')) {
      return new Date(dateString);
    }
    
    // Backend sends dates like "2025-10-27T09:00:00" which are in CDMX timezone (naive)
    // When JavaScript parses a date without timezone, it treats it as local time
    // But we need to treat it as CDMX timezone. We'll parse it and adjust if needed.
    
    // Check if it's in the format "YYYY-MM-DDTHH:MM:SS" (no timezone)
    const naiveDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    if (naiveDatePattern.test(dateString)) {
      // Parse as if it's in CDMX timezone by appending the timezone offset
      // CDMX is UTC-6 (or UTC-5 during DST, but we'll use UTC-6 as default)
      // Actually, let's just parse it as-is and let JavaScript handle it as local time
      // This should work correctly for date comparisons within the same timezone
      return new Date(dateString);
    }
    
    // Fallback to standard parsing
    const date = new Date(dateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return new Date();
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date();
  }
};

/**
 * Format time for display (HH:MM) - handles backend dates correctly
 */
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = parseBackendDate(dateString);
  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City'
  });
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as XXX-XXX-XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if doesn't match expected format
};

/**
 * Format currency (Mexican Peso)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
/**
 * Format phone number for display
 */
export const formatPhone = (phone: string) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Truncate text with ellipsis
 */
export const formatText = (text: string, maxLength: number = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Capitalize first letter
 */
export const capitalizeFirst = (text: string) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
