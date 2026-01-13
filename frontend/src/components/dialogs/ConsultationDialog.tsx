import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import { Patient } from '../../types';
import { useClinicalStudies } from '../../hooks/useClinicalStudies';
import { useVitalSigns } from '../../hooks/useVitalSigns';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import { useDiagnosisManagement } from '../../hooks/useDiagnosisManagement';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { TEMP_IDS } from '../../utils/vitalSignUtils';
import { preventBackdropClose } from '../../utils/dialogHelpers';
import { ConsultationFormHeader } from './ConsultationDialog/ConsultationFormHeader';
import { ConsultationActions } from './ConsultationDialog/ConsultationActions';
import { ConsultationFormFields } from './ConsultationDialog/ConsultationFormFields';
import { PatientDataSection } from './ConsultationDialog/PatientDataSection';
import PreviousStudiesSection from './ConsultationDialog/PreviousStudiesSection';
import { ConsultationDateSection } from './ConsultationDialog/ConsultationDateSection';
import { ConsultationDiagnosisSection } from './ConsultationDialog/DiagnosisSection';
import { PrintButtonsSection } from './ConsultationDialog/PrintButtonsSection';
import { VitalSignsDialogs } from './ConsultationDialog/VitalSignsDialogs';
import { ConsultationSections } from './ConsultationDialog/ConsultationSections';
import { PrivacyConsentStatusSection } from './ConsultationDialog/PrivacyConsentStatusSection';
import { useConsultationForm, ConsultationFormData } from '../../hooks/useConsultationForm';
import { useDiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';
import { useClinicalStudiesManager } from '../../hooks/useClinicalStudiesManager';
import { usePreviousStudiesLoader } from '../../hooks/usePreviousStudiesLoader';
import { useFollowUpAppointments } from '../../hooks/useFollowUpAppointments';
import { logger } from '../../utils/logger';

export interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  consultation?: any | null;
  onSubmit: (data: ConsultationFormData) => Promise<any>;
  patients: Patient[];
  doctorProfile?: any;
  onNewPatient?: () => void;
  onNewAppointment?: () => void;
  appointments?: any[];
}

