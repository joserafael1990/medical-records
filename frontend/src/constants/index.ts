// ============================================================================
// CONSTANTS - Configuración y constantes del sistema
// ============================================================================

// Import unified validation schemas
import validationSchemas from '../shared_validation_schemas.json';

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    HEALTH: '/api/health',
    PATIENTS: '/api/patients',
    CONSULTATIONS: '/api/consultations',
    APPOINTMENTS: '/api/appointments',
    DASHBOARD: '/api/dashboard/stats',
    AGENDA: {
      DAILY: '/api/agenda/daily',
      WEEKLY: '/api/agenda/weekly',
      AVAILABLE_SLOTS: '/api/agenda/available-slots'
    },
    DOCTOR_PROFILE: '/api/doctors/me/profile',
    CLINICAL_STUDIES: '/api/clinical-studies',
    SPECIALTIES: '/api/catalogs/specialties',
    EMERGENCY_RELATIONSHIPS: '/api/catalogs/emergency-relationships'
  },
  TIMEOUT: Number(process.env.REACT_APP_API_TIMEOUT) || 10000,
  RETRY_ATTEMPTS: Number(process.env.REACT_APP_API_RETRY_ATTEMPTS) || 3
} as const;

// Application Configuration
export const APP_CONFIG = {
  ENV: process.env.REACT_APP_ENV || 'development',
  VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  APP_NAME: process.env.REACT_APP_APP_NAME || 'AVANT - Sistema Médico',
  TIMEZONE: process.env.REACT_APP_DEFAULT_TIMEZONE || 'America/Mexico_City'
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_DEBUG_LOGS: true, // Temporarily enabled for debugging
  ENABLE_ERROR_MONITORING: process.env.REACT_APP_ENABLE_ERROR_MONITORING === 'true',
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  SHOW_BACKEND_STATUS: process.env.REACT_APP_SHOW_BACKEND_STATUS === 'true',
  ENABLE_DEV_TOOLS: process.env.REACT_APP_ENABLE_DEV_TOOLS === 'true'
} as const;

// Environment Helpers
export const isProduction = APP_CONFIG.ENV === 'production';
export const isDevelopment = APP_CONFIG.ENV === 'development';

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 500,
  SUCCESS_MESSAGE_DURATION: 5000,
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
  },
  DIALOG: {
    MAX_WIDTH: 'lg' as const,
    ANIMATION_DURATION: 300
  }
} as const;

// Form Validation (now using unified schemas)
export const VALIDATION_RULES = {
  PHONE: {
    MEXICO_REGEX: new RegExp(validationSchemas.patterns.phone_mexico),
    MIN_LENGTH: 10
  },
  CURP: {
    REGEX: new RegExp(validationSchemas.patterns.curp),
    LENGTH: 18
  },
  EMAIL: {
    REGEX: new RegExp(validationSchemas.patterns.email)
  },
  NAME: {
    MIN_LENGTH: validationSchemas.field_constraints.name?.min_length || 2,
    MAX_LENGTH: validationSchemas.field_constraints.name?.max_length || 50
  },
  REQUIRED_FIELDS: {
    PATIENT: validationSchemas.nom004_required_fields.patient,
    CONSULTATION: validationSchemas.nom004_required_fields.consultation
  }
} as const;

// Export validation utilities
export { validationSchemas };

// Export validation patterns
export const VALIDATION_PATTERNS = {
  CURP: new RegExp(validationSchemas.patterns.curp),
  EMAIL: new RegExp(validationSchemas.patterns.email),
  PHONE: new RegExp(validationSchemas.patterns.phone_mexico),
  PROFESSIONAL_LICENSE: new RegExp(validationSchemas.patterns.professional_license),
  POSTAL_CODE: new RegExp(validationSchemas.patterns.postal_code_mexico)
};

export const NOM004_REQUIRED_FIELDS = {
  PATIENT: validationSchemas.nom004_required_fields.patient,
  CONSULTATION: validationSchemas.nom004_required_fields.consultation
};

// Medical Constants
export const MEDICAL_CONSTANTS = {
  WORKING_HOURS: {
    START: 8,
    END: 18
  },
  APPOINTMENT_DURATION: {
    DEFAULT: 30,
    OPTIONS: [15, 30, 45, 60, 90, 120]
  },
  VITAL_SIGNS_RANGES: {
    SYSTOLIC_BP: { MIN: 90, MAX: 180 },
    DIASTOLIC_BP: { MIN: 60, MAX: 120 },
    HEART_RATE: { MIN: 60, MAX: 100 },
    TEMPERATURE: { MIN: 35, MAX: 42 },
    OXYGEN_SATURATION: { MIN: 90, MAX: 100 }
  }
} as const;

