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
  Divider
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
import { preventBackdropClose } from '../../utils/dialogHelpers';
import { BasicInformationSection } from '../patient/BasicInformationSection';
import { ContactInformationSection } from '../patient/ContactInformationSection';
import { AdditionalInformationSection } from '../patient/AdditionalInformationSection';
import { BirthInformationSection } from '../patient/BirthInformationSection';
import { EmergencyContactSection } from '../patient/EmergencyContactSection';
import { MedicalInformationSection } from '../patient/MedicalInformationSection';
import { PatientActions } from '../patient/PatientActions';

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
    <Dialog open={open} onClose={preventBackdropClose(handleClose)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
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
            onClick={handleClose} 
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
  );
};

export default PatientDialog;
