// ============================================================================
// PATIENT TYPES
// ============================================================================

export interface Patient {
  id: number;
  first_name: string;
  paternal_surname: string;
  maternal_surname?: string;
  email?: string;
  primary_phone?: string;
  birth_date?: string;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface PatientFormData {
  first_name: string;
  paternal_surname: string;
  maternal_surname?: string;
  email?: string;
  birth_date: string;
  primary_phone?: string;
  gender?: string;
  civil_status?: string;
  home_address?: string;
  address_city?: string;
  address_state_id?: string;
  address_postal_code?: string;
  address_country_id?: string;
  birth_city?: string;
  birth_state_id?: string;
  birth_country_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  insurance_provider?: string;
  insurance_number?: string;
  active?: boolean;
  is_active?: boolean;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
  fieldErrors?: Record<string, string>;
}

// ============================================================================
// MEDICAL RECORDS TYPES
// ============================================================================

export interface MedicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  consultation_date: string;
  
  // NOM-004 required fields
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  perinatal_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  
  // Optional fields
  secondary_diagnoses?: string;
  prescribed_medications?: string;
  laboratory_results?: string;
  notes?: string;
  
  // System fields
  created_at: string;
  updated_at: string;
  created_by?: number;
  
  // Relationships
  patient?: any; // Person type will be defined later
  doctor?: any; // Person type will be defined later
}

export interface MedicalRecordFormData {
  patient_id: number;
  consultation_date: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  perinatal_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  treatment_plan: string;
  follow_up_instructions: string;
  secondary_diagnoses?: string;
  prescribed_medications?: string;
  laboratory_results?: string;
  notes?: string;
}

// ============================================================================
// CLINICAL STUDIES TYPES
// ============================================================================

export type StudyStatus = 'ordered' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export type StudyType = 'hematologia' | 'bioquimica' | 'microbiologia' | 'radiologia' | 'ecografia' | 'tomografia' | 'resonancia' | 'endoscopia' | 'biopsia' | 'otro';
export type UrgencyLevel = 'routine' | 'urgent' | 'stat' | 'emergency';

