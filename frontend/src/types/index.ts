// ============================================================================
// TYPES - Definiciones TypeScript mejoradas
// ============================================================================

export interface Patient {
  id: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  full_name: string;
  birth_date: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  address: string;
  curp?: string;
  insurance_type?: string;
  insurance_number?: string;
  blood_type?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_at: string;
  last_visit?: string;
  total_visits: number;
  status: 'active' | 'inactive';
  // Additional fields for compatibility
  birth_state_code?: string;
  nationality?: string;
  municipality?: string;
  state?: string;
  internal_id?: string;
  neighborhood?: string;
  postal_code?: string;
  civil_status?: string;
  education_level?: string;
  occupation?: string;
  religion?: string;
  emergency_contact_address?: string;
  previous_hospitalizations?: string;
  surgical_history?: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  patient_name?: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  
  // Antecedentes (parte de la evaluación clínica)
  family_history?: string; // Antecedentes heredofamiliares
  personal_pathological_history?: string; // Antecedentes patológicos personales
  personal_non_pathological_history?: string; // Antecedentes no patológicos personales
  
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnoses?: string;
  treatment_plan: string;
  therapeutic_plan?: string;
  follow_up_instructions: string;
  prognosis?: string;
  laboratory_results?: string;
  imaging_studies?: string;
  interconsultations?: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  vital_signs_id?: string;
  prescription_ids?: string[];
  
  // Clinical studies associated with this consultation
  clinical_studies?: ClinicalStudy[];
}

export interface ConsultationResponse extends Consultation {
  patient_name: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  date_time: string; // For UI compatibility - maps to appointment_date in backend
  appointment_date?: string; // Backend field name
  end_time?: string;
  appointment_type: AppointmentType;
  reason: string;
  notes?: string;
  duration_minutes: number;
  status: AppointmentStatus;
  priority?: string;
  preparation_instructions?: string;
  confirmation_required?: boolean;
  confirmed_at?: string;
  reminder_sent?: boolean;
  estimated_cost?: string;
  insurance_covered?: boolean;
  room_number?: string;
  equipment_needed?: string;
  created_at: string;
  updated_at?: string;
  cancelled_reason?: string;
  cancelled_at?: string;
}

export interface DashboardData {
  physician: string;
  today_appointments: number;
  pending_records: number;
  whatsapp_messages: number;
  compliance_score: number;
  monthly_revenue: number;
  ai_time_saved: number;
  features_ready: string[];
}

export interface CompletePatientData {
  patient: Patient;
  medical_history: Consultation[];
  vital_signs: VitalSigns[];
  prescriptions: Prescription[];
  appointments: Appointment[];
  active_prescriptions: Prescription[];
  upcoming_appointments: Appointment[];
}

export interface VitalSigns {
  id: string;
  patient_id: string;
  date_recorded: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribed_date: string;
  status: PrescriptionStatus;
  doctor_name: string;
  doctor_license: string;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum ViewType {
  DASHBOARD = 'dashboard',
  CLINICAL_NOTE = 'clinical-note',
  PATIENTS = 'patients',
  PATIENT_DETAIL = 'patient-detail',
  CONSULTATIONS = 'consultations',
  AGENDA = 'agenda',
  WHATSAPP = 'whatsapp',
  ANALYTICS = 'analytics'
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum AppointmentType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  ROUTINE_CHECK = 'routine_check'
}

export enum PrescriptionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

export enum BackendStatus {
  LOADING = 'loading',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

export enum AgendaView {
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface PatientFormData {
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  birth_date: string;
  gender: string;
  address: string;
  birth_state_code: string;
  nationality: string;
  curp: string;
  internal_id: string;
  phone: string;
  email: string;
  neighborhood: string;
  municipality: string;
  state: string;
  postal_code: string;
  civil_status: string;
  education_level: string;
  occupation: string;
  religion: string;
  insurance_type: string;
  insurance_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  emergency_contact_address: string;
  allergies: string;
  chronic_conditions: string;
  current_medications: string;
  blood_type: string;
  previous_hospitalizations: string;
  surgical_history: string;
  status: 'active' | 'inactive'; // Patient status - active by default
}

export interface ConsultationFormData {
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  
  // Antecedentes (parte de la evaluación clínica)
  family_history: string; // Antecedentes heredofamiliares
  personal_pathological_history: string; // Antecedentes patológicos personales
  personal_non_pathological_history: string; // Antecedentes no patológicos personales
  
