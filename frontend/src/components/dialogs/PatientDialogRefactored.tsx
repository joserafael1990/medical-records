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
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon
} from '@mui/icons-material';

import { usePatientDialog } from '../../hooks/usePatientDialog';
import { PersonalInfoSection } from './PatientDialog/PersonalInfoSection';
import { ContactInfoSection } from './PatientDialog/ContactInfoSection';
import { LocationInfoSection } from './PatientDialog/LocationInfoSection';
import { EmergencyContactSection } from './PatientDialog/EmergencyContactSection';
import { MedicalInfoSection } from './PatientDialog/MedicalInfoSection';
import { PrintCertificateButtonPatient } from '../common/PrintCertificateButtonPatient';
import { PrivacyConsentDialog } from './PrivacyConsentDialog';
import { ARCORequestDialog } from './ARCORequestDialog';

interface PatientDialogRefactoredProps {
  open: boolean;
  onClose: () => void;
  patient?: any | null;
  onSubmit: (data: any) => Promise<void>;
  doctorProfile?: any;
}

const PatientDialogRefactored: React.FC<PatientDialogRefactoredProps> = ({
  open,
  onClose,
  patient,
  onSubmit,
  doctorProfile
}) => {
  const {
    formData,
    loading,
    error,
    errors,
    privacyConsentDialogOpen,
    setPrivacyConsentDialogOpen,
    arcoRequestDialogOpen,
    setArcoRequestDialogOpen,
    emergencyRelationships,
    countries,
    states,
    birthStates,
    handleInputChange,
    handleSubmit,
    handleClose,
    errorRef
  } = usePatientDialog({
    patient,
    onSubmit,
    doctorProfile
  });

  const isEditing = !!patient;

  const handleDialogClose = () => {
    handleClose();
    onClose();
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleDialogClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
              </Typography>
            </Box>
            <IconButton onClick={handleDialogClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                ref={errorRef}
                sx={{ mb: 2 }}
              >
                {error}
              </Alert>
            )}

            {/* Personal Information */}
            <PersonalInfoSection
              formData={{
                first_name: formData.first_name,
                paternal_surname: formData.paternal_surname,
                maternal_surname: formData.maternal_surname,
                birth_date: formData.birth_date,
                gender: formData.gender,
                curp: formData.curp,
                rfc: formData.rfc,
                civil_status: formData.civil_status
              }}
              onInputChange={handleInputChange}
              errors={errors}
            />

            <Divider />

            {/* Contact Information */}
            <ContactInfoSection
              formData={{
                email: formData.email,
                primary_phone: formData.primary_phone,
                home_address: formData.home_address,
                address_city: formData.address_city,
                address_postal_code: formData.address_postal_code
              }}
              onInputChange={handleInputChange}
              errors={errors}
            />

            <Divider />

            {/* Location Information */}
            <LocationInfoSection
              formData={{
                address_country_id: formData.address_country_id,
                address_state_id: formData.address_state_id,
                birth_city: formData.birth_city,
                birth_state_id: formData.birth_state_id,
                birth_country_id: formData.birth_country_id
              }}
              onInputChange={handleInputChange}
              countries={countries}
              states={states}
              birthStates={birthStates}
              errors={errors}
            />

            <Divider />

            {/* Emergency Contact */}
            <EmergencyContactSection
              formData={{
                emergency_contact_name: formData.emergency_contact_name,
                emergency_contact_phone: formData.emergency_contact_phone,
                emergency_contact_relationship: formData.emergency_contact_relationship
              }}
              onInputChange={handleInputChange}
              emergencyRelationships={emergencyRelationships}
              errors={errors}
            />

            <Divider />

            {/* Medical Information */}
            <MedicalInfoSection
              formData={{
                chronic_conditions: formData.chronic_conditions,
                current_medications: formData.current_medications,
                medical_history: formData.medical_history,
                insurance_provider: formData.insurance_provider,
                insurance_number: formData.insurance_number
              }}
              onInputChange={handleInputChange}
              errors={errors}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Print Certificate Button (only for existing patients) */}
            {isEditing && patient && (
              <PrintCertificateButtonPatient 
                patient={patient} 
                doctorProfile={doctorProfile}
              />
            )}
            
            {/* Privacy and ARCO buttons */}
            <Button
              variant="outlined"
              onClick={() => setPrivacyConsentDialogOpen(true)}
            >
              Consentimiento
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => setArcoRequestDialogOpen(true)}
            >
              ARCO
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleDialogClose} 
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar Paciente' : 'Crear Paciente')}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Privacy Consent Dialog */}
      <PrivacyConsentDialog
        open={privacyConsentDialogOpen}
        onClose={() => setPrivacyConsentDialogOpen(false)}
        patient={patient}
      />

      {/* ARCO Request Dialog */}
      <ARCORequestDialog
        open={arcoRequestDialogOpen}
        onClose={() => setArcoRequestDialogOpen(false)}
        patient={patient}
      />
    </>
  );
};

export default PatientDialogRefactored;
