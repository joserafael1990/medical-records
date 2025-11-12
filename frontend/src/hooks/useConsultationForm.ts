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
  therapeutic_plan: string;
  laboratory_results: string;
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
  
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      patient_document_id: personalDocument.document_id ?? null,
      patient_document_value: personalDocument.document_value || '',
      patient_document_name: personalDocument.document_name
    }));
  }, [personalDocument]);
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

  // Filter appointments
  const availableAppointments = useMemo(() => {
    return (appointments || []).filter((appointment: any) => 
      appointment.status !== 'cancelled' && 
      appointment.status !== 'canceled' &&
      appointment.doctor_id === doctorProfile?.id
    );
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
    if (open && consultation) {
      const consultationId = consultation.id;
      if (!consultationId) return;
      setCurrentConsultationId(consultationId);
      logger.debug('Editing consultation loaded', {
        consultationId,
        patient_document_id: consultation.patient_document_id,
        patient_document_value: consultation.patient_document_value,
        patient_document_name: consultation.patient_document_name
      }, 'ui');
      
      if (loadedConsultationIdRef.current === consultationId) {
        return;
      }
      
      loadedConsultationIdRef.current = consultationId;
      logger.debug('Loading consultation data', { consultationId }, 'system');

      setFormData({
        ...initialFormData,
        patient_id: consultation.patient_id || '',
        patient_document_id: consultation.patient_document_id ?? null,
        patient_document_value: consultation.patient_document_value || '',
        patient_document_name: consultation.patient_document_name,
        date: consultation.date ? consultation.date : getCDMXDateTime(),
        chief_complaint: consultation.chief_complaint || '',
        history_present_illness: consultation.history_present_illness || '',
        family_history: consultation.family_history || '',
        perinatal_history: consultation.perinatal_history || '',
        gynecological_and_obstetric_history: consultation.gynecological_and_obstetric_history || '',
        personal_pathological_history: consultation.personal_pathological_history || '',
        personal_non_pathological_history: consultation.personal_non_pathological_history || '',
        physical_examination: consultation.physical_examination || '',
        primary_diagnosis: consultation.primary_diagnosis || '',
        secondary_diagnoses: consultation.secondary_diagnoses || '',
        treatment_plan: consultation.treatment_plan || '',
        therapeutic_plan: consultation.therapeutic_plan || '',
        laboratory_results: consultation.laboratory_results || '',
        interconsultations: consultation.interconsultations || '',
        doctor_name: consultation.doctor_name || initialFormData.doctor_name,
        doctor_professional_license: consultation.doctor_professional_license || initialFormData.doctor_professional_license,
        doctor_specialty: consultation.doctor_specialty || initialFormData.doctor_specialty,
        primary_diagnoses: consultation.primary_diagnoses || [],
        secondary_diagnoses_list: consultation.secondary_diagnoses_list || [],
      });

      const loadPatientData = async () => {
        if (consultation.patient_id) {
          try {
            const patientData = await apiService.patients.getPatientById(consultation.patient_id);
            setSelectedPatient(patientData);
            setPatientEditData(patientData);
            logger.debug('Patient data for consultation', {
              consultationId,
              personal_documents: patientData.personal_documents
            }, 'ui');
            if (consultation?.patient_document_id) {
              const matchingDocument = (patientData.personal_documents || []).find(
                (doc: any) => doc.document_id === consultation.patient_document_id
              );
              if (matchingDocument) {
                setPersonalDocument(
                  mapPatientDocument(
                    {
                      document_id: matchingDocument.document_id,
                      document_value: matchingDocument.document_value,
                      document_name: matchingDocument.document_name || matchingDocument.document?.name
                    },
                    consultation.patient_document_value || '',
                    consultation.patient_document_name
                  )
                );
              } else {
                setPersonalDocument(
                  mapPatientDocument(
                    {
                      document_id: consultation.patient_document_id,
                      document_value: consultation.patient_document_value,
                      document_name: consultation.patient_document_name
                    },
                    consultation.patient_document_value || '',
                    consultation.patient_document_name
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
            logger.error('Error loading patient data', error, 'api');
          }
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

          if (consultation.primary_diagnosis) {
            if (consultation.primary_diagnoses && Array.isArray(consultation.primary_diagnoses) && consultation.primary_diagnoses.length > 0) {
              primaryDiagnosesHook.clearDiagnoses();
              primaryDiagnosesHook.loadDiagnoses(consultation.primary_diagnoses);
            } else {
              const parsedPrimary = parseDiagnosesFromText(consultation.primary_diagnosis);
              primaryDiagnosesHook.clearDiagnoses();
              primaryDiagnosesHook.loadDiagnoses(parsedPrimary);
            }
          }

          if (consultation.secondary_diagnoses) {
            if (consultation.secondary_diagnoses_list && Array.isArray(consultation.secondary_diagnoses_list) && consultation.secondary_diagnoses_list.length > 0) {
              secondaryDiagnosesHook.clearDiagnoses();
              secondaryDiagnosesHook.loadDiagnoses(consultation.secondary_diagnoses_list);
            } else {
              const parsedSecondary = parseDiagnosesFromText(consultation.secondary_diagnoses);
              secondaryDiagnosesHook.clearDiagnoses();
              secondaryDiagnosesHook.loadDiagnoses(parsedSecondary);
            }
          }
        } catch (error) {
          logger.error('Error loading structured diagnoses', error, 'api');
        }
      };

      loadPatientData();
      loadStructuredDiagnoses();

      logger.debug('Fetching prescriptions for consultation', { consultationId }, 'api');
      clinicalStudiesHook.fetchStudies(String(consultation.id));
      vitalSignsHook.fetchConsultationVitalSigns(String(consultation.id));
      prescriptionsHook.fetchPrescriptions(String(consultation.id));
      
      if (consultation.appointment_id) {
        loadOfficeForConsultation(consultation.appointment_id);
      } else {
        loadDefaultOffice();
      }
    } else if (!open) {
      loadedConsultationIdRef.current = undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultation?.id]);

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
      setFormData(initialFormData);
      setSelectedAppointment(null);
      setSelectedPatient(null);
      setShowAdvancedPatientData(false);

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

  // Load initial catalog data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [countriesData, relationshipsData] = await Promise.all([
          apiService.catalogs.getCountries(),
          apiService.catalogs.getEmergencyRelationships()
        ]);
        setCountries(countriesData);
        setEmergencyRelationships(relationshipsData);
        
        vitalSignsHook.fetchAvailableVitalSigns();

        if (appointments && appointments.length > 0) {
          const patientIds = (appointments || []).map((apt: any) => apt.patient_id).filter((id: any) => id);
          const allPatients = await apiService.patients.getPatients();
          const appointmentPatients = (allPatients || []).filter((patient: any) => 
            patientIds.includes(patient.id)
          );
          setAppointmentPatients(appointmentPatients);
        }
      } catch (error) {
        logger.error('Error loading initial data', error, 'api');
      }
    };

    if (open) {
      loadInitialData();
    }
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

  // Load states when patient data changes
  useEffect(() => {
    const loadStatesForPatient = async () => {
      if (patientEditData) {
        try {
          if (patientEditData.address_country_id) {
            const addressStatesData = await apiService.catalogs.getStates(parseInt(patientEditData.address_country_id));
            setStates(addressStatesData);
          }
          
          if (patientEditData.birth_country_id) {
            const birthStatesData = await apiService.catalogs.getStates(parseInt(patientEditData.birth_country_id));
            setBirthStates(birthStatesData);
          }
        } catch (error) {
          logger.error('Error loading states', error, 'api');
        }
      }
    };

    loadStatesForPatient();
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
      previousStudiesHook.loadPatientPreviousStudies(0).catch(() => {}); // Clear studies
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
      const patientName = `${selectedPatient.first_name} ${selectedPatient.paternal_surname}`.trim();
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
    
    if (!consultation) {
      if (!selectedAppointment) {
        setError('Por favor, selecciona una cita para crear la consulta');
        return;
      }
      if (!selectedPatient) {
        setError('Por favor, selecciona un paciente');
        return;
      }
    } else {
      if (!selectedPatient) {
        setError('Por favor, selecciona un paciente existente');
        return;
      }
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      return;
    }

    const finalPatientId = selectedPatient?.id;
    if (!finalPatientId) {
      setError('No se pudo obtener el ID del paciente');
      return;
    }

    if (!personalDocument.document_id || !personalDocument.document_value.trim()) {
      setError('El documento de identificación del paciente es obligatorio');
      return;
    }

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

