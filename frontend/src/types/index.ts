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
