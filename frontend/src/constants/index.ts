// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  ENDPOINTS: {
    // Authentication
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH_TOKEN: '/api/auth/refresh',
    
    // Doctor Profile
    DOCTOR_PROFILE: '/api/doctors/me/profile',
    UPDATE_DOCTOR_PROFILE: '/api/doctors/me/profile',
    
    // Patients
    PATIENTS: '/api/patients',
    PATIENT_BY_ID: (id: number) => `/api/patients/${id}`,
    
    // Appointments
    APPOINTMENTS: '/api/appointments',
    APPOINTMENT_BY_ID: (id: number) => `/api/appointments/${id}`,
    DAILY_AGENDA: '/api/appointments/calendar',
    WEEKLY_AGENDA: '/api/appointments/calendar',
    CANCEL_APPOINTMENT: (id: number) => `/api/appointments/${id}/cancel`,
    
    // Medical Records / Consultations
    MEDICAL_RECORDS: '/api/medical-records',
    MEDICAL_RECORD_BY_ID: (id: number) => `/api/medical-records/${id}`,
    CONSULTATIONS: '/api/consultations',
    
    // Clinical Studies
    CLINICAL_STUDIES: '/api/clinical-studies',
    CLINICAL_STUDY_BY_ID: (id: number) => `/api/clinical-studies/${id}`,
    
    // Catalogs
    SPECIALTIES: '/api/catalogs/specialties',
    STATES: '/api/catalogs/states',
    COUNTRIES: '/api/catalogs/countries',
    EMERGENCY_RELATIONSHIPS: '/api/catalogs/emergency-relationships',
    
    // Health Check
    HEALTH: '/api/health',
  }
};

// Date and Time Utilities
export const formatDateTimeForInput = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
};

export const getCurrentCDMXDateTime = (): string => {
  const now = new Date();
  // Convert to Mexico City timezone (UTC-6)
  const mexicoTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
  return mexicoTime.toISOString().slice(0, 16);
};

// Additional date formatting functions
export const formatAppointmentTime = (timeString: string): string => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const formatAppointmentTimeRange = (startTime: string, durationMinutes: number = 30): string => {
  if (!startTime) return '';
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  
  return `${formatTime(start)} - ${formatTime(end)}`;
};

// Appointment Status Labels
export const APPOINTMENT_STATUS_LABELS = {
  'confirmed': 'Confirmada',
  'cancelled': 'Cancelada',
  'canceled': 'Cancelada',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  'normal': 'Normal',
  'alta': 'Alta',
  'urgent': 'Urgente'
} as const;

// Urgency Levels
export const URGENCY_LEVELS = {
  'normal': 'Normal',
  'urgent': 'Urgente'
} as const;

// Gender Options
export const GENDER_OPTIONS = {
  'masculino': 'Masculino',
  'femenino': 'Femenino',
  'otro': 'Otro'
} as const;

// Medical Specialties
export const MEDICAL_SPECIALTIES = [
  'Medicina General',
  'Cardiología',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Ginecología',
  'Neurología',
  'Oftalmología',
  'Ortopedia',
  'Pediatría',
  'Psiquiatría',
  'Radiología',
  'Urología',
  'Neumología',
  'Oncología',
  'Reumatología'
] as const;

// Appointment Types
export const APPOINTMENT_TYPES = {
  'primera-vez': 'Primera Vez',
  'seguimiento': 'Seguimiento'
} as const;

// Default Values
export const DEFAULT_APPOINTMENT_DURATION = 30; // minutes
export const DEFAULT_APPOINTMENT_STATUS = 'confirmed';

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_NOTES_LENGTH: 1000
};

// UI Constants
export const DRAWER_WIDTH = 280;
export const MOBILE_BREAKPOINT = 768;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'dd/MM/yyyy HH:mm',
  TIME: 'HH:mm'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet.',
  UNAUTHORIZED: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
  FORBIDDEN: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  SERVER_ERROR: 'Error interno del servidor. Por favor, intenta más tarde.',
  VALIDATION_ERROR: 'Por favor, verifica los datos ingresados.',
  REQUIRED_FIELD: 'Este campo es obligatorio.',
  INVALID_EMAIL: 'Por favor, ingresa un correo electrónico válido.',
  INVALID_PHONE: 'Por favor, ingresa un número de teléfono válido.',
  PASSWORD_TOO_SHORT: `La contraseña debe tener al menos ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} caracteres.`
};

// Success Messages
export const SUCCESS_MESSAGES = {
  APPOINTMENT_CREATED: 'Cita creada exitosamente',
  APPOINTMENT_UPDATED: 'Cita actualizada exitosamente',
  APPOINTMENT_CANCELLED: 'Cita cancelada exitosamente',
  PATIENT_CREATED: 'Paciente creado exitosamente',
  PATIENT_UPDATED: 'Paciente actualizado exitosamente',
  PROFILE_UPDATED: 'Perfil actualizado exitosamente',
  STUDY_CREATED: 'Estudio creado exitosamente',
  RECORD_CREATED: 'Historia clínica creada exitosamente'
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: false,
  ENABLE_BETA_FEATURES: false,
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development'
};

// Environment
export const isProduction = process.env.NODE_ENV === 'production';

export default API_CONFIG;
