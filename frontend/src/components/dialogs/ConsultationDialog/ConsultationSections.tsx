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

  // Function to load vital signs history
  const loadVitalSignsHistory = React.useCallback(async () => {
    if (!selectedPatientId) {
      setHasPreviousVitalSigns(false);
      setVitalSignsHistory(null);
      return;
    }

    try {
      setLoadingHistory(true);
      const history = await vitalSignsHook.fetchPatientVitalSignsHistory(selectedPatientId);
      
      // Check if patient has any vital signs history at all (from previous consultations)
      const hasHistory = history.vital_signs_history && history.vital_signs_history.some((vsHistory: any) => 
        vsHistory.data && vsHistory.data.length > 0
      );
      
      setHasPreviousVitalSigns(hasHistory);
      setVitalSignsHistory(history);
    } catch (error: any) {
      // Ignore 429 errors (rate limiting) - will retry later
      if (error?.response?.status === 429) {
        console.warn('Rate limited when fetching vital signs history, will retry later');
        return;
      }
      // Silently fail - don't show charts if we can't load
      setHasPreviousVitalSigns(false);
      setVitalSignsHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPatientId, vitalSignsHook]);

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

  // Refresh history when vital signs change (add, edit, delete)
  useEffect(() => {
    if (!selectedPatientId || !hasPreviousVitalSigns) {
      return;
    }

    // Debounce to avoid too many refreshes
    const timeoutId = setTimeout(() => {
      loadVitalSignsHistory();
    }, 300); // 300ms debounce for updates

    return () => {
      clearTimeout(timeoutId);
    };
  }, [vitalSigns, selectedPatientId, hasPreviousVitalSigns, loadVitalSignsHistory]);

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
      {hasPreviousVitalSigns && selectedPatientId && vitalSignsHistory && (
        <Box sx={{ mb: 3 }}>
          <VitalSignsEvolutionView
            patientId={selectedPatientId}
            patientName=""
            onBack={undefined} // No back button needed - inline display
            fetchHistory={vitalSignsHook.fetchPatientVitalSignsHistory}
            initialHistory={vitalSignsHistory} // Pass pre-loaded history to avoid duplicate fetch
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

