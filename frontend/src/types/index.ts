// ============================================================================
// TYPES - Definiciones TypeScript mejoradas
// ============================================================================

// Base fields shared between Patient and PatientFormData
interface PatientBaseFields {
  first_name: string;
  paternal_surname: string;
  maternal_surname?: string;
  birth_date: string;
  gender: string;
  email?: string;
  primary_phone?: string;
  address: string;
  curp?: string;
  rfc?: string;
  internal_id?: string;
  neighborhood?: string;
  municipality?: string;
  state?: string;
  postal_code?: string;
  birth_state_code?: string;
  nationality?: string;
  civil_status?: string;
  education_level?: string;
  occupation?: string;
  religion?: string;
  insurance_type?: string;
  insurance_provider?: string;
  insurance_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  blood_type?: string;
  previous_hospitalizations?: string;
  surgical_history?: string;
  
  // Address fields
  address_street?: string;
  address_ext_number?: string;
  address_int_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state_id?: string | null;
  address_postal_code?: string;
  nationality_id?: number;
  birth_place?: string;
  birth_state_id?: number | null;
  foreign_birth_place?: string;
}

export interface Patient extends PatientBaseFields {
  // Unique Patient fields (not in forms)
  id: string;
  full_name: string;
  age: number;
  created_at: string;
  last_visit?: string;
  total_visits: number;
  is_active: boolean;
  
  // Additional fields for compatibility with App.tsx
  date_of_birth?: string;
  phone?: string;
  city?: string;
  zip_code?: string;
  country?: string;
  medical_history?: string;
  insurance_policy_number?: string;
  active?: boolean;
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

export interface MedicalRecord {
  id: number;
  record_code?: string;
  patient_id: number;
  doctor_id: number;
  consultation_date: string;
  
  // NOM-004 required fields
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  prognosis: string;
  
  // Optional fields
  secondary_diagnoses?: string;
  differential_diagnosis?: string;
  prescribed_medications?: string;
  laboratory_results?: string;
  imaging_results?: string;
  notes?: string;
  
  // System fields
  created_at: string;
  updated_at: string;
  created_by?: number;
  
  // Relationships
  patient?: Patient;
  doctor?: {
    id: number;
    first_name: string;
    paternal_surname: string;
    maternal_surname?: string;
    professional_license?: string;
    specialty?: string;
  };
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
  // Backend response includes nested patient object
  patient?: {
    id: number;
    first_name: string;
    paternal_surname: string;
    maternal_surname?: string;
    email?: string;
    primary_phone?: string;
    [key: string]: any;
  };
  doctor?: {
    id: number;
    first_name: string;
    paternal_surname: string;
    maternal_surname?: string;
    email?: string;
    [key: string]: any;
  };
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
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// ============================================================================
// FORM TYPES
// ============================================================================

// Interface for API calls - uses backend expected types
export interface PatientApiData extends Required<Omit<PatientBaseFields, 'email' | 'curp' | 'rfc' | 'internal_id' | 'primary_phone' | 'birth_state_code' | 'nationality' | 'civil_status' | 'education_level' | 'occupation' | 'religion' | 'insurance_type' | 'insurance_provider' | 'insurance_number' | 'emergency_contact_name' | 'emergency_contact_phone' | 'emergency_contact_relationship' | 'allergies' | 'chronic_conditions' | 'current_medications' | 'blood_type' | 'previous_hospitalizations' | 'surgical_history' | 'address_street' | 'address_ext_number' | 'address_int_number' | 'address_neighborhood' | 'address_postal_code' | 'birth_place' | 'foreign_birth_place' | 'address_state_id'>> {
  // Required form fields
  birth_state_code: string;
  nationality: string;
  internal_id: string;
  primary_phone: string;
  address_street: string;
  address_ext_number: string;
  address_int_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state_id: number | null; // Backend expects number
  address_postal_code: string;
  birth_place: string;
  foreign_birth_place: string;
  
  // Form-specific fields
  address: string;  // Legacy field for compatibility
  neighborhood: string; // Legacy field for compatibility
  municipality: string; // Legacy field for compatibility
  state: string;        // Legacy field for compatibility
  postal_code: string;  // Legacy field for compatibility
  
  // Optional form fields with default values
  email: string;
  curp: string;
  rfc: string;
  civil_status: string;
  education_level: string;
  occupation: string;
  religion: string;
  insurance_type: string;
  insurance_provider: string;
  insurance_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  allergies: string;
  chronic_conditions: string;
  current_medications: string;
  blood_type: string;
  previous_hospitalizations: string;
  surgical_history: string;
  
  // Status fields
  is_active: boolean;
}

// Form data interface - required fields made explicit, uses string types for UI
export interface PatientFormData {
  // Basic information
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  date_of_birth: string;
  birth_date: string;  // Alternative field name for compatibility
  phone: string;
  primary_phone: string;  // Alternative field name for compatibility
  gender: string;
  civil_status: string;
  