// Lista COMPLETA de especialidades y profesiones de salud reconocidas en México
export const MEDICAL_SPECIALTIES = [
  // Profesiones de Salud Básicas
  'Medicina General',
  'Medicina Familiar',
  'Medicina Interna',
  'Cirugía General',
  'Pediatría',
  'Ginecología y Obstetricia',
  'Cirujano Dentista',
  'Psicología',
  'Fisioterapia',
  'Terapia Física y Rehabilitación',
  'Terapia Ocupacional',
  'Terapia del Lenguaje',
  
  // Especialidades Médicas
  'Alergia e Inmunología',
  'Anestesiología',
  'Cardiología',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Geriatría',
  'Hematología',
  'Infectología',
  'Medicina de Urgencias',
  'Medicina del Trabajo',
  'Medicina Nuclear',
  'Nefrología',
  'Neumología',
  'Neurología',
  'Oncología Médica',
  'Psiquiatría',
  'Reumatología',
  
  // Especialidades Quirúrgicas
  'Angiología y Cirugía Vascular',
  'Cirugía Cardiotorácica',
  'Cirugía de Cabeza y Cuello',
  'Cirugía Maxilofacial',
  'Cirugía Oncológica',
  'Cirugía Pediátrica',
  'Cirugía Plástica y Reconstructiva',
  'Neurocirugía',
  'Ortopedia y Traumatología',
  'Urología',
  
  // Especialidades de Apoyo al Diagnóstico
  'Anatomía Patológica',
  'Imagenología Diagnóstica y Terapéutica',
  'Medicina de Rehabilitación',
  'Medicina Legal',
  'Patología Clínica',
  'Radiología e Imagen',
  'Radiología Intervencionista',
  
  // Especialidades de Órganos y Sistemas
  'Oftalmología',
  'Otorrinolaringología',
  'Proctología',
  
  // Pediatría Especializada
  'Cardiología Pediátrica',
  'Endocrinología Pediátrica',
  'Gastroenterología Pediátrica',
  'Hematología Pediátrica',
  'Infectología Pediátrica',
  'Nefrología Pediátrica',
  'Neonatología',
  'Neumología Pediátrica',
  'Neurología Pediátrica',
  'Oncología Pediátrica',
  'Reumatología Pediátrica',
  
  // Ginecología Especializada
  'Biología de la Reproducción Humana',
  'Ginecología Oncológica',
  'Medicina Materno Fetal',
  
  // Medicina Interna Especializada
  'Cardiología Intervencionista',
  'Electrofisiología Cardíaca',
  'Gastroenterología y Endoscopia',
  'Hemodinamia',
  'Medicina Crítica',
  'Neurología Vascular',
  
  // Especialidades Emergentes
  'Medicina del Deporte',
  'Medicina Estética',
  'Medicina Genómica',
  'Medicina Paliativa',
  'Toxicología',
  
  // Especialidades Administrativas
  'Administración de Servicios de Salud',
  'Calidad de la Atención Médica',
  'Epidemiología',
  'Salud Pública'
] as const;

// Feature Flags
export const FEATURES = {
  WHATSAPP_INTEGRATION: process.env.REACT_APP_WHATSAPP === 'true',
  ADVANCED_ANALYTICS: process.env.REACT_APP_ANALYTICS === 'true',
  OFFLINE_MODE: process.env.REACT_APP_OFFLINE === 'true',
  DARK_MODE: process.env.REACT_APP_DARK_MODE === 'true'
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Error de conexión. Verifica tu conexión a internet.',
  VALIDATION: 'Por favor, corrige los errores en el formulario.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  SERVER_ERROR: 'Error interno del servidor. Intenta más tarde.',
  TIMEOUT: 'La solicitud tardó demasiado tiempo. Intenta nuevamente.',
  GENERIC: 'Ha ocurrido un error inesperado.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  PATIENT_CREATED: 'Paciente creado exitosamente',
  PATIENT_UPDATED: 'Paciente actualizado exitosamente',
  PATIENT_DELETED: 'Paciente eliminado exitosamente',
  CONSULTATION_CREATED: 'Consulta creada exitosamente',
  CONSULTATION_UPDATED: 'Consulta actualizada exitosamente',
  APPOINTMENT_CREATED: 'Cita creada exitosamente',
  APPOINTMENT_UPDATED: 'Cita actualizada exitosamente',
  APPOINTMENT_CANCELLED: 'Cita cancelada exitosamente'
} as const;

