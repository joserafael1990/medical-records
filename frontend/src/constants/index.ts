// API Configuration
// In development, default to localhost backend if REACT_APP_API_URL is not set
// In production, default to production API
const getDefaultApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // In development, try local backend first
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  // In production, use production API
  return 'https://api.cortexclinico.com';
};

export const API_CONFIG = {
  BASE_URL: getDefaultApiUrl(),
  ENDPOINTS: {
    // Authentication
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH_TOKEN: '/api/auth/refresh',

    // Doctor Profile
    DOCTOR_PROFILE: '/api/doctors/me/profile',
    UPDATE_DOCTOR_PROFILE: '/api/doctors/me/profile',
    AVATAR_OPTIONS: '/api/avatars/options',
    AVATAR_UPLOAD: '/api/avatars/upload',
    AVATAR_SELECT: '/api/avatars/select',
    AVATAR_DELETE: '/api/avatars/custom',

    // Patients
    PATIENTS: '/api/patients',
    PATIENT_BY_ID: (id: number) => `/api/patients/${id}`,

    // Appointments
    APPOINTMENTS: '/api/appointments',
    APPOINTMENT_BY_ID: (id: number) => `/api/appointments/${id}`,
    DAILY_AGENDA: '/api/appointments/calendar',
    WEEKLY_AGENDA: '/api/appointments/calendar',
    CANCEL_APPOINTMENT: (id: number) => `/api/appointments/${id}/cancel`,

    // Consultations
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

    // Dashboard
    DASHBOARD: '/api/dashboard',
  }
};

// Date and Time Utilities
export const formatDateTimeForInput = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  // Parse the date string and format it without timezone conversion
  const date = new Date(dateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  'por_confirmar': 'Por confirmar',
  'confirmada': 'Confirmada',
  'cancelled': 'Cancelada',
  'canceled': 'Cancelada',
  'confirmed': 'Confirmada', // Legacy fallback
} as const;

// Priority Levels
// Urgency Levels
export const URGENCY_LEVELS = [
  { value: 'routine', label: 'Rutina', color: '#4caf50' },
  { value: 'urgent', label: 'Urgente', color: '#ff9800' },
  { value: 'stat', label: 'STAT', color: '#f44336' },
  { value: 'emergency', label: 'Emergencia', color: '#d32f2f' }
] as const;

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
export const DEFAULT_APPOINTMENT_STATUS = 'por_confirmar';

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
  PASSWORD_TOO_SHORT: `La contraseña debe tener al menos ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} caracteres.`,
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.'
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
  CONSULTATION_CREATED: 'Consulta creada exitosamente'
};

// Clinical Studies Constants
export const STUDY_STATUS_OPTIONS = [
  { value: 'ordered', label: 'Ordenado', color: '#ff9800' },
  { value: 'previous', label: 'Previo', color: '#9e9e9e' },
  { value: 'completed', label: 'Completado', color: '#4caf50' }
] as const;

export const STUDY_TYPES = [
  { value: 'hematologia', label: 'Hematología' },
  { value: 'bioquimica', label: 'Bioquímica' },
  { value: 'microbiologia', label: 'Microbiología' },
  { value: 'radiologia', label: 'Radiología' },
  { value: 'ecografia', label: 'Ecografía' },
  { value: 'tomografia', label: 'Tomografía' },
  { value: 'resonancia', label: 'Resonancia Magnética' },
  { value: 'endoscopia', label: 'Endoscopía' },
  { value: 'biopsia', label: 'Biopsia' },
  { value: 'otro', label: 'Otro' }
] as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true, // Analytics interno habilitado
  ENABLE_BETA_FEATURES: false,
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development'
};

// Environment
export const isProduction = process.env.NODE_ENV === 'production';

export default API_CONFIG;
