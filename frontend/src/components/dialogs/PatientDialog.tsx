// Cache buster: 2024-10-15-05-10
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Divider,
  DialogContentText
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import type { Patient } from '../../types';
import { PrivacyConsentDialog } from './PrivacyConsentDialog';
import { ARCORequestDialog } from './ARCORequestDialog';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { usePatientForm } from '../../hooks/usePatientForm';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { preventBackdropClose } from '../../utils/dialogHelpers';
import { BasicInformationSection } from '../patient/BasicInformationSection';
import { ContactInformationSection } from '../patient/ContactInformationSection';
import { AdditionalInformationSection } from '../patient/AdditionalInformationSection';
import { BirthInformationSection } from '../patient/BirthInformationSection';
import { EmergencyContactSection } from '../patient/EmergencyContactSection';
import { MedicalInformationSection } from '../patient/MedicalInformationSection';
import { PatientActions } from '../patient/PatientActions';
import { IncompleteProfileChip } from '../patient/IncompleteProfileChip';

interface PatientDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSubmit: (data: any) => Promise<void>;
  doctorProfile?: any;
}

const PatientDialog: React.FC<PatientDialogProps> = ({
  open,
  onClose,
  patient,
  onSubmit,
  doctorProfile
}) => {
  const formHook = usePatientForm({
    open,
    patient,
    onSubmit,
    onClose
  });

  const {
    formData,
    loading,
    error,
    errors,
    phoneCountryCode,
    phoneNumber,
    personalDocuments,
    privacyConsentDialogOpen,
    arcoRequestDialogOpen,
    emergencyRelationships,
    countries,
    states,
    birthStates,
    handleChange,
    handleBlur,
    handleCountryChange,
    handlePhoneChange,
    handleSubmit,
    handleClose,
    setPersonalDocuments,
    setPrivacyConsentDialogOpen,
    setArcoRequestDialogOpen,
    isEditing
  } = formHook;

  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(error);

  // The /api/patients list endpoint returns the patient without the
  // `documents` relation, so the completeness checker keeps flagging CURP as
  // missing even after usePatientForm fetched it. Surface the already-loaded
  // documents (and in-progress gender) here so IncompleteProfileChip agrees
  // with the form fields the user can actually see.
  const patientForChip = React.useMemo(() => {
    if (!patient) return patient;
    return {
      ...patient,
      documents: personalDocuments
        .filter(d => d.document_id && d.document_value?.trim())
        .map(d => ({
          document_id: d.document_id,
          document_value: d.document_value,
          document_name: d.document_name,
          is_active: true,
        })),
      gender: (patient as any).gender || formData.gender || undefined,
    } as typeof patient;
  }, [patient, personalDocuments, formData.gender]);

  // Consider form dirty if the user has typed the patient name or a phone number
  const isDirty = !isEditing && (formData.name.trim() !== '' || phoneNumber.trim() !== '');
  const { confirmDialogOpen, requestClose, confirmClose, cancelClose } = useUnsavedChangesGuard({
    isDirty,
    onConfirmedClose: handleClose
  });

  // Track form opened
  React.useEffect(() => {
    if (open) {
      try {
        const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
        trackAmplitudeEvent('patient_form_opened', {
          is_editing: isEditing
        });
      } catch (error) {
        // Silently fail
      }
    }
  }, [open, isEditing]);

  // Track validation errors
  React.useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      try {
        const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
        trackAmplitudeEvent('form_validation_error', {
          form_type: 'patient',
          error_fields: Object.keys(errors),
          error_count: Object.keys(errors).length
        });
      } catch (error) {
        // Silently fail
      }
    }
  }, [errors]);

  return (
    <>
    <Dialog open={open} onClose={preventBackdropClose(requestClose)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
          </Typography>
          {isEditing && <IncompleteProfileChip patient={patientForChip} />}
        </Box>
        <IconButton aria-label="Cerrar" onClick={requestClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
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
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information Section */}
          <BasicInformationSection
            formData={formData}
            errors={errors}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          {/* Contact Information Section */}
          <ContactInformationSection
            formData={formData}
            phoneCountryCode={phoneCountryCode}
            phoneNumber={phoneNumber}
            errors={errors}
            countries={countries}
            states={states}
            onChange={handleChange}
            onPhoneChange={handlePhoneChange}
            onCountryChange={handleCountryChange}
          />

          {/* Additional Information Section */}
          <AdditionalInformationSection
            formData={formData}
            personalDocuments={personalDocuments}
            errors={errors}
            onChange={handleChange}
            onDocumentsChange={setPersonalDocuments}
          />

          {/* Birth Information Section */}
          <BirthInformationSection
            formData={formData}
            errors={errors}
            countries={countries}
            birthStates={birthStates}
            onChange={handleChange}
            onCountryChange={handleCountryChange}
          />

          {/* Emergency Contact Section */}
          <EmergencyContactSection
            formData={formData}
            errors={errors}
            emergencyRelationships={emergencyRelationships}
            onChange={handleChange}
          />

          {/* Medical Information Section */}
          <MedicalInformationSection
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 2 }}>
        {/* Additional Actions - only show when editing an existing patient */}
        {isEditing && patient && (
          <PatientActions
            patient={patient}
            doctorProfile={doctorProfile}
            formData={formData}
            onPrivacyConsentClick={() => setPrivacyConsentDialogOpen(true)}
            onArcoRequestClick={() => setArcoRequestDialogOpen(true)}
          />
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
          <Button
            onClick={requestClose}
            color="inherit"
            disabled={loading}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Paciente')}
          </Button>
        </Box>
      </DialogActions>

      {/* Privacy Consent Dialog */}
      <PrivacyConsentDialog
        open={privacyConsentDialogOpen}
        onClose={() => setPrivacyConsentDialogOpen(false)}
        patient={patient || null}
      />

      {/* ARCO Request Dialog */}
      <ARCORequestDialog
        open={arcoRequestDialogOpen}
        onClose={() => setArcoRequestDialogOpen(false)}
        patient={patient || null}
      />
    </Dialog>

    {/* Unsaved-changes confirmation */}
    <Dialog open={confirmDialogOpen} onClose={cancelClose} maxWidth="xs" fullWidth>
      <DialogTitle>¿Descartar cambios?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Tienes datos ingresados que no se han guardado. Si cierras ahora se perderán.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancelClose} color="inherit">Seguir editando</Button>
        <Button onClick={confirmClose} color="error" variant="contained">Descartar</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default PatientDialog;
