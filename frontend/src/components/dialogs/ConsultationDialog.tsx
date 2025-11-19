import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { PreviousClinicalStudiesSection } from './ConsultationDialog/PreviousClinicalStudiesSection';
import { ConsultationDateSection } from './ConsultationDialog/ConsultationDateSection';
import { ConsultationDiagnosisSection } from './ConsultationDialog/DiagnosisSection';
import { PrintButtonsSection } from './ConsultationDialog/PrintButtonsSection';
import { VitalSignsDialogs } from './ConsultationDialog/VitalSignsDialogs';
import { ConsultationSections } from './ConsultationDialog/ConsultationSections';
import { PrivacyConsentStatusSection } from './ConsultationDialog/PrivacyConsentStatusSection';
import { useConsultationForm, ConsultationFormData } from '../../hooks/useConsultationForm';
import { apiService } from '../../services';
import { logger } from '../../utils/logger';
import { useDiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';

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
  const [followUpAppointments, setFollowUpAppointments] = useState<any[]>([]);
  const nextAppointmentDate = useMemo(() => {
    if (!followUpAppointments || followUpAppointments.length === 0) {
      return null;
    }
    const withDates = followUpAppointments.filter((appointment) => appointment?.appointment_date);
    if (withDates.length === 0) {
      return null;
    }
    withDates.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    return withDates[0].appointment_date;
  }, [followUpAppointments]);

  const lastFetchedPatientRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      lastFetchedPatientRef.current = null;
      setFollowUpAppointments([]);
    }
  }, [open]);

  // Section hooks
  const clinicalStudiesHook = useClinicalStudies();
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

  useEffect(() => {
    let isMounted = true;

    const loadFollowUpAppointments = async () => {
      if (!open) {
        return;
      }

      const selectedId = formHook.selectedPatient?.id;
      const patientIdFromForm = formHook.formData.patient_id ? parseInt(formHook.formData.patient_id, 10) : null;
      const patientId = selectedId || (!Number.isNaN(patientIdFromForm || NaN) ? patientIdFromForm : null);

      if (!patientId) {
        lastFetchedPatientRef.current = null;
        setFollowUpAppointments(prev => (prev.length > 0 ? [] : prev));
        return;
      }

      if (lastFetchedPatientRef.current === patientId) {
        return;
      }

      lastFetchedPatientRef.current = patientId;

      try {
        const appointmentsByPatient = await apiService.appointments.getAppointmentsByPatient(String(patientId));
        if (!isMounted) {
          return;
        }
        const filteredAppointments = (appointmentsByPatient || []).filter((appointment: any) =>
          appointment && ['confirmada', 'por_confirmar'].includes(appointment.status)
        );
        setFollowUpAppointments(prev => {
          const sameLength = prev.length === filteredAppointments.length;
          const sameItems = sameLength && prev.every((item, index) => item.id === filteredAppointments[index]?.id);
          return sameItems ? prev : filteredAppointments;
        });
      } catch (error: any) {
        if (!isMounted) {
          return;
        }
        if (error?.status === 404 || error?.response?.status === 404) {
          setFollowUpAppointments(prev => (prev.length > 0 ? [] : prev));
          return;
        }
        logger.error('Error fetching follow-up appointments', error, 'api');
        setFollowUpAppointments(prev => (prev.length > 0 ? [] : prev));
      }
    };

    loadFollowUpAppointments();

    return () => {
      isMounted = false;
    };
  }, [open, formHook.selectedPatient?.id, formHook.formData.patient_id]);

  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(formHook.error);

  const handleClose = () => {
    onClose();
  };

  // Clinical studies handlers
  const handleAddStudy = async (studyData: any) => {
    const consultationIdStr = formHook.isEditing && consultation?.id ? String(consultation.id) : TEMP_IDS.CONSULTATION;
    const patientId = formHook.selectedPatient?.id?.toString() || TEMP_IDS.PATIENT;
    const doctorName = doctorProfile?.full_name || `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.first_name || 'Usuario'} ${doctorProfile?.last_name || 'Sistema'}`.trim();
    
    if (consultationIdStr === TEMP_IDS.CONSULTATION) {
      const tempStudy = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        consultation_id: consultationIdStr,
        patient_id: patientId,
        study_type: studyData.study_type,
        study_name: studyData.study_name,
        ordered_date: studyData.ordered_date,
        status: studyData.status || 'ordered',
        urgency: studyData.urgency || 'routine',
        ordering_doctor: doctorName,
        clinical_indication: studyData.clinical_indication || '',
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      clinicalStudiesHook.addTemporaryStudy(tempStudy);
    } else {
      await clinicalStudiesHook.createStudy({
        ...studyData,
        ordering_doctor: doctorName
      });
      await clinicalStudiesHook.fetchStudies(consultationIdStr);
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    try {
      if (studyId.startsWith('temp_')) {
        formHook.setFormData(prev => ({
          ...prev,
          clinical_studies: (prev.clinical_studies || []).filter(study => study.id !== studyId)
        }));
        clinicalStudiesHook.deleteStudy(studyId);
      } else {
        await clinicalStudiesHook.deleteStudy(studyId);
      }
    } catch (error) {
      formHook.setError('Error al eliminar el estudio clínico');
    }
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

      <DialogContent>
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

          {/* Previous Clinical Studies Section */}
          <PreviousClinicalStudiesSection
            selectedPatient={formHook.selectedPatient}
            patientPreviousStudies={formHook.patientPreviousStudies}
            loadingPreviousStudies={formHook.loadingPreviousStudies}
            onUploadStudyFile={(studyId: number, file: File) => formHook.handleUploadStudyFile(studyId.toString(), file)}
            onUpdateStudyStatus={(studyId: number, status: string) => formHook.handleUpdateStudyStatus(studyId.toString(), status)}
            onViewStudyFile={(studyId: number) => formHook.handleViewStudyFile(studyId.toString())}
          />

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
            vitalSigns={vitalSignsHook.getAllVitalSigns() || []}
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
                await vitalSignsHook.fetchConsultationVitalSigns(consultationIdStr);
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
            onAddStudy={handleAddStudy}
            onDeleteStudy={handleDeleteStudy}
            onViewStudyFile={(studyId: number) => clinicalStudiesHook.viewFile(studyId)}
            onDownloadStudyFile={(studyId: number) => clinicalStudiesHook.downloadFile(studyId)}
            doctorName={doctorProfile?.full_name || `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.first_name || 'Usuario'} ${doctorProfile?.last_name || 'Sistema'}`.trim()}
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