  physical_examination: string;
  primary_diagnosis: string; // OBLIGATORIO NOM-004
  secondary_diagnoses: string;
  treatment_plan: string;
  therapeutic_plan: string;
  follow_up_instructions: string;
  prognosis: string;
  laboratory_results: string;
  imaging_studies: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
}

export interface AppointmentFormData {
  patient_id: string;
  doctor_id?: string; // Add doctor_id field
  date_time: string; // UI field - will be mapped to appointment_date
  appointment_type: string;
  reason: string;
  notes: string;
  duration_minutes: number;
  status: string;
  priority?: string;
  preparation_instructions?: string;
  confirmation_required?: boolean;
  estimated_cost?: string;
  insurance_covered?: boolean;
  room_number?: string;
  equipment_needed?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  detail: string | ValidationError[];
  status: number;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface FieldErrors {
  [key: string]: string;
}

export interface UIState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

export interface DialogState {
  isOpen: boolean;
  isEditing: boolean;
  selectedItem: any | null;
}

// ============================================================================
// DOCTOR PROFILE INTERFACES (NOM-004 Compliant)
// ============================================================================

export interface DoctorProfile {
  id?: string;
  full_name?: string; // Nombre completo generado por el backend
  // Información Personal
  title: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  phone: string;
  birth_date: string;
  
  // Información Profesional (NOM-004)
  professional_license: string; // Cédula profesional
  specialty_license?: string; // Cédula de especialidad
  university: string; // Universidad de egreso
  graduation_year: string;
  specialty: string;
  subspecialty?: string;
  
  // Contacto Profesional
  professional_email?: string;
  office_phone?: string;
  mobile_phone?: string;
  
  // Dirección del Consultorio
  office_address: string;
  office_city: string;
  office_state: string;
  office_postal_code: string;
  office_country: string;
  
  // Información Adicional NOM-004
  // medical_school, internship_hospital, residency_hospital removed per user request
  
  // Certificaciones y Membresías removed per user request
  // board_certifications?: string[]; // Certificaciones del consejo
  // professional_memberships?: string[]; // Membresías profesionales
  
  // Firma Digital y Sello
  digital_signature?: string;
  professional_seal?: string;
  
  // Configuración
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
}

export interface DoctorFormData {
  // Información Personal
  title: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  phone: string;
  birth_date: string;
  
  // Información Profesional
  professional_license: string;
  specialty_license: string;
  university: string;
  graduation_year: string;
  specialty: string;
  subspecialty: string;
  
  // Contacto Profesional
  professional_email: string;
  office_phone: string;
  mobile_phone: string;
  
  // Dirección del Consultorio
  office_address: string;
  office_city: string;
  office_state: string;
  office_postal_code: string;
  office_country: string;
  
  // Información Adicional
  // medical_school, internship_hospital, residency_hospital removed per user request
  
  // Certificaciones removed per user request
  // board_certifications: string;
  // professional_memberships: string;
}

// ============================================================================
// CLINICAL STUDIES TYPES - Estudios Clínicos  
// ============================================================================

export type StudyType = 
  | 'hematologia'       // Hematología
  | 'quimica_clinica'   // Química Clínica
  | 'microbiologia'     // Microbiología
  | 'radiologia_simple' // Radiología Simple
  | 'tomografia'        // Tomografía
  | 'resonancia'        // Resonancia Magnética
  | 'cardiology'        // Estudios cardiológicos
  | 'endoscopy'         // Estudios endoscópicos
  | 'biopsy'            // Biopsias
  | 'cytology'          // Citologías
  | 'microbiology'      // Estudios microbiológicos
  | 'genetics'          // Estudios genéticos
  | 'other';            // Otros estudios

export type StudyStatus = 
  | 'pending'           // Pendiente
  | 'in_progress'       // En proceso
  | 'completed'         // Completado
  | 'cancelled';        // Cancelado

export interface ClinicalStudy {
  id: string;
  consultation_id: string;          // ID de la consulta asociada
  patient_id: string;               // ID del paciente
  study_type: StudyType;            // Tipo de estudio
  study_name: string;               // Nombre del estudio
  study_description?: string;       // Descripción detallada
  ordered_date: string;             // Fecha de solicitud (ISO string)
  performed_date?: string;          // Fecha de realización (ISO string)
  results_date?: string;            // Fecha de resultados (ISO string)
  status: StudyStatus;

