// ============================================================================
// TYPES - Definiciones TypeScript mejoradas
// ============================================================================

export interface Patient {
  id: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  full_name: string;
  date_of_birth: string;
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
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
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
  physical_examination: string;
  primary_diagnosis: string;
  primary_diagnosis_cie10?: string;
  secondary_diagnoses?: string;
  secondary_diagnoses_cie10?: string;
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
}

export interface ConsultationResponse extends Consultation {
  patient_name: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name?: string;
  date_time: string;
  appointment_type: AppointmentType;
  reason: string;
  notes?: string;
  duration_minutes: number;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
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
  date_of_birth: string;
  gender: string;
  address: string;
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
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
}

export interface ConsultationFormData {
  patient_id: string;
  chief_complaint: string;
  history_present_illness: string;
  physical_examination: string;
  primary_diagnosis: string;
  primary_diagnosis_cie10: string;
  secondary_diagnoses: string;
  secondary_diagnoses_cie10: string;
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
  date_time: string;
  appointment_type: string;
  reason: string;
  notes: string;
  duration_minutes: number;
  status: string;
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
