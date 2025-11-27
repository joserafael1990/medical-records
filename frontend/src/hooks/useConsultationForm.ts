import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
const mapPatientDocument = (
  doc: any | null | undefined,
  fallbackValue?: string,
  fallbackName?: string
): { document_id: number | null; document_value: string; document_name?: string } => ({
  document_id: doc?.document_id ?? doc?.id ?? null,
  document_value: fallbackValue ?? doc?.document_value ?? '',
  document_name: doc?.document_name || doc?.document?.name || fallbackName
});
import { Patient, PatientFormData, ClinicalStudy } from '../types';
import { DiagnosisCatalog } from './useDiagnosisCatalog';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';
import { disablePaymentDetection } from '../utils/disablePaymentDetection';
import { usePatientPreviousStudies } from './usePatientPreviousStudies';
import { parseBackendDate } from '../utils/formatters';

// Re-export ConsultationFormData interface from component
export interface ConsultationFormData {
  patient_id: string;
  patient_document_id: number | null;
  patient_document_value: string;
  patient_document_name?: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  perinatal_history: string;
  gynecological_and_obstetric_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  treatment_plan: string;
  follow_up_instructions: string;
  therapeutic_plan: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
  has_appointment: boolean;
  appointment_id: string;
  consultation_type?: string;
  primary_diagnoses: DiagnosisCatalog[];
  secondary_diagnoses_list: DiagnosisCatalog[];
}

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

// Helper function to get current date in CDMX timezone
const getCDMXDateTime = (): string => {
  const now = new Date();
  const cdmxTimeString = now.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
  const cdmxDate = new Date(cdmxTimeString);
  return cdmxDate.toISOString();
};

const DEFAULT_PHYSICAL_EXAMINATION = [
  'Paciente en buenas condiciones generales, alerta, orientada en persona, tiempo y espacio, cooperadora, con marcha y postura normales.',
  'Cabeza normocéfala, simétrica, sin lesiones ni deformidades.',
  'Pupilas isocóricas y normorreactivas a la luz.',
  'Pabellones auriculares sin alteraciones, conductos auditivos limpios y tímpanos íntegros.',
  'Nariz alineada, mucosa rosada, sin secreción ni congestión.',
  'Mucosa oral húmeda y rosada, dentadura en buen estado, faringe sin hiperemia ni exudado.',
  'Cuello simétrico, sin masas ni adenomegalias, tiroides no palpable, pulsos carotídeos presentes y simétricos.',
  'Tórax simétrico con movimientos respiratorios adecuados; murmullo vesicular bien distribuido, sin ruidos agregados.',
  'Ruidos cardiacos rítmicos, de buena intensidad, sin soplos ni galope.',
  'Abdomen plano, blando, depresible, no doloroso a la palpación, sin visceromegalias ni masas palpables, con ruidos peristálticos presentes y normales.',
  'Extremidades simétricas, sin edema, cianosis ni deformidades; pulsos periféricos palpables y simétricos, fuerza y tono muscular conservados.',
  'Sistema nervioso íntegro, con fuerza 5/5 en las cuatro extremidades, sensibilidad y reflejos osteotendinosos normales, marcha coordinada.'
].join('\n\n');

