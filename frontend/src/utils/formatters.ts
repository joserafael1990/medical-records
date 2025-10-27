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
  const fullName = [
    patient.first_name,
    patient.paternal_surname,
    patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
  ].filter(part => part && part.trim()).join(' ');
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
  
  // If the date string already has timezone info, parse it directly
  if (dateString.includes('+') || dateString.includes('Z') || dateString.includes('-', 10)) {
    return new Date(dateString);
  }
  
  // Backend now sends dates like "2025-01-27T15:00:00" which are in CDMX timezone
  // Parse as naive datetime and treat as CDMX timezone
  const date = new Date(dateString);
  
  // Since the backend sends dates in CDMX timezone but without timezone info,
  // we need to adjust for the timezone difference
  // CDMX is UTC-6, so we need to add 6 hours to get the correct UTC time
  const adjustedDate = new Date(date.getTime() + (6 * 60 * 60 * 1000));
  
  return adjustedDate;
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
