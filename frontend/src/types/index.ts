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
  curp?: string;
  rfc?: string;
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
  chronic_conditions?: string;
  current_medications?: string;
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
  patient?: any; // Person type will be defined later
  doctor?: any; // Person type will be defined later
}

export interface MedicalRecordFormData {
  patient_id: number;
  consultation_date: string;
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
  secondary_diagnoses?: string;
  differential_diagnosis?: string;
  prescribed_medications?: string;
  laboratory_results?: string;
  imaging_results?: string;
  notes?: string;
}

// ============================================================================
// CLINICAL STUDIES TYPES
// ============================================================================

export type StudyStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export type StudyType = 'hematologia' | 'bioquimica' | 'microbiologia' | 'radiologia' | 'ecografia' | 'tomografia' | 'resonancia' | 'endoscopia' | 'biopsia' | 'otro';
export type UrgencyLevel = 'normal' | 'urgent' | 'stat';

export interface ClinicalStudy {
  id: string;
  consultation_id: string;
  patient_id: string;
  study_type: StudyType;
  study_name: string;
  study_description?: string;
  ordered_date: string;
  performed_date?: string;
  status: StudyStatus;
  results_text?: string;
  interpretation?: string;
  ordering_doctor: string;
  performing_doctor?: string;
  institution?: string;
  urgency: UrgencyLevel;
  clinical_indication?: string;
  relevant_history?: string;
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
  study_description?: string;
  ordered_date: string;
  status?: StudyStatus;
  results_text?: string;
  interpretation?: string;
  ordering_doctor: string;
  performing_doctor?: string;
  institution?: string;
  urgency?: UrgencyLevel;
  clinical_indication?: string;
  relevant_history?: string;
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
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyNormalValue {
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
  code: string;
  name: string;
  category_id: number;
  subcategory?: string;
  description?: string;
  preparation?: string;
  methodology?: string;
  duration_hours?: number;
  specialty?: string;
  is_active: boolean;
  regulatory_compliance?: any;
  created_at: string;
  updated_at: string;
  category?: StudyCategory;
  normal_values: StudyNormalValue[];
}

export interface StudyTemplateItem {
  id: number;
  template_id: number;
  study_id: number;
  order_index: number;
  created_at: string;
  study?: StudyCatalog;
}

export interface StudyTemplate {
  id: number;
  name: string;
  description?: string;
  specialty?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  template_items: StudyTemplateItem[];
}

export interface StudyTemplateCreate {
  name: string;
  description?: string;
  specialty?: string;
  study_ids: number[];
}

export interface StudySearchFilters {
  category_id?: number;
  subcategory?: string;
  name?: string;
  code?: string;
  specialty?: string;
  duration_hours?: number;
  has_normal_values?: boolean;
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
  notes?: string;
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
  medication_name: string;
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
  notes?: string;
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