// Mexican States (INEGI Codes)
export const MEXICAN_STATES = [
  { code: '01', name: 'Aguascalientes' },
  { code: '02', name: 'Baja California' },
  { code: '03', name: 'Baja California Sur' },
  { code: '04', name: 'Campeche' },
  { code: '05', name: 'Coahuila' },
  { code: '06', name: 'Colima' },
  { code: '07', name: 'Chiapas' },
  { code: '08', name: 'Chihuahua' },
  { code: '09', name: 'Ciudad de México' },
  { code: '10', name: 'Durango' },
  { code: '11', name: 'Guanajuato' },
  { code: '12', name: 'Guerrero' },
  { code: '13', name: 'Hidalgo' },
  { code: '14', name: 'Jalisco' },
  { code: '15', name: 'México' },
  { code: '16', name: 'Michoacán' },
  { code: '17', name: 'Morelos' },
  { code: '18', name: 'Nayarit' },
  { code: '19', name: 'Nuevo León' },
  { code: '20', name: 'Oaxaca' },
  { code: '21', name: 'Puebla' },
  { code: '22', name: 'Querétaro' },
  { code: '23', name: 'Quintana Roo' },
  { code: '24', name: 'San Luis Potosí' },
  { code: '25', name: 'Sinaloa' },
  { code: '26', name: 'Sonora' },
  { code: '27', name: 'Tabasco' },
  { code: '28', name: 'Tamaulipas' },
  { code: '29', name: 'Tlaxcala' },
  { code: '30', name: 'Veracruz' },
  { code: '31', name: 'Yucatán' },
  { code: '32', name: 'Zacatecas' }
] as const;

// Lista simple de nombres de estados para formularios
export const MEXICAN_STATE_NAMES = MEXICAN_STATES.map(state => state.name);

// ============================================================================
// CLINICAL STUDIES CONSTANTS - Estudios Clínicos
// ============================================================================

export const STUDY_TYPES = [
  { value: 'hematologia', label: 'Hematología' },
  { value: 'quimica_clinica', label: 'Química Clínica' },
  { value: 'microbiologia', label: 'Microbiología' },
  { value: 'radiologia_simple', label: 'Radiología Simple' },
  { value: 'tomografia', label: 'Tomografía' },
  { value: 'resonancia', label: 'Resonancia Magnética' },
  { value: 'cardiology', label: 'Estudios Cardiológicos' },
  { value: 'endoscopy', label: 'Estudios Endoscópicos' },
  { value: 'biopsy', label: 'Biopsias' },
  { value: 'cytology', label: 'Citologías' },
  { value: 'microbiology', label: 'Estudios Microbiológicos' },
  { value: 'genetics', label: 'Estudios Genéticos' },
  { value: 'other', label: 'Otros Estudios' }
] as const;

export const STUDY_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: '#ffa726' },
  { value: 'in_progress', label: 'En Proceso', color: '#42a5f5' },
  { value: 'completed', label: 'Completado', color: '#66bb6a' },
  { value: 'cancelled', label: 'Cancelado', color: '#ef5350' }
] as const;

export const URGENCY_LEVELS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'stat', label: 'STAT (Inmediato)' }
] as const;

export const COMMON_STUDY_NAMES = {
  laboratory: [
    'Biometría hemática completa',
    'Química sanguínea',
    'Perfil lipídico',
    'Pruebas de función hepática',
    'Pruebas de función renal',
    'Examen general de orina',
    'Hemoglobina glucosilada (HbA1c)',
    'Perfil tiroideo',
    'Marcadores tumorales',
    'Coagulación (TP/TPT)'
  ],
  radiology: [
    'Radiografía de tórax',
    'Radiografía de abdomen',
    'Tomografía computarizada (TAC)',
    'Resonancia magnética (RM)',
    'Ultrasonido abdominal',
    'Mamografía',
    'Densitometría ósea',
    'Angiografía',
    'PET Scan',
    'Radiografías de extremidades'
  ],
  cardiology: [
    'Electrocardiograma (ECG)',
    'Ecocardiograma',
    'Prueba de esfuerzo',
    'Holter de 24 horas',
    'Cateterismo cardíaco',
    'Angioplastia',
    'Monitor de presión arterial',
    'Ecocardiograma Doppler',
    'Ergometría',
    'Estudio electrofisiológico'
  ],
  endoscopy: [
    'Endoscopia digestiva alta',
    'Colonoscopia',
    'Rectosigmoidoscopia',
    'Broncoscopia',
    'Laparoscopia diagnóstica',
    'Histeroscopia',
    'Artroscopia',
    'Cistoscopia',
    'CPRE',
    'Endoscopia con biopsia'
  ]
} as const;

// ============================================================================
// MEDICAL ORDERS CONSTANTS - Órdenes Médicas
// ============================================================================

export const ORDER_TYPES = [
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'radiologia', label: 'Radiología' },
  { value: 'procedimiento', label: 'Procedimiento' },
  { value: 'interconsulta', label: 'Interconsulta' }
] as const;

export const ORDER_PRIORITIES = [
  { value: 'rutina', label: 'Rutina', color: '#42a5f5' },
  { value: 'preferente', label: 'Preferente', color: '#ffa726' },
  { value: 'urgente', label: 'Urgente', color: '#ef5350' }
] as const;