export const useConsultationForm = (props: UseConsultationFormProps): UseConsultationFormReturn => {
  const {
    consultation,
    onSubmit,
    doctorProfile,
    patients,
    appointments = [],
    onSuccess,
    open,
    primaryDiagnosesHook,
    secondaryDiagnosesHook,
    clinicalStudiesHook,
    vitalSignsHook,
    prescriptionsHook
  } = props;

  const { showSuccess, showError } = useToast();
  const isEditing = !!consultation;

  // Use previous studies hook
  const previousStudiesHook = usePatientPreviousStudies();

  // Memoize initialFormData
  const initialFormData: ConsultationFormData = useMemo(() => ({
    patient_id: '',
    patient_document_id: null,
    patient_document_value: '',
    date: getCDMXDateTime(),
    chief_complaint: '',
    history_present_illness: '',
    family_history: '',
    perinatal_history: '',
    gynecological_and_obstetric_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    physical_examination: DEFAULT_PHYSICAL_EXAMINATION,
    primary_diagnosis: '',
    secondary_diagnoses: '',
    treatment_plan: '',
    follow_up_instructions: '',
    therapeutic_plan: '',
    interconsultations: '',
    doctor_name: doctorProfile?.first_name && doctorProfile?.last_name
      ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
      : '',
    doctor_professional_license: doctorProfile?.professional_license || '',
    doctor_specialty: doctorProfile?.specialty || '',
    has_appointment: undefined as any,
    appointment_id: '',
    primary_diagnoses: [],
    secondary_diagnoses_list: [],
  }), [doctorProfile?.first_name, doctorProfile?.last_name, doctorProfile?.title, doctorProfile?.professional_license, doctorProfile?.specialty]);

  const [formData, setFormData] = useState<ConsultationFormData>(initialFormData);
  const [currentConsultationId, setCurrentConsultationId] = useState<number | null>(consultation?.id ?? null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [appointmentOffice, setAppointmentOffice] = useState<any | null>(null);
  const [patientEditData, setPatientEditData] = useState<PatientFormData | null>(null);
  const [personalDocument, setPersonalDocument] = useState<{ document_id: number | null; document_value: string; document_name?: string }>(
    mapPatientDocument(null)
  );

  // Track previous personalDocument values to avoid unnecessary updates
  const prevPersonalDocumentRef = useRef<{ document_id: number | null; document_value: string; document_name?: string }>(personalDocument);

  useEffect(() => {
    // Only update if values actually changed
    const hasChanged =
      prevPersonalDocumentRef.current.document_id !== personalDocument.document_id ||
      prevPersonalDocumentRef.current.document_value !== personalDocument.document_value ||
      prevPersonalDocumentRef.current.document_name !== personalDocument.document_name;

    if (hasChanged) {
      prevPersonalDocumentRef.current = personalDocument;
      setFormData(prev => {
        // Only update if the values are actually different
        if (
          prev.patient_document_id === (personalDocument.document_id ?? null) &&
          prev.patient_document_value === (personalDocument.document_value || '') &&
          prev.patient_document_name === personalDocument.document_name
        ) {
          return prev; // No change needed
        }
        return {
          ...prev,
          patient_document_id: personalDocument.document_id ?? null,
          patient_document_value: personalDocument.document_value || '',
          patient_document_name: personalDocument.document_name
        };
      });
    }
  }, [personalDocument.document_id, personalDocument.document_value, personalDocument.document_name]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [birthStates, setBirthStates] = useState<any[]>([]);
  const [emergencyRelationships, setEmergencyRelationships] = useState<any[]>([]);
  const [appointmentPatients, setAppointmentPatients] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedPatientData, setShowAdvancedPatientData] = useState<boolean>(false);

  // Refs for tracking loaded consultations
  const loadedConsultationIdRef = useRef<string | number | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  const lastConsultationIdRef = useRef<string | number | undefined>(undefined);
  const isHydratingRef = useRef(false);

  // Filter appointments
  const availableAppointments = useMemo(() => {
    // Get current date (without time) for comparison
    // IMPORTANTE: Las citas del mismo día deben estar disponibles aunque ya haya pasado la hora
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    return (appointments || []).filter((appointment: any) => {
      // Exclude cancelled appointments
      if (appointment.status === 'cancelled' || appointment.status === 'cancelada') {
        return false;
      }
      // Include confirmed, pending confirmation, and completed appointments
      const validStatus = appointment.status === 'confirmada' ||
        appointment.status === 'por_confirmar' ||
        appointment.status === 'completada';
      const correctDoctor = appointment.doctor_id === doctorProfile?.id;

      // IMPORTANTE: Solo comparar la fecha, no la hora
      // Las citas del mismo día deben estar disponibles aunque ya haya pasado la hora
      if (appointment.appointment_date) {
        try {
          const appointmentDate = parseBackendDate(appointment.appointment_date);
          // Reset to start of day for comparison (only compare dates, not times)
          const appointmentDateOnly = new Date(appointmentDate);
          appointmentDateOnly.setHours(0, 0, 0, 0);

          // Only include appointments that are today or in the future (by date, not time)
          if (appointmentDateOnly < today) {
            return false;
          }
        } catch (error) {
          // If date parsing fails, exclude the appointment to be safe
          logger.warn('Failed to parse appointment date', { appointment, error }, 'validation');
          return false;
        }
      }

      return validStatus && correctDoctor;
    });
  }, [appointments, doctorProfile?.id]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        disablePaymentDetection();
      }, 100);
      setError(null);
      setErrors({});
    }
  }, [open]);

  // Load consultation data when editing
  useEffect(() => {
    let isMounted = true;

    const hydrateConsultation = async () => {
      if (!(open && consultation)) {
        if (!open) {
          loadedConsultationIdRef.current = undefined;
          isHydratingRef.current = false;
        }
        return;
      }

      const consultationId = consultation?.id;
      if (!consultationId) {
        return;
      }

      // Prevent multiple simultaneous hydration calls
      if (isHydratingRef.current || loadedConsultationIdRef.current === consultationId) {
        return;
      }

      isHydratingRef.current = true;
      loadedConsultationIdRef.current = consultationId;

      let resolvedConsultation = consultation;

      // Fetch full consultation data when editing to ensure all fields are loaded
      // Only fetch if we suspect data might be incomplete
      if (
        resolvedConsultation.id &&
        (typeof resolvedConsultation.follow_up_instructions === 'undefined' ||
          resolvedConsultation.follow_up_instructions === null ||
          !resolvedConsultation.patient_id ||
          !resolvedConsultation.date)
      ) {
        try {
          const fullConsultation = await apiService.consultations.getConsultationById(
            resolvedConsultation.id.toString()
          );
          if (!isMounted) return;
          // Merge carefully - preserve original data and add missing fields from fetch
          resolvedConsultation = {
            ...resolvedConsultation,
            ...fullConsultation,
            // Ensure critical fields are preserved from original if fetch doesn't have them
            id: fullConsultation.id || resolvedConsultation.id,
            patient_id: fullConsultation.patient_id || resolvedConsultation.patient_id,
            date: fullConsultation.date || resolvedConsultation.date,
            // Ensure follow_up_instructions is loaded if it was missing
            follow_up_instructions: fullConsultation.follow_up_instructions !== undefined
              ? fullConsultation.follow_up_instructions
              : resolvedConsultation.follow_up_instructions
          };
        } catch (error) {
          logger.error('Error hydrating consultation data', error, 'api');
          // Continue with original consultation data if fetch fails
        }
      }

      // Ensure patient_id is available from formData if not in resolvedConsultation
      if (!resolvedConsultation.patient_id && formData.patient_id) {
        resolvedConsultation.patient_id = formData.patient_id;
      }

      const finalConsultationId = resolvedConsultation.id;
      if (!finalConsultationId) {
        isHydratingRef.current = false;
        return;
      }
      setCurrentConsultationId(finalConsultationId);

      // Debug log to check consultation and patient data
      logger.info('📋 Consultation data loaded', {
        consultationId: finalConsultationId,
        patient_id: resolvedConsultation.patient_id,
        patient_id_from_formData: formData.patient_id,
        follow_up_instructions: resolvedConsultation.follow_up_instructions,
        follow_up_instructions_type: typeof resolvedConsultation.follow_up_instructions,
        follow_up_instructions_length: resolvedConsultation.follow_up_instructions?.length || 0
      }, 'api');

      // Use current formData as base to avoid recreating from initialFormData which may change
      // Ensure patient_id is set from multiple sources
      const finalPatientId = resolvedConsultation.patient_id || formData.patient_id || consultation?.patient_id || '';

      // Update formData first
      setFormData(prev => ({
        ...prev,
        patient_id: finalPatientId,
        patient_document_id: resolvedConsultation.patient_document_id ?? null,
        patient_document_value: resolvedConsultation.patient_document_value || '',
        patient_document_name: resolvedConsultation.patient_document_name,
        date: resolvedConsultation.date ? resolvedConsultation.date : getCDMXDateTime(),
        chief_complaint: resolvedConsultation.chief_complaint || '',
        history_present_illness: resolvedConsultation.history_present_illness || '',
        family_history: resolvedConsultation.family_history || '',
        perinatal_history: resolvedConsultation.perinatal_history || '',
        gynecological_and_obstetric_history: resolvedConsultation.gynecological_and_obstetric_history || '',
        personal_pathological_history: resolvedConsultation.personal_pathological_history || '',
        personal_non_pathological_history: resolvedConsultation.personal_non_pathological_history || '',
        physical_examination: resolvedConsultation.physical_examination || DEFAULT_PHYSICAL_EXAMINATION,
        primary_diagnosis: resolvedConsultation.primary_diagnosis || '',
        secondary_diagnoses: resolvedConsultation.secondary_diagnoses || '',
        treatment_plan: resolvedConsultation.treatment_plan || '',
        follow_up_instructions: resolvedConsultation.follow_up_instructions ?? '',
        therapeutic_plan: resolvedConsultation.therapeutic_plan || '',
        laboratory_results: resolvedConsultation.laboratory_results || '',
        interconsultations: resolvedConsultation.interconsultations || '',
        doctor_name: resolvedConsultation.doctor_name || doctorProfile?.first_name && doctorProfile?.last_name
          ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
          : '',
        doctor_professional_license: resolvedConsultation.doctor_professional_license || doctorProfile?.professional_license || '',
        doctor_specialty: resolvedConsultation.doctor_specialty || doctorProfile?.specialty || '',
        primary_diagnoses: resolvedConsultation.primary_diagnoses || [],
        secondary_diagnoses_list: resolvedConsultation.secondary_diagnoses_list || [],
      }));

      const loadPatientData = async () => {
        // Use finalPatientId which we just set in formData, or fallback to other sources
        // Try multiple sources to ensure we get the patient_id
        const patientId = finalPatientId ||
          resolvedConsultation.patient_id ||
          consultation?.patient_id ||
          formData.patient_id;

        logger.info('🔍 Loading patient data', {
          consultationId: finalConsultationId,
          patient_id_from_resolved: resolvedConsultation.patient_id,
          patient_id_from_formData: formData.patient_id,
          patient_id_from_consultation: consultation?.patient_id,
          finalPatientId: finalPatientId,
          final_patient_id: patientId
        }, 'api');

        if (patientId) {
          try {
            // Convert to number if it's a string
            const numericPatientId = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
            if (isNaN(numericPatientId)) {
              logger.error('❌ Invalid patient_id', {
                consultationId: finalConsultationId,
                patientId: patientId,
                numericPatientId: numericPatientId
              }, 'api');
              return;
            }

            const patientData = await apiService.patients.getPatientById(numericPatientId);
            if (!isMounted) return;
            logger.info('✅ Patient data fetched successfully', {
              consultationId: finalConsultationId,
              patientId: numericPatientId,
              patientName: patientData.name,
              hasPersonalDocuments: !!(patientData.personal_documents && patientData.personal_documents.length > 0)
            }, 'api');
            setSelectedPatient(patientData);
            setPatientEditData(patientData);
            logger.info('✅ Patient state updated', {
              consultationId: finalConsultationId,
              selectedPatient_set: true,
              patientEditData_set: true,
              patientName: patientData.name
            }, 'api');
            if (resolvedConsultation?.patient_document_id) {
              const matchingDocument = (patientData.personal_documents || []).find(
                (doc: any) => doc.document_id === resolvedConsultation.patient_document_id
              );
              if (matchingDocument) {
                setPersonalDocument(
                  mapPatientDocument(
                    {
                      document_id: matchingDocument.document_id,
                      document_value: matchingDocument.document_value,
                      document_name: matchingDocument.document_name || matchingDocument.document?.name
                    },
                    resolvedConsultation.patient_document_value || '',
                    resolvedConsultation.patient_document_name
                  )
                );
              } else {
                setPersonalDocument(
                  mapPatientDocument(
                    {
                      document_id: resolvedConsultation.patient_document_id,
                      document_value: resolvedConsultation.patient_document_value,
                      document_name: resolvedConsultation.patient_document_name
                    },
                    resolvedConsultation.patient_document_value || '',
                    resolvedConsultation.patient_document_name
                  )
                );
              }
            } else if (patientData.personal_documents && patientData.personal_documents.length > 0) {
              const fallbackDocument = patientData.personal_documents[0];
              setPersonalDocument(
                mapPatientDocument(
                  fallbackDocument,
                  fallbackDocument.document_value || '',
                  fallbackDocument.document_name || fallbackDocument.document?.name
                )
              );
            } else {
              setPersonalDocument(mapPatientDocument(null));
            }
          } catch (error) {
            logger.error('❌ Error loading patient data', error, 'api');
            logger.error('Error details', {
              consultationId: finalConsultationId,
              patientId: patientId,
              error_message: error instanceof Error ? error.message : String(error)
            }, 'api');
          }
        } else {
          logger.warning('⚠️ No patient_id available to load patient data', {
            consultationId: finalConsultationId,
            resolved_patient_id: resolvedConsultation.patient_id,
            formData_patient_id: formData.patient_id
          }, 'api');
        }
      };

      const loadStructuredDiagnoses = async () => {
        try {
          const parseDiagnosesFromText = (text: string): DiagnosisCatalog[] => {
            if (!text) return [];
            const diagnosisEntries = text.split(';').map(entry => entry.trim()).filter(entry => entry);
            return diagnosisEntries.map((entry, index) => {
              const [code, ...nameParts] = entry.split(' - ');
              const name = nameParts.join(' - ');
              return {
                id: `temp_${Date.now()}_${index}`,
                code: code || `TEMP${index}`,
                name: name || entry,
                description: '',
                category: '',
                specialty: '',
                severity_level: '',
                is_chronic: false,
                is_active: true
              };
            });
          };

          if (resolvedConsultation.primary_diagnosis) {
            if (resolvedConsultation.primary_diagnoses && Array.isArray(resolvedConsultation.primary_diagnoses) && resolvedConsultation.primary_diagnoses.length > 0) {
              primaryDiagnosesHook.clearDiagnoses();
              primaryDiagnosesHook.loadDiagnoses(resolvedConsultation.primary_diagnoses);
            } else {
              const parsedPrimary = parseDiagnosesFromText(resolvedConsultation.primary_diagnosis);
              primaryDiagnosesHook.clearDiagnoses();
              primaryDiagnosesHook.loadDiagnoses(parsedPrimary);
            }
          }

          if (resolvedConsultation.secondary_diagnoses) {
            if (resolvedConsultation.secondary_diagnoses_list && Array.isArray(resolvedConsultation.secondary_diagnoses_list) && resolvedConsultation.secondary_diagnoses_list.length > 0) {
              secondaryDiagnosesHook.clearDiagnoses();
              secondaryDiagnosesHook.loadDiagnoses(resolvedConsultation.secondary_diagnoses_list);
            } else {
              const parsedSecondary = parseDiagnosesFromText(resolvedConsultation.secondary_diagnoses);
              secondaryDiagnosesHook.clearDiagnoses();
              secondaryDiagnosesHook.loadDiagnoses(parsedSecondary);
            }
          }
        } catch (error) {
          logger.error('Error loading structured diagnoses', error, 'api');
        }
      };

      await Promise.all([loadPatientData(), loadStructuredDiagnoses()]);

      clinicalStudiesHook.fetchStudies(String(finalConsultationId));
      vitalSignsHook.fetchConsultationVitalSigns(String(finalConsultationId));
      prescriptionsHook.fetchPrescriptions(String(finalConsultationId));

      if (resolvedConsultation.appointment_id) {
        loadOfficeForConsultation(resolvedConsultation.appointment_id);
      } else {
        loadDefaultOffice();
      }
    };

    hydrateConsultation().finally(() => {
      if (isMounted) {
        isHydratingRef.current = false;
      }
    });

    return () => {
      isMounted = false;
      isHydratingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultation?.id]);

  // Load patient data if it wasn't loaded during hydration
  useEffect(() => {
    if (open && consultation?.id && !selectedPatient && !patientEditData) {
      const patientId = consultation.patient_id || formData.patient_id;
      if (patientId) {
        logger.info('🔄 Loading patient data in fallback useEffect', {
          consultationId: consultation.id,
          patientId: patientId
        }, 'api');
        const loadPatient = async () => {
          try {
            const numericPatientId = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
            if (!isNaN(numericPatientId)) {
              const patientData = await apiService.patients.getPatientById(numericPatientId);
              setSelectedPatient(patientData);
              setPatientEditData(patientData);
              logger.info('✅ Patient data loaded in fallback useEffect', {
                consultationId: consultation.id,
                patientId: numericPatientId,
                patientName: patientData.name
              }, 'api');
            }
          } catch (error) {
            logger.error('❌ Error loading patient data in fallback useEffect', error, 'api');
          }
        };
        loadPatient();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultation?.id, consultation?.patient_id, formData.patient_id]);

  // Initialize new consultation
  useEffect(() => {
    const currentConsultationId = consultation?.id;

    if (!open) {
      hasInitializedRef.current = false;
      lastConsultationIdRef.current = undefined;
      return;
    }

    if (open && !consultation && !hasInitializedRef.current) {
      logger.debug('Setting up NEW consultation - clearing temporary prescriptions', undefined, 'ui');
      // Reset form data to initial values
      setFormData({
        patient_id: '',
        patient_document_id: null,
        patient_document_value: '',
        date: getCDMXDateTime(),
        chief_complaint: '',
        history_present_illness: '',
        family_history: '',
        perinatal_history: '',
        gynecological_and_obstetric_history: '',
        personal_pathological_history: '',
        personal_non_pathological_history: '',
        physical_examination: DEFAULT_PHYSICAL_EXAMINATION,
        primary_diagnosis: '',
        secondary_diagnoses: '',
        treatment_plan: '',
        follow_up_instructions: '',
        therapeutic_plan: '',
        laboratory_results: '',
        interconsultations: '',
        doctor_name: doctorProfile?.first_name && doctorProfile?.last_name
          ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
          : '',
        doctor_professional_license: doctorProfile?.professional_license || '',
        doctor_specialty: doctorProfile?.specialty || '',
        has_appointment: undefined as any,
        appointment_id: '',
        primary_diagnoses: [],
        secondary_diagnoses_list: [],
      });
      setSelectedAppointment(null);
      setSelectedPatient(null);
      setShowAdvancedPatientData(false);
      setPersonalDocument(mapPatientDocument(null));

      clinicalStudiesHook.clearTemporaryStudies();
      vitalSignsHook.clearTemporaryVitalSigns();
      prescriptionsHook.clearTemporaryPrescriptions();

      hasInitializedRef.current = true;
    } else if (open && currentConsultationId) {
      if (currentConsultationId !== lastConsultationIdRef.current) {
        logger.debug('Consultation changed, loading prescriptions from DB', { consultationId: currentConsultationId }, 'ui');
        hasInitializedRef.current = false;
        lastConsultationIdRef.current = currentConsultationId;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultation?.id]);

  // Refresh clinical studies when dialog closes
  const prevClinicalDialogOpen = useRef(clinicalStudiesHook.clinicalStudyDialogOpen);
  useEffect(() => {
    const wasOpen = prevClinicalDialogOpen.current;
    const isOpen = clinicalStudiesHook.clinicalStudyDialogOpen;

    if (isEditing && consultation?.id && wasOpen && !isOpen) {
      clinicalStudiesHook.fetchStudies(String(consultation.id));
    }

    prevClinicalDialogOpen.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicalStudiesHook.clinicalStudyDialogOpen, isEditing, consultation?.id]);

  // Refresh vital signs when dialog closes
  const prevVitalSignDialogOpen = useRef(vitalSignsHook.vitalSignDialogOpen);
  useEffect(() => {
    const wasOpen = prevVitalSignDialogOpen.current;
    const isOpen = vitalSignsHook.vitalSignDialogOpen;

    if (isEditing && consultation?.id && wasOpen && !isOpen) {
      vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
    }

    prevVitalSignDialogOpen.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitalSignsHook.vitalSignDialogOpen, isEditing, consultation?.id]);

  // Load initial catalog data (with debouncing and caching to avoid rate limiting)
  const hasLoadedCatalogsRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    if (!open) {
      hasLoadedCatalogsRef.current = false; // Reset when dialog closes
      return;
    }

    // Skip if already loaded
    if (hasLoadedCatalogsRef.current) {
      return;
    }

    const loadInitialData = async () => {
      try {
        const [countriesData, relationshipsData] = await Promise.all([
          apiService.catalogs.getCountries().catch((err: any) => {
            // Ignore 429 errors
            if (err?.response?.status !== 429) {
              logger.error('Error loading countries', err, 'api');
            }
            return [];
          }),
          apiService.catalogs.getEmergencyRelationships().catch((err: any) => {
            // Ignore 429 errors
            if (err?.response?.status !== 429) {
              logger.error('Error loading emergency relationships', err, 'api');
            }
            return [];
          })
        ]);
        
        if (isMounted) {
          setCountries(countriesData);
          setEmergencyRelationships(relationshipsData);
          hasLoadedCatalogsRef.current = true;
        }

        vitalSignsHook.fetchAvailableVitalSigns();

        if (appointments && appointments.length > 0) {
          const patientIds = (appointments || []).map((apt: any) => apt.patient_id).filter((id: any) => id);
          try {
            const allPatients = await apiService.patients.getPatients();
            if (isMounted) {
              const appointmentPatients = (allPatients || []).filter((patient: any) =>
                patientIds.includes(patient.id)
              );
              setAppointmentPatients(appointmentPatients);
            }
          } catch (err: any) {
            // Ignore 429 errors
            if (err?.response?.status !== 429) {
              logger.error('Error loading appointment patients', err, 'api');
            }
          }
        }
      } catch (error: any) {
        // Ignore 429 errors
        if (error?.response?.status !== 429 && isMounted) {
          logger.error('Error loading initial data', error, 'api');
        }
      }
    };

    // Debounce to avoid rapid successive calls
    timeoutId = setTimeout(() => {
      loadInitialData();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointments?.length]);

  // Clear diagnosis hooks for new consultation
  useEffect(() => {
    if (open && !isEditing && !consultation) {
      primaryDiagnosesHook.clearDiagnoses();
      secondaryDiagnosesHook.clearDiagnoses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, consultation?.id]);

  // Load states when patient data changes (with debouncing and caching)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadStatesForPatient = async () => {
      if (!patientEditData) return;

      try {
        // Only load if country_id has actually changed and is valid
        if (patientEditData.address_country_id) {
          const countryId = parseInt(patientEditData.address_country_id);
          if (!isNaN(countryId) && countryId > 0) {
            try {
              const addressStatesData = await apiService.catalogs.getStates(countryId);
              if (isMounted) {
                setStates(addressStatesData);
              }
            } catch (error: any) {
              // Ignore 429 errors (rate limiting) - will retry later
              if (error?.response?.status !== 429) {
                logger.error('Error loading address states', error, 'api');
              }
            }
          }
        }

        if (patientEditData.birth_country_id) {
          const countryId = parseInt(patientEditData.birth_country_id);
          if (!isNaN(countryId) && countryId > 0) {
            try {
              const birthStatesData = await apiService.catalogs.getStates(countryId);
              if (isMounted) {
                setBirthStates(birthStatesData);
              }
            } catch (error: any) {
              // Ignore 429 errors (rate limiting) - will retry later
              if (error?.response?.status !== 429) {
                logger.error('Error loading birth states', error, 'api');
              }
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          logger.error('Error loading states', error, 'api');
        }
      }
    };

    // Debounce the API call to avoid rapid successive requests
    timeoutId = setTimeout(() => {
      loadStatesForPatient();
    }, 300); // 300ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [patientEditData?.address_country_id, patientEditData?.birth_country_id]);

  // Handlers
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData((prev: ConsultationFormData) => ({ ...prev, [name as string]: value }));
    if (errors[name as string]) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  }, [errors]);

  const handleDateChange = useCallback((newValue: Date | null) => {
    let dateString = '';
    if (newValue) {
      const cdmxTimeString = newValue.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
      const cdmxDate = new Date(cdmxTimeString);
      dateString = cdmxDate.toISOString();
    }
    setFormData((prev: ConsultationFormData) => ({ ...prev, date: dateString }));
    if (errors.date) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors.date;
        return newErrors;
      });
    }
  }, [errors]);

  const handlePatientChange = useCallback(async (patient: Patient | null) => {
    setSelectedPatient(patient);
    setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: patient?.id || '' }));

    if (patient) {
      try {
        const fullPatientData = await apiService.patients.getPatientById(patient.id);
        setPatientEditData(fullPatientData);
        if (fullPatientData.personal_documents && fullPatientData.personal_documents.length > 0) {
          const primaryDocument = fullPatientData.personal_documents[0];
          setPersonalDocument(
            mapPatientDocument(
              primaryDocument,
              primaryDocument.document_value || '',
              primaryDocument.document_name || primaryDocument.document?.name
            )
          );
        } else {
          setPersonalDocument(mapPatientDocument(null));
        }

        await Promise.all([
          previousStudiesHook.checkPatientPreviousConsultations(patient.id),
          previousStudiesHook.loadPatientPreviousStudies(patient.id)
        ]);
      } catch (error) {
        logger.error('Error loading patient data', error, 'api');
        setPatientEditData(null);
        setPersonalDocument(mapPatientDocument(null));
      }
    } else {
      setPatientEditData(null);
      setPersonalDocument(mapPatientDocument(null));
      previousStudiesHook.loadPatientPreviousStudies(0).catch(() => { }); // Clear studies
    }

    if (errors.patient_id) {
      setErrors((prev: { [key: string]: string }) => {
        const newErrors = { ...prev };
        delete newErrors.patient_id;
        return newErrors;
      });
    }
  }, [errors, previousStudiesHook]);

  const handleAppointmentChange = useCallback(async (appointment: any | null) => {
    setSelectedAppointment(appointment);

    if (appointment) {
      const patient = appointment.patient || (patients || []).find((p: any) => p.id === appointment.patient_id);

      if (patient) {
        setSelectedPatient(patient);
        setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: patient.id.toString(), appointment_id: appointment.id.toString() }));

        if (appointment.office_id) {
          try {
            const officeData = await apiService.offices.getOffice(appointment.office_id);
            setAppointmentOffice(officeData);
          } catch (error) {
            logger.error('Error loading office data', error, 'api');
            setAppointmentOffice(null);
          }
        } else {
          setAppointmentOffice(null);
        }

        try {
          const fullPatientData = await apiService.patients.getPatientById(patient.id);
          setPatientEditData(fullPatientData);
          if (fullPatientData.personal_documents && fullPatientData.personal_documents.length > 0) {
            const primaryDocument = fullPatientData.personal_documents[0];
            setPersonalDocument(
              mapPatientDocument(
                primaryDocument,
                primaryDocument.document_value || '',
                primaryDocument.document_name || primaryDocument.document?.name
              )
            );
          } else {
            setPersonalDocument(mapPatientDocument(null));
          }
          setSelectedPatient(fullPatientData);

          logger.debug('Loading patient previous consultations and studies', { patientId: patient.id }, 'api');
          await Promise.all([
            previousStudiesHook.checkPatientPreviousConsultations(patient.id),
            previousStudiesHook.loadPatientPreviousStudies(patient.id)
          ]);
        } catch (error) {
          logger.error('Error loading decrypted patient data', error, 'api');
          setPatientEditData(null);
          setPersonalDocument(mapPatientDocument(null));
        }
      } else {
        setSelectedPatient(null);
        setPatientEditData(null);
        setPersonalDocument(mapPatientDocument(null));
        setAppointmentOffice(null);
      }
    } else {
      setSelectedPatient(null);
      setPatientEditData(null);
      setAppointmentOffice(null);
      setFormData((prev: ConsultationFormData) => ({ ...prev, patient_id: '', appointment_id: '' }));
    }
  }, [patients, previousStudiesHook]);

  const loadOfficeForConsultation = useCallback(async (appointmentId: string) => {
    try {
      const appointment = await apiService.appointments.getAppointment(parseInt(appointmentId));
      if (appointment && appointment.office_id) {
        const officeData = await apiService.offices.getOffice(appointment.office_id);
        setAppointmentOffice(officeData);
      } else {
        setAppointmentOffice(null);
      }
    } catch (error) {
      logger.error('Error loading office for consultation', error, 'api');
      setAppointmentOffice(null);
    }
  }, []);

  const loadDefaultOffice = useCallback(async () => {
    try {
      const doctorId = doctorProfile?.id;
      if (!doctorId) {
        setAppointmentOffice(null);
        return;
      }

      const offices = await apiService.offices.getOffices(doctorId);
      if (offices && offices.length > 0) {
        const defaultOffice = offices.find(office => office.is_active) || offices[0];
        setAppointmentOffice(defaultOffice);
      } else {
        setAppointmentOffice(null);
      }
    } catch (error) {
      logger.error('Error loading default office', error, 'api');
      setAppointmentOffice(null);
    }
  }, [doctorProfile?.id]);

  const handlePatientDataChange = useCallback((field: keyof any, value: any) => {
    setPatientEditData((prev: any) => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handlePatientDataChangeWrapper = useCallback((field: string, value: any) => {
    handlePatientDataChange(field, value);
  }, [handlePatientDataChange]);

  const handleCountryChange = useCallback(async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    handlePatientDataChange(field, countryId);

    if (countryId) {
      try {
        const statesData = await apiService.catalogs.getStates(parseInt(countryId));
        if (field === 'address_country_id') {
          setStates(statesData);
        } else {
          setBirthStates(statesData);
        }
      } catch (error) {
        logger.error('Error loading states', error, 'api');
      }
    } else {
      if (field === 'address_country_id') {
        setStates([]);
      } else {
        setBirthStates([]);
      }
    }
  }, [handlePatientDataChange]);

  const getPatientData = useCallback((field: string) => {
    return patientEditData?.[field as keyof typeof patientEditData] || '';
  }, [patientEditData]);

  // Study handlers (delegated)
  const handleUploadStudyFile = useCallback(async (studyId: string, file: File) => {
    if (selectedPatient) {
      await previousStudiesHook.handleUploadStudyFile(studyId, file, selectedPatient.id);
    }
  }, [selectedPatient, previousStudiesHook]);

  const handleUpdateStudyStatus = useCallback(async (studyId: string, status: string) => {
    if (selectedPatient) {
      await previousStudiesHook.handleUpdateStudyStatus(studyId, status, selectedPatient.id);
    }
  }, [selectedPatient, previousStudiesHook]);

  const handleViewStudyFile = useCallback(async (studyId: string) => {
    await previousStudiesHook.handleViewStudyFile(studyId);
  }, [previousStudiesHook]);

  const handleViewPreviousConsultations = useCallback(() => {
    if (selectedPatient) {
      // Use the new 'name' field which contains the full name
      const patientName = selectedPatient.name || '';
      previousStudiesHook.handleViewPreviousConsultations(selectedPatient.id, patientName);
    }
  }, [selectedPatient, previousStudiesHook]);

  // Diagnosis handlers
  const handleAddPrimaryDiagnosis = useCallback((diagnosis: DiagnosisCatalog) => {
    primaryDiagnosesHook.addDiagnosis(diagnosis);
    setFormData((prev: ConsultationFormData) => {
      const alreadyExists = prev.primary_diagnoses.some(d => d.id === diagnosis.id || d.code === diagnosis.code);
      if (alreadyExists) {
        return prev;
      }
      return {
        ...prev,
        primary_diagnoses: [...prev.primary_diagnoses, diagnosis],
        primary_diagnosis: diagnosis.name
      };
    });
  }, [primaryDiagnosesHook]);

  const handleAddSecondaryDiagnosis = useCallback((diagnosis: DiagnosisCatalog) => {
    secondaryDiagnosesHook.addDiagnosis(diagnosis);
    setFormData((prev: ConsultationFormData) => {
      const alreadyExists = prev.secondary_diagnoses_list.some(d => d.id === diagnosis.id || d.code === diagnosis.code);
      if (alreadyExists) {
        return prev;
      }
      const updatedList = [...prev.secondary_diagnoses_list, diagnosis];
      const allDiagnosesText = updatedList.map(d => d.name).join('; ');
      return {
        ...prev,
        secondary_diagnoses_list: updatedList,
        secondary_diagnoses: allDiagnosesText
      };
    });
  }, [secondaryDiagnosesHook]);

  const handleRemovePrimaryDiagnosis = useCallback((diagnosisId: string) => {
    primaryDiagnosesHook.removeDiagnosis(diagnosisId);
    setFormData(prev => ({
      ...prev,
      primary_diagnoses: prev.primary_diagnoses.filter(d => d.id !== diagnosisId),
      primary_diagnosis: ''
    }));
  }, [primaryDiagnosesHook]);

  const handleRemoveSecondaryDiagnosis = useCallback((diagnosisId: string) => {
    secondaryDiagnosesHook.removeDiagnosis(diagnosisId);
    setFormData(prev => {
      const updatedList = prev.secondary_diagnoses_list.filter(d => d.id !== diagnosisId);
      const remainingDiagnosesText = updatedList.map(d => d.name).join('; ');
      return {
        ...prev,
        secondary_diagnoses_list: updatedList,
        secondary_diagnoses: remainingDiagnosesText
      };
    });
  }, [secondaryDiagnosesHook]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setError(null);

    // Track form validation attempt
    try {
      const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
      trackAmplitudeEvent('consultation_form_validated');
    } catch (error) {
      // Silently fail
    }

    if (!consultation) {
      if (!selectedAppointment) {
        setError('Por favor, selecciona una cita para crear la consulta');
        try {
          const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
          trackAmplitudeEvent('form_validation_error', {
            form_type: 'consultation',
            error_type: 'missing_appointment'
          });
        } catch (error) {
          // Silently fail
        }
        return;
      }
      if (!selectedPatient) {
        setError('Por favor, selecciona un paciente');
        try {
          const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
          trackAmplitudeEvent('form_validation_error', {
            form_type: 'consultation',
            error_type: 'missing_patient'
          });
        } catch (error) {
          // Silently fail
        }
        return;
      }
    } else {
      if (!selectedPatient) {
        setError('Por favor, selecciona un paciente existente');
        try {
          const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
          trackAmplitudeEvent('form_validation_error', {
            form_type: 'consultation',
            error_type: 'missing_patient'
          });
        } catch (error) {
          // Silently fail
        }
        return;
      }
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      try {
        const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
        trackAmplitudeEvent('form_validation_error', {
          form_type: 'consultation',
          error_type: 'missing_chief_complaint'
        });
      } catch (error) {
        // Silently fail
      }
      return;
    }

    const finalPatientId = selectedPatient?.id;
    if (!finalPatientId) {
      setError('No se pudo obtener el ID del paciente');
      return;
    }

    // Determine if this is a first-time consultation
    const isEditingFirstTimeConsultation = consultation && consultation.consultation_type === 'Primera vez';
    const hasFirstTimeAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Primera vez' ||
      selectedAppointment.appointment_type === 'Primera vez' ||
      selectedAppointment.appointment_type === 'primera vez' ||
      selectedAppointment.appointment_type === 'first_visit'
    );
    const isFirstTimeConsultation = isEditingFirstTimeConsultation || hasFirstTimeAppointment;

    // Only require document for first-time consultations
    // For follow-up consultations, document is optional - patient may already have documents saved
    if (isFirstTimeConsultation) {
      if (!personalDocument.document_id || !personalDocument.document_value.trim()) {
        setError('El documento de identificación del paciente es obligatorio para consultas de primera vez');
        return;
      }
    }
    // For follow-up consultations, document is not required - allow submission even without document

    if (patientEditData && selectedPatient) {
      try {
        const { personal_documents: _ignoredPersonalDocs, professional_documents: _ignoredProfessionalDocs, ...patientBaseData } = patientEditData || {};
        const patientDataWithDocument = {
          ...patientBaseData,
          documents: personalDocument.document_id
            ? [{
              document_id: personalDocument.document_id,
              document_value: personalDocument.document_value.trim()
            }]
            : []
        };
        await apiService.patients.updatePatient(selectedPatient.id.toString(), patientDataWithDocument);

        setSelectedPatient(prev => {
          if (!prev) return prev;
          const existingDocuments = Array.isArray(prev.personal_documents) ? [...prev.personal_documents] : [];
          if (personalDocument.document_id) {
            const docIndex = existingDocuments.findIndex((doc: any) => doc.document_id === personalDocument.document_id);
            if (docIndex >= 0) {
              existingDocuments[docIndex] = {
                ...existingDocuments[docIndex],
                document_value: personalDocument.document_value.trim()
              };
            } else {
              existingDocuments.push({
                document_id: personalDocument.document_id,
                document_value: personalDocument.document_value.trim(),
                document_name: personalDocument.document_name || consultation?.patient_document_name
              });
            }
          }
          return {
            ...prev,
            personal_documents: existingDocuments
          };
        });
        setPatientEditData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            personal_documents: personalDocument.document_id
              ? [{
                document_id: personalDocument.document_id,
                document_value: personalDocument.document_value.trim(),
                document_name: personalDocument.document_name || consultation?.patient_document_name
              }]
              : []
          };
        });
      } catch (error) {
        logger.error('Error updating patient data', error, 'api');
        setError('Error al actualizar los datos del paciente');
        return;
      }
    }

    setLoading(true);
    try {
      let consultationType = 'Seguimiento';
      if (!consultation) {
        consultationType = selectedAppointment?.consultation_type || 'Seguimiento';
      } else {
        consultationType = consultation.consultation_type || 'Seguimiento';
      }

      const finalFormData = {
        ...formData,
        patient_id: finalPatientId?.toString() || '',
        patient_document_id: personalDocument.document_id,
        patient_document_value: personalDocument.document_value.trim(),
        consultation_type: consultationType,
        primary_diagnoses: formData.primary_diagnoses,
        secondary_diagnoses_list: formData.secondary_diagnoses_list
      };

      const createdConsultation = await onSubmit(finalFormData);

      if (createdConsultation?.id) {
        setCurrentConsultationId(createdConsultation.id);
      }

      if ((clinicalStudiesHook.studies || []).length > 0 && createdConsultation?.id) {
        const temporaryStudies = (clinicalStudiesHook.studies || []).filter(study =>
          study.id.toString().startsWith('temp_')
        );

        for (const study of temporaryStudies) {
          const studyData = {
            ...study,
            consultation_id: createdConsultation.id,
            patient_id: finalPatientId.toString()
          };
          try {
            await clinicalStudiesHook.createStudy(studyData);
          } catch (error) {
            logger.error('Error saving clinical study', error, 'api');
          }
        }
        clinicalStudiesHook.clearTemporaryStudies();
        await clinicalStudiesHook.fetchStudies(String(createdConsultation.id));
      }

      if (vitalSignsHook.temporaryVitalSigns.length > 0 && createdConsultation?.id) {
        for (const vitalSign of vitalSignsHook.temporaryVitalSigns) {
          try {
            await vitalSignsHook.createVitalSign(String(createdConsultation.id), vitalSign);
          } catch (error) {
            logger.error('Error saving vital sign', error, 'api');
          }
        }
        vitalSignsHook.clearTemporaryVitalSigns();
      }

      if (prescriptionsHook.prescriptions.length > 0 && createdConsultation?.id) {
        for (const prescription of prescriptionsHook.prescriptions) {
          const prescriptionData = {
            medication_id: prescription.medication_id,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            duration: prescription.duration,
            instructions: prescription.instructions,
            quantity: prescription.quantity,
            via_administracion: prescription.via_administracion
          };
          try {
            await prescriptionsHook.createPrescription(prescriptionData, String(createdConsultation.id));
          } catch (error) {
            logger.error('Error saving prescription', error, 'api');
          }
        }
        await prescriptionsHook.fetchPrescriptions(String(createdConsultation.id));
        prescriptionsHook.clearTemporaryPrescriptions();
      }

      if (isEditing) {
        showSuccess('Consulta actualizada exitosamente', '¡Edición completada!');
      } else {
        showSuccess('Consulta creada exitosamente', '¡Creación completada!');
      }

      setTimeout(() => {
        onSuccess?.();
      }, 1000);

    } catch (err: any) {
      logger.error('Error saving consultation', err, 'api');
      setError(err.message || 'Error al guardar consulta');
      showError(err.message || 'Error al guardar consulta', 'Error en la operación');
    } finally {
      setLoading(false);
    }
  }, [
    consultation,
    selectedAppointment,
    selectedPatient,
    formData,
    patientEditData,
    personalDocument,
    onSubmit,
    clinicalStudiesHook,
    vitalSignsHook,
    prescriptionsHook,
    isEditing,
    showSuccess,
    showError,
    onSuccess
  ]);

  // Utility functions
  const shouldShowFirstTimeFields = useCallback((): boolean => {
    const isEditingFirstTimeConsultation = consultation && consultation.consultation_type === 'Primera vez';
    const hasFirstTimeAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Primera vez' ||
      selectedAppointment.appointment_type === 'Primera vez' ||
      selectedAppointment.appointment_type === 'primera vez' ||
      selectedAppointment.appointment_type === 'first_visit'
    );
    return isEditingFirstTimeConsultation || hasFirstTimeAppointment;
  }, [consultation, selectedAppointment]);

  const shouldShowPreviousConsultationsButton = useCallback((): boolean => {
    const isFollowUpAppointment = selectedAppointment && (
      selectedAppointment.consultation_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'Seguimiento' ||
      selectedAppointment.appointment_type === 'seguimiento' ||
      selectedAppointment.appointment_type === 'follow_up' ||
      (selectedAppointment.appointment_type_id && selectedAppointment.appointment_type_id !== 1)
    );

    const isExistingPatientSelected = selectedPatient && selectedPatient.id;

    if (isFollowUpAppointment && isExistingPatientSelected) {
      return true;
    }

    return Boolean(isExistingPatientSelected && previousStudiesHook.patientHasPreviousConsultations);
  }, [selectedAppointment, selectedPatient, previousStudiesHook.patientHasPreviousConsultations]);

  const shouldShowOnlyBasicPatientData = useCallback((): boolean => {
    return !showAdvancedPatientData;
  }, [showAdvancedPatientData]);

  return {
    // Form state
    formData,
    setFormData,
    errors,
    loading,
    error,
    setError,
    currentConsultationId,

    // Patient state
    selectedPatient,
    patientEditData,
    personalDocument,
    setPersonalDocument,
    showAdvancedPatientData,
    setShowAdvancedPatientData,

    // Appointment state
    selectedAppointment,
    appointmentOffice,
    availableAppointments,

    // Catalog data
    countries,
    states,
    birthStates,
    emergencyRelationships,
    appointmentPatients,

    // Previous studies
    patientPreviousStudies: previousStudiesHook.patientPreviousStudies,
    loadingPreviousStudies: previousStudiesHook.loadingPreviousStudies,
    patientHasPreviousConsultations: previousStudiesHook.patientHasPreviousConsultations,

    // Handlers
    handleChange,
    handleDateChange,
    handlePatientChange,
    handleAppointmentChange,
    handleSubmit,

    // Patient data handlers
    handlePatientDataChange,
    handlePatientDataChangeWrapper,
    handleCountryChange,
    getPatientData,

    // Study handlers
    handleUploadStudyFile,
    handleUpdateStudyStatus,
    handleViewStudyFile,
    handleViewPreviousConsultations,

    // Diagnosis handlers
    handleAddPrimaryDiagnosis,
    handleRemovePrimaryDiagnosis,
    handleAddSecondaryDiagnosis,
    handleRemoveSecondaryDiagnosis,

    // Utilities
    shouldShowFirstTimeFields,
    shouldShowPreviousConsultationsButton,
    shouldShowOnlyBasicPatientData,
    isEditing
  };
};


