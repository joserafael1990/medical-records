import React from 'react';
import { Box, Divider, Card, CardContent, Typography, TextField } from '@mui/material';
import VitalSignsSection from '../../common/VitalSignsSection';
import PrescriptionsSection from '../../common/PrescriptionsSection';
import ClinicalStudiesSection from '../../common/ClinicalStudiesSection';
import ScheduleAppointmentSection from '../../common/ScheduleAppointmentSection';
import { ConsultationVitalSign, VitalSign, Prescription, ClinicalStudy, Medication } from '../../../types';
import { CreateClinicalStudyData } from '../../../types';
import { TEMP_IDS } from '../../../utils/vitalSignUtils';

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
  prescriptions: Prescription[];
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
          onViewFile={onViewStudyFile}
          onDownloadFile={onDownloadStudyFile}
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