export interface ClinicalStudy {
  id: string;
  consultation_id: string;
  patient_id: string;
  study_type: StudyType;
  study_name: string;
  ordered_date: string;
  performed_date?: string;
  status: StudyStatus;
  ordering_doctor: string;
  urgency: UrgencyLevel;
  clinical_indication?: string;
  file_name?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClinicalStudyData {
  consultation_id: string;
  patient_id: string;
  study_type: StudyType;
  study_name: string;
  ordered_date: string;
  status?: StudyStatus;
  ordering_doctor: string;
  urgency?: UrgencyLevel;
  clinical_indication?: string;
  file?: File;
}

export interface UpdateClinicalStudyData extends Partial<CreateClinicalStudyData> {
  id: string;
}

// ============================================================================
// STUDY CATALOG TYPES
// ============================================================================

export interface StudyCategory {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

// StudyNormalValue interface removed - table deleted
export interface StudyNormalValue_removed {
  id: number;
  study_id: number;
  age_min?: number;
  age_max?: number;
  gender?: 'M' | 'F' | 'B';
  min_value?: number;
  max_value?: number;
  unit?: string;
  notes?: string;
  created_at: string;
}

export interface StudyCatalog {
  id: number;
  name: string;
  category_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: StudyCategory;
}

// StudyTemplateItem interface removed - table deleted
export interface StudyTemplateItem_removed {
  id: number;
  template_id: number;
  study_id: number;
  order_index: number;
  created_at: string;
  study?: StudyCatalog;
}

// StudyTemplate interface removed - table deleted
export interface StudyTemplate_removed {
  id: number;
  name: string;
  description?: string;
  specialty?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  template_items: StudyTemplateItem[];
}

// StudyTemplateCreate removed - table deleted
export interface StudyTemplateCreate_removed {
  name: string;
  description?: string;
  specialty?: string;
  study_ids: number[];
}

export interface StudySearchFilters {
  category_id?: number;
  subcategory?: string;
  name?: string;
  specialty?: string;
  duration_hours?: number;
  // has_normal_values removed - table deleted
  is_active?: boolean;
}

export interface StudyRecommendation {
  study: StudyCatalog;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// VITAL SIGNS TYPES
// ============================================================================

export interface VitalSign {
  id: number;
  name: string;
  created_at?: string;
}

export interface ConsultationVitalSign {
  id: number;
  consultation_id: number;
  vital_sign_id: number;
  vital_sign_name: string;
  value: string;
  unit?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// MEDICATIONS AND PRESCRIPTIONS TYPES
// ============================================================================

export interface Medication {
  id: number;
  name: string;
  created_at?: string;
}

export interface ConsultationPrescription {
  id: number;
  consultation_id: number;
  medication_id: number;
  medication_name: string; // Campo calculado desde medication.name en el backend
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  via_administracion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePrescriptionData {
  medication_id: number;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  via_administracion?: string;
}

export interface UpdatePrescriptionData {
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  via_administracion?: string;
}

export interface VitalSignFormData {
  vital_sign_id: number;
  value: string;
  unit?: string;
}

// ============================================================================
// PRIVACY AND CONSENT TYPES
// ============================================================================

export type ConsentMethod = 'whatsapp_button' | 'papel_firmado' | 'tablet_digital' | 'portal_web';
export type ConsentStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'accepted' | 'rejected' | 'expired';

export interface PrivacyNotice {
  id: number;
  version: string;
  title: string;
  content: string;
  summary?: string;
  effective_date: string;
  expiration_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacyConsent {
  id: number;
  patient_id: number;
  privacy_notice_version: string;
  consent_date?: string;
  consent_method: ConsentMethod;
  consent_status: ConsentStatus;
  
  // WhatsApp specific
  whatsapp_message_id?: string;
  whatsapp_sent_at?: string;
  whatsapp_delivered_at?: string;
  whatsapp_read_at?: string;
  whatsapp_response_at?: string;
  whatsapp_response_text?: string;
  
  // Consent types
  data_collection_consent: boolean;
  data_processing_consent: boolean;
  data_sharing_consent: boolean;
  marketing_consent: boolean;
  
  // Digital signature
  digital_signature?: string;
  signature_ip?: string;
  
  // Revocation
  is_revoked: boolean;
  revoked_date?: string;
  revocation_reason?: string;
  
  // Metadata
  metadata?: any;
  
  created_at: string;
  updated_at: string;
}

export interface SendPrivacyNoticeRequest {
  patient_id: number;
  method?: ConsentMethod;
}

export type ARCORequestType = 'access' | 'rectification' | 'cancellation' | 'opposition';
export type ARCORequestStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';

export interface ARCORequest {
  id: number;
  patient_id: number;
  request_type: ARCORequestType;
  description: string;
  status: ARCORequestStatus;
  contact_email?: string;
  contact_phone?: string;
  requested_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateARCORequestData {
  patient_id: number;
  request_type: ARCORequestType;
  description: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateARCORequestData {
  status: ARCORequestStatus;
  resolution_notes?: string;
}

export interface RevokeConsentRequest {
  patient_id: number;
  revocation_reason: string;
}

// ============================================================================
// OFFICE MANAGEMENT TYPES
// ============================================================================

export interface Office {
  id: number;
  doctor_id: number;
  name: string;
  address?: string;
  city?: string;
  state_id?: number;
  country_id?: number;
  postal_code?: string;
  phone?: string;
  timezone: string;
  maps_url?: string;
  is_virtual: boolean;
  virtual_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeCreate {
  name: string;
  address?: string;
  city?: string;
  state_id?: number;
  country_id?: number;
  postal_code?: string;
  phone?: string;
  timezone?: string;
  maps_url?: string;
  is_virtual?: boolean;
  virtual_url?: string;
}

export interface OfficeUpdate {
  name?: string;
  address?: string;
  city?: string;
  state_id?: number;
  country_id?: number;
  postal_code?: string;
  phone?: string;
  timezone?: string;
  maps_url?: string;
  is_virtual?: boolean;
  virtual_url?: string;
}

export interface AppointmentType {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  end_time?: string;
  appointment_type_id: number;
  office_id?: number;
  consultation_type?: string;
  status: string;
  priority: string;
  reason: string;
  notes?: string;
  preparation_instructions?: string;
  estimated_cost?: number;
  insurance_covered: boolean;
  confirmation_required: boolean;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  auto_reminder_enabled?: boolean;
  auto_reminder_offset_minutes?: number;
  cancelled_reason?: string;
  cancelled_at?: string;
  cancelled_by?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  
  // Relationships
  patient?: any; // Person type will be defined later
  doctor?: any; // Person type will be defined later
  office?: Office;
  appointment_type_rel?: AppointmentType;
}

// ============================================================================
// UPDATED EXISTING TYPES
// ============================================================================

export interface AppointmentFormData {
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  end_time?: string;
  appointment_type_id: number;
  office_id?: number;
  consultation_type?: string;
  status?: string;
  priority?: string;
  reason: string;
  notes?: string;
  preparation_instructions?: string;
  estimated_cost?: number;
  insurance_covered?: boolean;
  confirmation_required?: boolean;
  reminder_sent?: boolean;
  reminder_sent_at?: string;
  // Auto reminder fields
  auto_reminder_enabled?: boolean;
  auto_reminder_offset_minutes?: number;
  cancelled_reason?: string;
  cancelled_at?: string;
  cancelled_by?: number;
  created_by?: number;
}

export interface DoctorProfile {
  id: number;
  person_code: string;
  person_type: string;
  title?: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname?: string;
  curp?: string;
  rfc?: string;
  birth_date?: string;
  gender: string;
  civil_status?: string;
  birth_city?: string;
  birth_state_id?: number;
  birth_country_id?: number;
  email?: string;
  primary_phone?: string;
  home_address?: string;
  address_city?: string;
  address_state_id?: number;
  address_country_id?: number;
  address_postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  online_consultation_url?: string;
  appointment_duration?: number;
  professional_license?: string;
  specialty_id?: number;
  specialty_license?: string;
  university?: string;
  graduation_year?: number;
  subspecialty?: string;
  digital_signature?: string;
  professional_seal?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  offices?: Office[];
  specialty?: string; // Para compatibilidad con componentes que usan specialty directamente
}