  // Results and files
  results_text?: string;            // Resultados en texto
  interpretation?: string;          // Interpretación médica
  file_path?: string;               // Ruta del archivo
  file_name?: string;               // Nombre original del archivo
  file_type?: string;               // Tipo MIME del archivo
  file_size?: number;               // Tamaño del archivo en bytes

  // Medical information
  ordering_doctor: string;          // Médico que solicita el estudio
  performing_doctor?: string;       // Médico que realiza el estudio
  institution?: string;             // Institución donde se realiza
  urgency?: string;                 // Urgencia (Normal, Urgente, STAT)

  // Clinical context
  clinical_indication?: string;     // Indicación clínica
  relevant_history?: string;        // Historia clínica relevante

  // Audit trail
  created_at: string;               // Fecha de creación (ISO string)
  updated_at?: string;              // Fecha de actualización (ISO string)
  created_by: string;               // Usuario que crea el registro
  updated_by?: string;              // Usuario que actualiza

  // Response fields (from backend)
  patient_name?: string;            // Nombre del paciente
  consultation_date?: string;       // Fecha de la consulta (ISO string)
}

export interface ClinicalStudyFormData {
  consultation_id: string;
  patient_id: string;
  study_type: StudyType;
  study_name: string;
  study_description: string;
  ordered_date: string;
  performed_date?: string;     // Date when study was performed
  results_date?: string;       // Date when results were obtained
  status: StudyStatus;
  results_text: string;
  interpretation: string;
  ordering_doctor: string;
  performing_doctor: string;
  institution: string;
  urgency: string;
  clinical_indication: string;
  relevant_history: string;
  created_by: string;
}

// ============================================================================
// MEDICAL ORDERS TYPES - Órdenes Médicas
// ============================================================================

export type OrderType = 
  | 'laboratorio'         // Laboratorio
  | 'radiologia'          // Radiología
  | 'procedimiento'       // Procedimiento
  | 'interconsulta';      // Interconsulta

export type OrderPriority = 
  | 'rutina'              // Rutina
  | 'preferente'          // Preferente
  | 'urgente';            // Urgente

export type OrderStatus = 
  | 'pendiente'           // Pendiente
  | 'en_proceso'          // En proceso
  | 'completada'          // Completada
  | 'cancelada';          // Cancelada

export interface MedicalOrder {
  id: string;
  consultation_id: string;          // ID de la consulta asociada
  patient_id: string;               // ID del paciente
  
  // Order information
  order_type: OrderType;            // Tipo de orden
  study_type: StudyType;            // Tipo de estudio
  study_name: string;               // Nombre del estudio
  study_description?: string;       // Descripción detallada
  
  // Clinical information (NOM-004 required)
  clinical_indication: string;      // Indicación clínica (obligatorio)
  provisional_diagnosis?: string;   // Diagnóstico provisional
  diagnosis_cie10?: string;         // Código CIE-10
  relevant_clinical_data?: string;  // Datos clínicos relevantes
  
  // Doctor information (auto-filled from session)
  ordering_doctor_name?: string;    // Médico que solicita
  ordering_doctor_license?: string; // Cédula profesional
  ordering_doctor_specialty?: string; // Especialidad
  
  // Order details
  priority: OrderPriority;          // Prioridad
  requires_preparation: boolean;    // Requiere preparación
  preparation_instructions?: string; // Instrucciones de preparación
  
  // Additional information
  estimated_cost?: string;          // Costo estimado
  special_instructions?: string;    // Instrucciones especiales
  valid_until_date?: string;        // Vigencia de la orden (ISO string)
  
  // Status and dates
  order_date: string;               // Fecha de la orden (ISO string)
  status: OrderStatus;              // Estado de la orden
  
  // Response fields (from backend)
  patient_name?: string;            // Nombre del paciente
  created_at: string;               // Fecha de creación (ISO string)
  updated_at?: string;              // Fecha de actualización (ISO string)
  created_by?: string;              // Usuario que crea
}

export interface MedicalOrderFormData {
  consultation_id: string;
  patient_id: string;
  order_type: OrderType;
  study_type: StudyType;
  study_name: string;
  study_description?: string;
  clinical_indication: string;
  provisional_diagnosis?: string;
  diagnosis_cie10?: string;
  relevant_clinical_data?: string;
  priority: OrderPriority;
  requires_preparation: boolean;
  preparation_instructions?: string;
  estimated_cost?: string;
  special_instructions?: string;
  valid_until_date?: string;
}
