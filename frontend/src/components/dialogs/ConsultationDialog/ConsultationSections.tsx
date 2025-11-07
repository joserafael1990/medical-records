import React from 'react';
import { Box, Divider } from '@mui/material';
import VitalSignsSection from '../../common/VitalSignsSection';
import PrescriptionsSection from '../../common/PrescriptionsSection';
import ClinicalStudiesSection from '../../common/ClinicalStudiesSection';
import ScheduleAppointmentSection from '../../common/ScheduleAppointmentSection';
import { ConsultationVitalSign, VitalSign, Prescription, ClinicalStudy } from '../../../types';
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
  medications: any[];
  onAddPrescription: (prescriptionData: any) => Promise<void>;
  onDeletePrescription: (prescriptionId: number) => void;
  onFetchMedications: () => Promise<void>;
  onCreateMedication: (medicationData: any) => Promise<void>;
  
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
  studies,
  studiesLoading,
  onAddStudy,
  onDeleteStudy,
  onViewStudyFile,
  onDownloadStudyFile,
  doctorName,
  patientId,
  doctorProfile
}) => {
  const consultationIdStr = isEditing && consultationId ? String(consultationId) : TEMP_IDS.CONSULTATION;
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
        />
      )}
    </>
  );
};