export const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: '#ffa726' },
  { value: 'printed', label: 'Impresa', color: '#66bb6a' },
  { value: 'cancelled', label: 'Cancelada', color: '#ef5350' }
] as const;

// Estudios comunes por tipo para órdenes médicas
export const COMMON_DIAGNOSTIC_ORDERS = {
  laboratory: [
    'Biometría hemática completa',
    'Química sanguínea de 6 elementos',
    'Química sanguínea de 27 elementos',
    'Perfil lipídico',
    'Pruebas de función hepática',
    'Pruebas de función renal',
    'Examen general de orina',
    'Urocultivo',
    'Hemoglobina glucosilada (HbA1c)',
    'Perfil tiroideo (TSH, T3, T4)',
    'Insulina basal',
    'Microalbuminuria',
    'Proteína C reactiva',
    'Velocidad de sedimentación globular',
    'Antígeno prostático específico (PSA)',
    'Marcadores tumorales',
    'Perfil TORCH',
    'Prueba de embarazo en sangre',
    'Coagulación (TP/TPT/INR)',
    'Dímero D',
    'Ferritina',
    'Vitamina D',
    'Vitamina B12',
    'Ácido fólico'
  ],
  radiology: [
    'Radiografía de tórax PA y lateral',
    'Radiografía de abdomen simple',
    'Ultrasonido abdominal completo',
    'Ultrasonido pélvico',
    'Ultrasonido obstétrico',
    'Tomografía computarizada de cráneo simple',
    'Tomografía computarizada de abdomen y pelvis',
    'Resonancia magnética de cráneo',
    'Resonancia magnética de columna lumbar',
    'Mamografía bilateral',
    'Densitometría ósea',
    'Radiografía de columna lumbar',
    'Radiografía de rodilla',
    'Ultrasonido Doppler venoso',
    'Ultrasonido de tiroides',
    'Angiografía por tomografía',
    'Urografía excretora'
  ],
  cardiology: [
    'Electrocardiograma de reposo',
    'Ecocardiograma transtorácico',
    'Prueba de esfuerzo',
    'Holter de ritmo de 24 horas',
    'Monitor ambulatorio de presión arterial',
    'Ecocardiograma Doppler',
    'Ergometría',
    'Ecocardiograma de estrés',
    'Angiografía coronaria',
    'Estudio electrofisiológico'
  ],
  endoscopy: [
    'Endoscopia digestiva alta',
    'Colonoscopia',
    'Rectosigmoidoscopia',
    'Panendoscopia',
    'Endoscopia con toma de biopsia',
    'Colonoscopia con polipectomía',
    'CPRE (Colangiopancreatografía)',
    'Gastroscopia'
  ],
  pathology: [
    'Biopsia de piel',
    'Biopsia de mama',
    'Biopsia endoscópica',
    'Citología cervical (Papanicolaou)',
    'Biopsia de próstata',
    'Estudio histopatológico',
    'Inmunohistoquímica',
    'Citología por aspiración'
  ],
  microbiology: [
    'Cultivo de orina',
    'Cultivo de exudado faríngeo',
    'Cultivo de herida',
    'Hemocultivo',
    'Coproparasitoscópico',
    'Coprocultivo',
    'Cultivo de expectoración',
    'Antibiograma'
  ],
  genetics: [
    'Cariotipo',
    'Estudio cromosómico',
    'Análisis molecular',
    'Secuenciación genética',
    'Hibridación in situ'
  ]
} as const;

// Instrucciones de preparación comunes
export const COMMON_PREPARATION_INSTRUCTIONS = {
  laboratory: [
    'Ayuno de 8 horas',
    'Ayuno de 12 horas',
    'Suspender medicamentos 24 horas antes',
    'No consumir alcohol 48 horas antes',
    'Tomar muestra en ayunas'
  ],
  radiology: [
    'Ayuno de 6 horas',
    'Vejiga llena (tomar 1 litro de agua 1 hora antes)',
    'No usar desodorante ni talco',
    'Retirar objetos metálicos',
    'Suspender medicamentos con metformina'
  ],
  endoscopy: [
    'Ayuno completo 12 horas antes',
    'Dieta líquida 24 horas antes',
    'Preparación intestinal',
    'Suspender anticoagulantes',
    'Acompañante obligatorio'
  ]
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: '#0B5394',
    SECONDARY: '#34A853',
    ERROR: '#EA4335',
    WARNING: '#FBBC04',
    SUCCESS: '#34A853'
  },
  BREAKPOINTS: {
    XS: 0,
    SM: 600,
    MD: 900,
    LG: 1200,
    XL: 1536
  },
  SPACING: {
    UNIT: 8
  }
} as const;
