// Utility for debugging appointment creation issues
import { AppointmentFormData } from '../types';

export interface AppointmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  debugInfo: Record<string, any>;
}

export const validateAppointmentData = (formData: AppointmentFormData): AppointmentValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const debugInfo: Record<string, any> = {};

  // Required field validations
  if (!formData.patient_id || formData.patient_id.trim() === '') {
    errors.push('Patient ID is required');
  }
  debugInfo.patient_id = formData.patient_id;

  if (!formData.doctor_id || formData.doctor_id.trim() === '') {
    errors.push('Doctor ID is required');
  }
  debugInfo.doctor_id = formData.doctor_id;

  if (!formData.date_time || formData.date_time.trim() === '') {
    errors.push('Date and time is required');
  } else {
    // Validate date format
    const dateTime = new Date(formData.date_time);
    if (isNaN(dateTime.getTime())) {
      errors.push('Invalid date/time format');
    } else if (dateTime < new Date()) {
      warnings.push('Appointment date is in the past');
    }
  }
  debugInfo.date_time = formData.date_time;
  debugInfo.parsed_date = formData.date_time ? new Date(formData.date_time).toISOString() : 'Invalid';

  if (!formData.appointment_type || formData.appointment_type.trim() === '') {
    errors.push('Appointment type is required');
  }
  debugInfo.appointment_type = formData.appointment_type;

  if (!formData.reason || formData.reason.trim() === '') {
    errors.push('Reason for appointment is required');
  }
  debugInfo.reason = formData.reason;

  // Duration validation
  if (formData.duration_minutes <= 0) {
    errors.push('Duration must be greater than 0');
  }
  debugInfo.duration_minutes = formData.duration_minutes;

  // Status validation
  const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!validStatuses.includes(formData.status)) {
    errors.push(`Invalid status: ${formData.status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  debugInfo.status = formData.status;

  // Priority validation (if provided)
  if (formData.priority) {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(formData.priority)) {
      warnings.push(`Invalid priority: ${formData.priority}. Should be one of: ${validPriorities.join(', ')}`);
    }
  }
  debugInfo.priority = formData.priority;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    debugInfo
  };
};

export const logAppointmentSubmission = (formData: AppointmentFormData) => {
  console.group('🔍 Appointment Creation Debug');
  console.log('📋 Form Data:', formData);
  
  const validation = validateAppointmentData(formData);
  console.log('✅ Validation Result:', validation);
  
  if (!validation.isValid) {
    console.error('❌ Validation Errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Validation Warnings:', validation.warnings);
  }
  
  // Check backend payload
  const backendPayload = {
    ...formData,
    appointment_date: formData.date_time,
    date_time: undefined
  };
  console.log('📤 Backend Payload:', backendPayload);
  
  console.groupEnd();
  
  return validation;
};

export const debugApiError = (error: any) => {
  console.group('❌ API Error Debug');
  console.error('Error object:', error);
  console.error('Response data:', error.response?.data);
  console.error('Response status:', error.response?.status);
  console.error('Response headers:', error.response?.headers);
  console.error('Request config:', error.config);
  console.groupEnd();
};