const ConsultationDialog: React.FC<ConsultationDialogProps> = ({
  open,
  onClose,
  consultation,
  onSubmit,
  patients,
  doctorProfile,
  onNewPatient,
  onNewAppointment,
  appointments = []
}: ConsultationDialogProps) => {
  // Follow-up appointments management
  const { followUpAppointments, setFollowUpAppointments, nextAppointmentDate } = useFollowUpAppointments(open);

  // Section hooks
  const clinicalStudiesHook = useClinicalStudies();
  const previousStudiesHook = useClinicalStudies(); // Separate hook for previous studies
  const vitalSignsHook = useVitalSigns();
  const prescriptionsHook = usePrescriptions();
  const primaryDiagnosesHook = useDiagnosisManagement();
  const secondaryDiagnosesHook = useDiagnosisManagement();

  const formHook = useConsultationForm({
    consultation,
    onSubmit,
    doctorProfile,
    patients,
    appointments,
    onSuccess: () => onClose(),
    open,
    primaryDiagnosesHook,
    secondaryDiagnosesHook,
    clinicalStudiesHook,
    vitalSignsHook,
    prescriptionsHook
  });

  // Get diagnosis catalog hook for creating new diagnoses
  const diagnosisCatalog = useDiagnosisCatalog();

  // Clinical studies manager hook
  const clinicalStudiesManager = useClinicalStudiesManager({
    clinicalStudiesHook,
    isEditing: formHook.isEditing,
    consultationId: consultation?.id,
    selectedPatientId: formHook.selectedPatient?.id,
    doctorProfile,
    onError: formHook.setError
  });

  // Previous studies loader hook
  usePreviousStudiesLoader({
    open,
    selectedPatientId: formHook.selectedPatient?.id,
    consultationId: consultation?.id,
    previousStudiesHook
  });

  // Track consultation form opened
  useEffect(() => {
    if (open) {
      try {
        const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
        trackAmplitudeEvent('consultation_form_opened', {
          is_editing: !!consultation
        });
      } catch (error) {
        // Silently fail
      }
    }
  }, [open, consultation]);

  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(formHook.error);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={preventBackdropClose(handleClose)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon color="primary" />
          <Typography variant="h6">
            {formHook.isEditing ? 'Editar Consulta' : 'Nueva Consulta'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto', p: 3 }}>
        {formHook.error && (
          <Box
            ref={errorRef}
            data-testid="error-message"
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'error.main',
              borderRadius: 1,
              backgroundColor: '#d32f2f !important'
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {formHook.error}
            </Typography>
          </Box>
        )}

        <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Appointment Selection - Only show for new consultations */}
          {!consultation && (
            <ConsultationFormHeader
              isEditing={formHook.isEditing}
              onClose={handleClose}
              isNewConsultation={true}
              availableAppointments={formHook.availableAppointments}
              selectedAppointmentId={formHook.formData.appointment_id || ''}
              onAppointmentChange={(appointmentId: string) => {
                const appointment = formHook.availableAppointments.find((apt: any) => apt.id.toString() === appointmentId);
                formHook.handleAppointmentChange(appointment);
              }}
              onNewAppointment={() => {
                onClose();
                if (onNewAppointment) {
                  onNewAppointment();
                }
              }}
            />
          )}

          {/* Patient Data Section */}
          {(() => {
            // Debug: Log patient data state
            if (open && consultation) {
              console.log('🔍 Patient Data Debug:', {
                hasSelectedPatient: !!formHook.selectedPatient,
                hasPatientEditData: !!formHook.patientEditData,
                selectedPatientId: formHook.selectedPatient?.id,
                patientEditDataId: formHook.patientEditData?.id,
                formDataPatientId: formHook.formData.patient_id,
                consultationPatientId: consultation?.patient_id
              });
            }
            return null;
          })()}
          {formHook.selectedPatient && formHook.patientEditData && (
            <PatientDataSection
              patientEditData={formHook.patientEditData}
              personalDocument={formHook.personalDocument}
              showAdvancedPatientData={formHook.showAdvancedPatientData}
              setShowAdvancedPatientData={formHook.setShowAdvancedPatientData}
              countries={formHook.countries}
              states={formHook.states}
              birthStates={formHook.birthStates}
              emergencyRelationships={formHook.emergencyRelationships}
              getPatientData={formHook.getPatientData}
              handlePatientDataChange={formHook.handlePatientDataChange}
              handlePatientDataChangeWrapper={formHook.handlePatientDataChangeWrapper}
              handleCountryChange={formHook.handleCountryChange}
              setPersonalDocument={formHook.setPersonalDocument}
              shouldShowOnlyBasicPatientData={formHook.shouldShowOnlyBasicPatientData}
              shouldShowPreviousConsultationsButton={formHook.shouldShowPreviousConsultationsButton}
              handleViewPreviousConsultations={formHook.handleViewPreviousConsultations}
              shouldShowFirstTimeFields={formHook.shouldShowFirstTimeFields}
            />
          )}

          {/* Date */}
          <ConsultationDateSection
            date={formHook.formData.date}
            onChange={formHook.handleDateChange}
          />

          {/* Privacy Consent Status Section - Show only for first-time consultations */}
          {formHook.selectedPatient && (
            <PrivacyConsentStatusSection
              patientId={formHook.selectedPatient.id || null}
              consultationType={formHook.formData.consultation_type || ''}
              isFirstTime={formHook.shouldShowFirstTimeFields()}
            />
          )}

          {/* Consultation Form Fields */}
          <ConsultationFormFields
            formData={formHook.formData}
            onChange={formHook.handleChange}
            shouldShowFirstTimeFields={formHook.shouldShowFirstTimeFields}
            error={formHook.error}
          />

          {/* Previous Studies Section */}
          {formHook.selectedPatient?.id && (
            <PreviousStudiesSection
              patientId={formHook.selectedPatient.id.toString()}
              studies={previousStudiesHook.studies}
              isLoading={previousStudiesHook.isLoading}
              isFirstTimeConsultation={formHook.shouldShowFirstTimeFields()}
              onAddStudy={async (studyData) => {
                const consultationIdStr = formHook.isEditing && consultation?.id ? String(consultation.id) : null;
                const patientId = formHook.selectedPatient?.id?.toString() || '';
                const doctorName = doctorProfile?.full_name || doctorProfile?.name
                  ? `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.full_name || doctorProfile?.name}`.trim()
                  : 'Dr. Usuario';

                // Create study without consultation_id (or with it if editing existing consultation)
                const studyToCreate: any = {
                  ...studyData,
                  patient_id: patientId,
                  ordering_doctor: doctorName
                };
                // Only include consultation_id if it has a valid value
                if (consultationIdStr && consultationIdStr !== 'null' && consultationIdStr !== '') {
                  studyToCreate.consultation_id = consultationIdStr;
                }
                // Don't include consultation_id at all if it's null/empty

                try {
                  await previousStudiesHook.createStudy(studyToCreate);
                  // Refresh studies
                  await previousStudiesHook.fetchPatientStudies(patientId);
                } catch (error: any) {
                  logger.error('Error creating previous study', error, 'api');
                  throw error; // Re-throw to let PreviousStudiesSection handle it
                }
              }}
              onRemoveStudy={async (studyId: string) => {
                try {
                  await previousStudiesHook.deleteStudy(studyId);
                  // Refresh studies
                  if (formHook.selectedPatient?.id) {
                    await previousStudiesHook.fetchPatientStudies(formHook.selectedPatient.id.toString());
                  }
                } catch (error: any) {
                  logger.error('Error deleting previous study', error, 'api');
                  throw error;
                }
              }}
              onRefreshStudies={async () => {
                // Refresh studies after file upload
                if (formHook.selectedPatient?.id) {
                  await previousStudiesHook.fetchPatientStudies(formHook.selectedPatient.id.toString());
                }
              }}
              doctorName={doctorProfile?.full_name || doctorProfile?.name
                ? `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.full_name || doctorProfile?.name}`.trim()
                : 'Dr. Usuario'}
              consultationId={formHook.isEditing && consultation?.id ? String(consultation.id) : null}
            />
          )}

          {/* Structured Diagnoses */}
          <ConsultationDiagnosisSection
            primaryDiagnoses={primaryDiagnosesHook.diagnoses}
            onAddPrimaryDiagnosis={formHook.handleAddPrimaryDiagnosis}
            onRemovePrimaryDiagnosis={formHook.handleRemovePrimaryDiagnosis}
            onCreatePrimaryDiagnosis={diagnosisCatalog.createDiagnosis}
            primaryDiagnosisText={formHook.formData.primary_diagnosis}
            onPrimaryDiagnosisTextChange={formHook.handleChange}
            secondaryDiagnoses={secondaryDiagnosesHook.diagnoses}
            onAddSecondaryDiagnosis={formHook.handleAddSecondaryDiagnosis}
            onRemoveSecondaryDiagnosis={formHook.handleRemoveSecondaryDiagnosis}
            onCreateSecondaryDiagnosis={diagnosisCatalog.createDiagnosis}
            secondaryDiagnosesText={formHook.formData.secondary_diagnoses}
            onSecondaryDiagnosesTextChange={formHook.handleChange}
            loading={formHook.loading}
            primaryDiagnosesError={primaryDiagnosesHook.error}
            secondaryDiagnosesError={secondaryDiagnosesHook.error}
          />

          {/* Consultation Sections (Vital Signs, Prescriptions, Studies, Schedule) */}
          <ConsultationSections
            isEditing={formHook.isEditing}
            consultationId={formHook.currentConsultationId || consultation?.id || null}
            selectedPatientId={formHook.selectedPatient?.id || null}
            formDataPatientId={formHook.formData.patient_id}
            vitalSigns={React.useMemo(() => {
              const allVitalSigns = vitalSignsHook.allVitalSigns || [];
              console.log('[ConsultationDialog] Passing vitalSigns to ConsultationSections', {
                count: allVitalSigns.length,
                vitalSigns: allVitalSigns.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value })),
                allVitalSignsRef: allVitalSigns
              });
              // Always return a new array reference to ensure React detects changes
              return [...allVitalSigns];
            }, [vitalSignsHook.allVitalSigns])}
            availableVitalSigns={vitalSignsHook.availableVitalSigns || []}
            vitalSignsLoading={vitalSignsHook.isLoading}
            onAddVitalSign={async (vitalSignData) => {
              const resolvedId = formHook.currentConsultationId || consultation?.id;
              const consultationIdStr = resolvedId ? String(resolvedId) : TEMP_IDS.CONSULTATION;

              if (consultationIdStr === TEMP_IDS.CONSULTATION) {
                const vitalSign = vitalSignsHook.availableVitalSigns.find(vs => vs.id === vitalSignData.vital_sign_id);
                if (vitalSign) {
                  vitalSignsHook.addTemporaryVitalSign({
                    ...vitalSignData,
                    vital_sign_name: vitalSign.name
                  });
                }
              } else {
                await vitalSignsHook.createVitalSign(consultationIdStr, vitalSignData);
              }
            }}
            onEditVitalSign={(vitalSign, vitalSignData) => {
              const resolvedId = formHook.currentConsultationId || consultation?.id;
              const consultationIdStr = resolvedId ? String(resolvedId) : TEMP_IDS.CONSULTATION;
              vitalSignsHook.updateVitalSign(consultationIdStr, vitalSign.id, vitalSignData);
            }}
            onDeleteVitalSign={(vitalSignId) => {
              const resolvedId = formHook.currentConsultationId || consultation?.id;
              const consultationIdStr = resolvedId ? String(resolvedId) : TEMP_IDS.CONSULTATION;
              vitalSignsHook.deleteVitalSign(consultationIdStr, vitalSignId);
            }}
            prescriptions={prescriptionsHook.prescriptions}
            prescriptionsLoading={prescriptionsHook.isLoading}
            medications={prescriptionsHook.medications}
            onAddPrescription={async (prescriptionData) => {
              const resolvedId = formHook.currentConsultationId || consultation?.id;
              const consultationIdStr = resolvedId ? String(resolvedId) : TEMP_IDS.CONSULTATION;
              if (consultationIdStr === TEMP_IDS.CONSULTATION) {
                prescriptionsHook.addTemporaryPrescription(prescriptionData);
              } else {
                await prescriptionsHook.createPrescription(prescriptionData, consultationIdStr);
                await prescriptionsHook.fetchPrescriptions(consultationIdStr);
              }
            }}
            onDeletePrescription={(prescriptionId) => {
              const resolvedId = formHook.currentConsultationId || consultation?.id;
              if (resolvedId) {
                prescriptionsHook.deletePrescription(prescriptionId, String(resolvedId));
              } else {
                prescriptionsHook.deletePrescription(prescriptionId, "temp_consultation");
              }
            }}
            onFetchMedications={prescriptionsHook.fetchMedications}
            onCreateMedication={prescriptionsHook.createMedication}
            treatmentPlan={formHook.formData.treatment_plan}
            onTreatmentPlanChange={formHook.handleChange}
            followUpInstructions={formHook.formData.follow_up_instructions || ''}
            onFollowUpInstructionsChange={formHook.handleChange}
            studies={clinicalStudiesHook.studies}
            studiesLoading={clinicalStudiesHook.isLoading}
            onAddStudy={clinicalStudiesManager.handleAddStudy}
            onDeleteStudy={clinicalStudiesManager.handleDeleteStudy}
            onViewStudyFile={(studyId: number) => {
              const study = clinicalStudiesHook.studies.find(s => String(s.id) === String(studyId));
              if (study && (study as any).file_url) {
                clinicalStudiesHook.viewFile((study as any).file_url);
              }
            }}
            onDownloadStudyFile={(studyId: number) => {
              const study = clinicalStudiesHook.studies.find(s => String(s.id) === String(studyId));
              if (study && (study as any).file_url) {
                clinicalStudiesHook.downloadFile((study as any).file_url, (study as any).study_name || 'estudio');
              }
            }}
            doctorName={doctorProfile?.full_name || doctorProfile?.name
              ? `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.full_name || doctorProfile?.name}`.trim()
              : 'Dr. Usuario'}
            patientId={formHook.selectedPatient?.id || parseInt(formHook.formData.patient_id) || 0}
            doctorProfile={doctorProfile}
            onAppointmentsChange={setFollowUpAppointments}
            initialAppointments={followUpAppointments}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 2 }}>
        {/* Print buttons */}
        <PrintButtonsSection
          show={((prescriptionsHook.prescriptions && prescriptionsHook.prescriptions.length > 0) ||
            (clinicalStudiesHook.studies && clinicalStudiesHook.studies.length > 0))}
          selectedPatient={formHook.selectedPatient}
          doctorProfile={doctorProfile}
          appointmentOffice={formHook.appointmentOffice}
          consultation={consultation}
          consultationId={formHook.currentConsultationId || consultation?.id || null}
          formData={formHook.formData}
          personalDocument={formHook.personalDocument}
          prescriptions={prescriptionsHook.prescriptions || []}
          studies={clinicalStudiesHook.studies || []}
          vitalSigns={vitalSignsHook.getAllVitalSigns()}
          nextAppointmentDate={nextAppointmentDate}
        />

        {/* Action buttons */}
        <ConsultationActions
          onClose={handleClose}
          onSubmit={formHook.handleSubmit}
          loading={formHook.loading}
          isEditing={formHook.isEditing}
        />
      </DialogActions>

      {/* Vital Signs Dialogs */}
      <VitalSignsDialogs
        vitalSignsHook={vitalSignsHook}
        isEditing={formHook.isEditing}
        consultationId={consultation?.id ? String(consultation.id) : null}
      />
    </Dialog>
  );
};

export default ConsultationDialog;
