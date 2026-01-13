import React, { useState, useEffect, useMemo } from 'react';
import { Box, Divider, Card, CardContent, Typography, TextField, Button } from '@mui/material';
import { ShowChart as ShowChartIcon } from '@mui/icons-material';
import VitalSignsSection from '../../common/VitalSignsSection';
import PrescriptionsSection from '../../common/PrescriptionsSection';
import ClinicalStudiesSection from '../../common/ClinicalStudiesSection';
import ScheduleAppointmentSection from '../../common/ScheduleAppointmentSection';
import VitalSignsEvolutionView from '../../views/VitalSignsEvolutionView';
import { ConsultationVitalSign, VitalSign, ConsultationPrescription, ClinicalStudy, Medication } from '../../../types';
import { CreateClinicalStudyData } from '../../../types';
import { TEMP_IDS } from '../../../utils/vitalSignUtils';
import { useVitalSigns } from '../../../hooks/useVitalSigns';

interface ConsultationSectionsProps {
  // Consultation info
  isEditing: boolean;
  consultationId: number | null;
  selectedPatientId: number | null;
  formDataPatientId: string;
  
  // Vital Signs
  vitalSigns: ConsultationVitalSign[];
  availableVitalSigns: VitalSign[];
  vitalSignsLoading: boolean;
  onAddVitalSign: (vitalSignData: { vital_sign_id: number; value: string; unit: string }) => Promise<void>;
  onEditVitalSign: (vitalSign: ConsultationVitalSign, vitalSignData: { vital_sign_id: number; value: string; unit: string }) => void;
  onDeleteVitalSign: (vitalSignId: number) => void;
  
  // Prescriptions
  prescriptions: ConsultationPrescription[];
  prescriptionsLoading: boolean;
  medications: Medication[];
  onAddPrescription: (prescriptionData: any) => Promise<void>;
  onDeletePrescription: (prescriptionId: number) => void;
  onFetchMedications: (search?: string) => Promise<void>;
  onCreateMedication: (name: string) => Promise<Medication>;
  treatmentPlan: string;
  onTreatmentPlanChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  followUpInstructions: string;
  onFollowUpInstructionsChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  
  // Clinical Studies
  studies: ClinicalStudy[];
  studiesLoading: boolean;
  onAddStudy: (studyData: CreateClinicalStudyData) => Promise<void>;
  onDeleteStudy: (studyId: string) => Promise<void>;
  onViewStudyFile: (studyId: number) => void;
  onDownloadStudyFile: (studyId: number) => void;
  doctorName: string;
  
  // Schedule Appointment
  patientId: number;
  doctorProfile: any;
  onAppointmentsChange?: (appointments: any[]) => void;
  initialAppointments?: any[];
}