  // Address
  address: string;
  address_street: string; // Alternative field name for compatibility
  city: string;
  address_city: string;  // Alternative field name for compatibility
  state: string;
  address_state_id: string;  // Alternative field name for compatibility
  zip_code: string;
  country: string;
  
  // Emergency contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  
  // Medical information
  blood_type: string;
  allergies: string;
  current_medications: string;
  medical_history: string;
  chronic_conditions: string;  // Additional medical field
  insurance_provider: string;
  insurance_policy_number: string;
  
  // Mexican official fields
  curp: string;
  rfc: string;
  
  // Technical fields
  active: boolean;
  is_active: boolean;  // Alternative field name for compatibility
  address_postal_code: string;
  birth_place: string;
  foreign_birth_place: string;
}

export interface ConsultationFormData {
  id?: string | number;
  patient_id: string | number;
  date: string;
  consultation_date?: string;  // Alternative field name for compatibility
  consultation_time?: string;  // Alternative field name for compatibility
  chief_complaint: string;
  history_present_illness: string;
  
  // Additional fields for compatibility
  reason?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  follow_up_date?: string;
  follow_up_instructions?: string;
  created_by?: string;
  status?: string;
  consultation_type?: string;
  duration_minutes?: number;
  vital_signs?: any;
  
  // Antecedentes (parte de la evaluación clínica)
  family_history: string; // Antecedentes heredofamiliares
  personal_pathological_history: string; // Antecedentes patológicos personales
  personal_non_pathological_history: string; // Antecedentes no patológicos personales
  
  physical_examination: string;
  primary_diagnosis: string; // OBLIGATORIO NOM-004
  secondary_diagnoses: string;
  treatment_plan: string;
  therapeutic_plan: string;
  prognosis: string;
  laboratory_results: string;
  imaging_studies: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
}

export interface MedicalRecordFormData {
  patient_id: number;
  consultation_date: string;
  
  // NOM-004 required fields
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  prognosis: string;
  
  // Optional fields
  secondary_diagnoses?: string;
  differential_diagnosis?: string;
  prescribed_medications?: string;
  laboratory_results?: string;
  imaging_results?: string;
  notes?: string;
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
  cancelled_reason?: string; // Cancellation reason field
}

export interface AppointmentUpdateData {
  appointment_date?: string;
  end_time?: string;
  duration_minutes?: number;
  appointment_type?: string;
  status?: string;
  priority?: string;
  reason?: string;
  notes?: string;
  preparation_instructions?: string;
  follow_up_required?: boolean;
  room_number?: string;
  estimated_cost?: number;
  insurance_covered?: boolean;
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
  message?: string;
  fieldErrors?: { [key: string]: string };
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
  phone?: string; // Frontend field
  primary_phone?: string; // Backend field
  birth_date: string;
  gender?: string; // Género del médico
  
  // Identificación Legal (NOM-024)
  curp: string; // CURP - Obligatorio según NOM-024
  rfc?: string; // RFC - Opcional para fines fiscales
  
  // Información Profesional (NOM-004)
  professional_license: string; // Cédula profesional
  specialty_license?: string; // Cédula de especialidad
  university: string; // Universidad de egreso
  graduation_year: string;
  specialty: string;
  specialty_name?: string; // Nombre de la especialidad desde BD
  subspecialty?: string;
  
  // Contacto Profesional
  professional_email?: string;
  office_phone?: string;
  
  // Dirección del Consultorio
  office_address?: string;
  office_city?: string; // Free text field for office city
  office_state_id?: number; // FK to states table
  office_state_name?: string; // State name from backend
  office_postal_code?: string;
  office_country?: string;
  
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
  gender: string;
  
  // Identificación Legal (NOM-024)
  curp: string; // CURP - Obligatorio según NOM-024
  rfc: string; // RFC - Opcional para fines fiscales
  
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
  
  // Dirección del Consultorio
  office_address: string;
  office_city: string;
  office_state_id: string;
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
  consultation_id: string | number;
  patient_id: string | number;
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

// ============================================================================
// MEDICAL HISTORY & PRESCRIPTIONS - Consolidated from App.tsx
// ============================================================================

export interface MedicalHistory {
  id: string;
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  physical_examination?: string;
  diagnosis: string;
  treatment_plan?: string;
  follow_up_instructions?: string;
  doctor_notes?: string;
  vital_signs_id?: string;
}

// Prescription interface already defined above (lines 148-165) with PrescriptionStatus enum

// VitalSigns interface already defined above (lines 137-151) with consistent field names

// CompletePatientData interface already defined above (lines 127-135) with Consultation[] for medical_history
