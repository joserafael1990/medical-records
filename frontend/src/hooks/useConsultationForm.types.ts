import type { Patient, PatientFormData, ClinicalStudy, ConsultationFormData } from '../types';
import type { DiagnosisCatalog } from './useDiagnosisCatalog';

export interface UseConsultationFormProps {
  consultation?: any | null;
  onSubmit: (data: ConsultationFormData) => Promise<any>;
  doctorProfile?: any;
  patients: Patient[];
  appointments?: any[];
  onNewPatient?: () => void;
  onNewAppointment?: () => void;
  onSuccess?: () => void;
  open: boolean;
  // Diagnosis hooks
  primaryDiagnosesHook: any;
  secondaryDiagnosesHook: any;
  // Section hooks
  clinicalStudiesHook: any;
  vitalSignsHook: any;
  prescriptionsHook: any;
}

export interface UseConsultationFormReturn {
  // Form state
  formData: ConsultationFormData;
  setFormData: React.Dispatch<React.SetStateAction<ConsultationFormData>>;
  errors: Record<string, string>;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  currentConsultationId: number | null;

  // Patient state
  selectedPatient: Patient | null;
  patientEditData: PatientFormData | null;
  personalDocument: { document_id: number | null; document_value: string };
  setPersonalDocument: (doc: { document_id: number | null; document_value: string; document_name?: string }) => void;
  showAdvancedPatientData: boolean;
  setShowAdvancedPatientData: (show: boolean) => void;

  // Appointment state
  selectedAppointment: any | null;
  appointmentOffice: any | null;
  availableAppointments: any[];

  // Catalog data
  countries: any[];
  states: any[];
  birthStates: any[];
  emergencyRelationships: any[];
  appointmentPatients: any[];

  // Previous studies (from hook)
  patientPreviousStudies: ClinicalStudy[];
  loadingPreviousStudies: boolean;
  patientHasPreviousConsultations: boolean;

  // Handlers
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => void;
  handleDateChange: (date: Date | null) => void;
  handlePatientChange: (patient: Patient | null) => Promise<void>;
  handleAppointmentChange: (appointment: any | null) => Promise<void>;
  handleSubmit: () => Promise<void>;

  // Patient data handlers
  handlePatientDataChange: (field: keyof any, value: any) => void;
  handlePatientDataChangeWrapper: (field: string, value: any) => void;
  handleCountryChange: (field: 'address_country_id' | 'birth_country_id', countryId: string) => Promise<void>;
  getPatientData: (field: string) => any;

  // Study handlers (delegated to previous studies hook)
  handleUploadStudyFile: (studyId: string, file: File) => Promise<void>;
  handleUpdateStudyStatus: (studyId: string, status: string) => Promise<void>;
  handleViewStudyFile: (studyId: string) => Promise<void>;
  handleViewPreviousConsultations: () => void;

  // Diagnosis handlers
  handleAddPrimaryDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  handleRemovePrimaryDiagnosis: (diagnosisId: string) => void;
  handleAddSecondaryDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  handleRemoveSecondaryDiagnosis: (diagnosisId: string) => void;

  // Utilities
  shouldShowFirstTimeFields: () => boolean;
  shouldShowPreviousConsultationsButton: () => boolean;
  shouldShowOnlyBasicPatientData: () => boolean;
  isEditing: boolean;
}