export const ConsultationSections: React.FC<ConsultationSectionsProps> = ({
  isEditing,
  consultationId,
  selectedPatientId,
  formDataPatientId,
  vitalSigns,
  availableVitalSigns,
  vitalSignsLoading,
  onAddVitalSign,
  onEditVitalSign,
  onDeleteVitalSign,
  prescriptions,
  prescriptionsLoading,
  medications,
  onAddPrescription,
  onDeletePrescription,
  onFetchMedications,
  onCreateMedication,
  treatmentPlan,
  onTreatmentPlanChange,
  followUpInstructions,
  onFollowUpInstructionsChange,
  studies,
  studiesLoading,
  onAddStudy,
  onDeleteStudy,
  onViewStudyFile,
  onDownloadStudyFile,
  doctorName,
  patientId,
  doctorProfile,
  onAppointmentsChange,
  initialAppointments = []
}) => {
  const consultationIdStr = consultationId ? String(consultationId) : TEMP_IDS.CONSULTATION;
  const patientIdStr = selectedPatientId?.toString() || formDataPatientId || TEMP_IDS.PATIENT;
  const [vitalSignsHistory, setVitalSignsHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasPreviousVitalSigns, setHasPreviousVitalSigns] = useState(false);
  const vitalSignsHook = useVitalSigns();
  
  // Use ref to store fetchPatientVitalSignsHistory to break the dependency cycle
  // This prevents infinite re-renders caused by vitalSignsHook changing on every render
  const fetchHistoryRef = React.useRef(vitalSignsHook.fetchPatientVitalSignsHistory);
  fetchHistoryRef.current = vitalSignsHook.fetchPatientVitalSignsHistory;

  // Function to load vital signs history - CRITICAL: removed vitalSignsHook from deps to break cycle
  const loadVitalSignsHistory = React.useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:100',message:'loadVitalSignsHistory called',data:{selectedPatientId,isEditing,consultationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (!selectedPatientId) {
      setHasPreviousVitalSigns(false);
      setVitalSignsHistory(null);
      return;
    }

    try {
      setLoadingHistory(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:109',message:'Fetching vital signs history',data:{selectedPatientId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // Use ref to access the latest fetch function without adding it to dependencies
      const history = await fetchHistoryRef.current(selectedPatientId);
      
      // Check if patient has any vital signs history at all (from previous consultations)
      const hasHistory = history.vital_signs_history && history.vital_signs_history.some((vsHistory: any) => 
        vsHistory.data && vsHistory.data.length > 0
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:118',message:'Vital signs history loaded',data:{hasHistory,vitalSignsHistoryCount:history?.vital_signs_history?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      setHasPreviousVitalSigns(hasHistory);
      setVitalSignsHistory(history);
    } catch (error: any) {
      // Ignore 429 errors (rate limiting) - will retry later
      if (error?.response?.status === 429) {
        console.warn('Rate limited when fetching vital signs history, will retry later');
        return;
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:127',message:'Error loading vital signs history',data:{error:error?.message||'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      // Silently fail - don't show charts if we can't load
      setHasPreviousVitalSigns(false);
      setVitalSignsHistory(null);
    } finally {
      setLoadingHistory(false);
    }
    // CRITICAL: Removed vitalSignsHook from dependencies to break the infinite loop
    // The ref pattern allows us to always use the latest function without re-creating this callback
  }, [selectedPatientId]);

  // Load vital signs history when patient is selected (inline, no button needed)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // Debounce to avoid rapid successive calls
    timeoutId = setTimeout(() => {
      if (isMounted) {
        loadVitalSignsHistory();
      }
    }, 500); // 500ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [selectedPatientId, loadVitalSignsHistory]);

  // Refresh history when vital signs change (add, edit, delete) - but only if we're editing an existing consultation
  // Don't refresh when creating a new consultation to avoid infinite loops
  const prevVitalSignsRef = React.useRef<string>('');
  
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:154',message:'Vital signs refresh effect triggered',data:{selectedPatientId,hasPreviousVitalSigns,isEditing,consultationId,vitalSignsCount:vitalSigns.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!selectedPatientId || !hasPreviousVitalSigns || !isEditing || !consultationId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:158',message:'Vital signs refresh effect early return',data:{reason:'missing_conditions',selectedPatientId:!!selectedPatientId,hasPreviousVitalSigns,isEditing,hasConsultationId:!!consultationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Serialize vitalSigns to compare actual changes
    const vitalSignsKey = JSON.stringify(vitalSigns.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value })));
    
    // Only refresh if vital signs actually changed (not just reference change)
    if (prevVitalSignsRef.current === vitalSignsKey) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:166',message:'Vital signs unchanged, skipping refresh',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    prevVitalSignsRef.current = vitalSignsKey;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:172',message:'Scheduling vital signs history refresh',data:{vitalSignsKey:vitalSignsKey.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Debounce to avoid too many refreshes
    const timeoutId = setTimeout(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConsultationSections.tsx:176',message:'Executing loadVitalSignsHistory',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      loadVitalSignsHistory();
    }, 500); // Increased debounce to 500ms to avoid rapid successive calls

    return () => {
      clearTimeout(timeoutId);
    };
  }, [vitalSigns, selectedPatientId, hasPreviousVitalSigns, isEditing, consultationId, loadVitalSignsHistory]);

  // Memoize vitalSignsHistory based on actual content to prevent unnecessary re-renders
  // Use a stable serialization that sorts data to avoid false positives
  const memoizedVitalSignsHistory = React.useMemo(() => {
    if (!vitalSignsHistory) return null;
    return vitalSignsHistory;
  }, [
    // Only recalculate if the actual content changes (deep comparison with sorted data)
    vitalSignsHistory ? JSON.stringify(
      vitalSignsHistory.vital_signs_history
        ?.sort((a: any, b: any) => a.vital_sign_id - b.vital_sign_id)
        ?.map((vs: any) => ({
          vital_sign_id: vs.vital_sign_id,
          vital_sign_name: vs.vital_sign_name,
          data_length: vs.data?.length || 0,
          data: vs.data
            ?.sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
            ?.map((d: any) => ({ date: d.date, value: d.value, unit: d.unit }))
        }))
    ) : null
  ]);

  // Stable reference for fetchHistory prop - prevents re-renders in VitalSignsEvolutionView
  const stableFetchHistory = React.useCallback((patientId: number) => {
    return fetchHistoryRef.current(patientId);
  }, []);

  return (
    <>
      {/* Vital Signs Section - Always show */}
      <VitalSignsSection
        consultationId={consultationIdStr}
        patientId={selectedPatientId || 0}
        vitalSigns={vitalSigns}
        availableVitalSigns={availableVitalSigns}
        isLoading={vitalSignsLoading}
        onAddVitalSign={onAddVitalSign}
        onEditVitalSign={onEditVitalSign}
        onDeleteVitalSign={onDeleteVitalSign}
      />

      {/* Evolution Charts - Show inline if there are previous vital signs */}
      {hasPreviousVitalSigns && selectedPatientId && memoizedVitalSignsHistory && (
        <Box sx={{ mb: 3 }}>
          <VitalSignsEvolutionView
            patientId={selectedPatientId}
            patientName=""
            onBack={undefined} // No back button needed - inline display
            fetchHistory={stableFetchHistory} // Stable reference using ref
            initialHistory={memoizedVitalSignsHistory} // Pass memoized history to avoid duplicate fetch
            currentVitalSigns={vitalSigns} // Pass current consultation's vital signs
          />
        </Box>
      )}

      {/* Prescribed Medications Section - Inline */}
      <PrescriptionsSection
        consultationId={consultationIdStr}
        prescriptions={prescriptions}
        isLoading={prescriptionsLoading}
        onAddPrescription={onAddPrescription}
        onDeletePrescription={onDeletePrescription}
        medications={medications}
        onFetchMedications={onFetchMedications}
        onCreateMedication={onCreateMedication}
      />

      {/* Treatment Plan directly after prescriptions */}
      <Card sx={{ mb: 3, border: '1px dashed', borderColor: 'grey.300', backgroundColor: '#fafafa' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Plan de Tratamiento
          </Typography>
          <TextField
            name="treatment_plan"
            placeholder="Describa el plan de tratamiento para el paciente..."
            value={treatmentPlan}
            onChange={onTreatmentPlanChange}
            size="small"
            fullWidth
            multiline
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Follow-up Instructions */}
      <Card sx={{ mb: 3, border: '1px dashed', borderColor: 'grey.300', backgroundColor: '#fafafa' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Instrucciones de Seguimiento
          </Typography>
          <TextField
            name="follow_up_instructions"
            placeholder="Indique las instrucciones específicas para el seguimiento del paciente (citas, estudios, recomendaciones)..."
            value={followUpInstructions}
            onChange={onFollowUpInstructionsChange}
            size="small"
            fullWidth
            multiline
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Clinical Studies Section - Always show */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }} />
        
        <ClinicalStudiesSection
          consultationId={consultationIdStr}
          patientId={patientIdStr}
          studies={studies}
          isLoading={studiesLoading}
          onAddStudy={onAddStudy}
          onRemoveStudy={onDeleteStudy}
          onViewFile={(fileUrl: string) => {
            // Find study by fileUrl and call onViewStudyFile with studyId
            const study = studies.find(s => (s as any).file_url === fileUrl || (s as any).file_path === fileUrl);
            if (study && study.id) {
              onViewStudyFile(typeof study.id === 'string' ? parseInt(study.id) : study.id);
            }
          }}
          onDownloadFile={(fileUrl: string, fileName: string) => {
            // Find study by fileUrl and call onDownloadStudyFile with studyId
            const study = studies.find(s => (s as any).file_url === fileUrl || (s as any).file_path === fileUrl);
            if (study && study.id) {
              onDownloadStudyFile(typeof study.id === 'string' ? parseInt(study.id) : study.id);
            }
          }}
          doctorName={doctorName}
        />
      </Box>

      {/* Schedule Follow-up Appointment Section - Inline Form */}
      {(selectedPatientId || patientId) && (
        <ScheduleAppointmentSection
          patientId={selectedPatientId || patientId || 0}
          doctorProfile={doctorProfile}
          onAppointmentsChange={onAppointmentsChange}
          initialAppointments={initialAppointments}
        />
      )}
    </>
  );
};

