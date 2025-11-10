// Cache buster: 2024-10-15-05-10
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Box,
  MenuItem,
  Divider,
  FormControl,
  InputLabel,
  Select,
  FormHelperText
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import type { Patient } from '../../types';
import { PrintCertificateButtonPatient } from '../common/PrintCertificateButtonPatient';
import { PrivacyConsentDialog } from './PrivacyConsentDialog';
import { ARCORequestDialog } from './ARCORequestDialog';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { PhoneNumberInput } from '../common/PhoneNumberInput';
import { DocumentSelector } from '../common/DocumentSelector';
import { usePatientForm } from '../../hooks/usePatientForm';
import { preventBackdropClose } from '../../utils/dialogHelpers';

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
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Información Básica
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Nombre Completo"
                name="name"
                value={formData.name}
                onChange={handleChange('name')}
                size="small"
                required
                placeholder="Ingresa el nombre completo (nombre y apellidos)"
                error={!!errors.name}
                helperText={errors.name || 'Ingresa al menos nombre y apellido'}
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
              />

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha de Nacimiento - opcional"
                  value={formData.birth_date ? new Date(formData.birth_date) : null}
                  onChange={(newValue) => {
                    if (newValue) {
                      const formattedDate = newValue.toISOString().split('T')[0];
                      handleChange('birth_date')({ target: { value: formattedDate } } as any);
                    } else {
                      handleChange('birth_date')({ target: { value: '' } } as any);
                    }
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      error: !!errors.birth_date,
                      helperText: errors.birth_date,
                      fullWidth: true
                    }
                  }}
                />
              </LocalizationProvider>
              <FormControl size="small" error={!!errors.gender} fullWidth>
                <InputLabel id="gender-label">Género - obligatorio</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  labelId="gender-label"
                  label="Género - obligatorio"
                  required
                  onChange={handleChange('gender')}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value=""><em>Seleccione</em></MenuItem>
                  <MenuItem value="Masculino">Masculino</MenuItem>
                  <MenuItem value="Femenino">Femenino</MenuItem>
                  <MenuItem value="Otro">Otro</MenuItem>
                </Select>
                {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
              </FormControl>
            </Box>
          </Box>

          {/* Contact Information Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon sx={{ fontSize: 20 }} />
              Información de Contacto
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1' } }}>
                <PhoneNumberInput
                  countryCode={phoneCountryCode}
                  phoneNumber={phoneNumber}
                  onCountryCodeChange={(code) => handlePhoneChange(code, phoneNumber)}
                  onPhoneNumberChange={(number) => handlePhoneChange(phoneCountryCode, number)}
                  label="Número telefónico *"
                  required
                  placeholder="Ej: 222 123 4567"
                  fullWidth
                  error={!!errors.primary_phone}
                  helperText={errors.primary_phone}
                />
              </Box>
              <TextField
                label="Email - opcional"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                size="small"
                placeholder="Email - opcional"
                error={!!errors.email}
                helperText={errors.email}
              />

              <TextField
                label="Dirección - opcional"
                name="home_address"
                value={formData.home_address}
                onChange={handleChange('home_address')}
                size="small"
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
                placeholder="Dirección - opcional"
                error={!!errors.home_address}
                helperText={errors.home_address}
              />

              <TextField
                label="Ciudad - opcional"
                name="address_city"
                value={formData.address_city}
                onChange={handleChange('address_city')}
                size="small"
                placeholder="Ciudad - opcional"
                error={!!errors.address_city}
                helperText={errors.address_city}
              />

              <TextField
                label="Código Postal - opcional"
                name="address_postal_code"
                value={formData.address_postal_code}
                onChange={handleChange('address_postal_code')}
                size="small"
                inputProps={{ maxLength: 5 }}
                placeholder="Código Postal - opcional"
                error={!!errors.address_postal_code}
                helperText={errors.address_postal_code}
              />

              <FormControl size="small" error={!!errors.address_country_id}>
                <InputLabel>País - opcional</InputLabel>
                <Select
                  value={formData.address_country_id}
                  onChange={(e) => handleCountryChange('address_country_id', e.target.value as string)}
                  label="País - opcional"
                >
                  {countries.map((country) => (
                    <MenuItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.address_country_id && <FormHelperText>{errors.address_country_id}</FormHelperText>}
              </FormControl>

              <FormControl size="small" error={!!errors.address_state_id}>
                <InputLabel>Estado - opcional</InputLabel>
                <Select
                  value={formData.address_state_id}
                  onChange={handleChange('address_state_id')}
                  label="Estado - opcional"
                  disabled={!formData.address_country_id}
                >
                  {states.map((state) => (
                    <MenuItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.address_state_id && <FormHelperText>{errors.address_state_id}</FormHelperText>}
              </FormControl>
            </Box>
          </Box>

          {/* Additional Information Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BadgeIcon sx={{ fontSize: 20 }} />
              Información Adicional
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Documentos Personales */}
              {personalDocuments.map((doc, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <DocumentSelector
                      documentType="personal"
                      value={doc}
                      onChange={(docValue) => {
                        const newDocs = [...personalDocuments];
                        newDocs[index] = docValue;
                        setPersonalDocuments(newDocs);
                      }}
                      label="Documento Personal"
                      helperText="Opcional"
                    />
                  </Box>
                  {personalDocuments.length > 1 && (
                    <Button
                      size="small"
                      onClick={() => {
                        const newDocs = personalDocuments.filter((_, i) => i !== index);
                        if (newDocs.length === 0) {
                          setPersonalDocuments([{ document_id: null, document_value: '' }]);
                        } else {
                          setPersonalDocuments(newDocs);
                        }
                      }}
                      sx={{ mt: '32px' }}
                    >
                      Eliminar
                    </Button>
                  )}
                </Box>
              ))}
              
              {/* Botón para agregar más documentos */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setPersonalDocuments([...personalDocuments, { document_id: null, document_value: '' }]);
                }}
              >
                + Agregar otro documento personal
              </Button>
            </Box>
            
            <FormControl size="small" error={!!errors.civil_status} fullWidth sx={{ mt: 2 }}>
              <InputLabel id="civil-status-label">Estado Civil - opcional</InputLabel>
              <Select
                name="civil_status"
                value={formData.civil_status}
                labelId="civil-status-label"
                label="Estado Civil - opcional"
                onChange={handleChange('civil_status')}
              >
                <MenuItem value=""><em>Seleccione</em></MenuItem>
                <MenuItem value="single">Soltero(a)</MenuItem>
                <MenuItem value="married">Casado(a)</MenuItem>
                <MenuItem value="divorced">Divorciado(a)</MenuItem>
                <MenuItem value="widowed">Viudo(a)</MenuItem>
                <MenuItem value="free_union">Unión libre</MenuItem>
              </Select>
              {errors.civil_status && <FormHelperText>{errors.civil_status}</FormHelperText>}
            </FormControl>
          </Box>

          {/* Birth Information Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Información de Nacimiento
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Ciudad de Nacimiento - opcional"
                name="birth_city"
                value={formData.birth_city}
                onChange={handleChange('birth_city')}
                size="small"
                placeholder="Ciudad de Nacimiento - opcional"
                error={!!errors.birth_city}
                helperText={errors.birth_city}
              />

              <FormControl size="small" error={!!errors.birth_country_id}>
                <InputLabel>País de Nacimiento - opcional</InputLabel>
                <Select
                  value={formData.birth_country_id}
                  onChange={(e) => handleCountryChange('birth_country_id', e.target.value as string)}
                  label="País de Nacimiento - opcional"
                >
                  {countries.map((country) => (
                    <MenuItem key={country.id} value={country.id.toString()}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.birth_country_id && <FormHelperText>{errors.birth_country_id}</FormHelperText>}
              </FormControl>

              <FormControl size="small" error={!!errors.birth_state_id}>
                <InputLabel>Estado de Nacimiento - opcional</InputLabel>
                <Select
                  value={formData.birth_state_id}
                  onChange={handleChange('birth_state_id')}
                  label="Estado de Nacimiento - opcional"
                  disabled={!formData.birth_country_id}
                >
                  {birthStates.map((state) => (
                    <MenuItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.birth_state_id && <FormHelperText>{errors.birth_state_id}</FormHelperText>}
              </FormControl>
            </Box>
          </Box>

          {/* Emergency Contact Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon sx={{ fontSize: 20 }} />
              Contacto de Emergencia
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Nombre del Contacto - opcional"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange('emergency_contact_name')}
                size="small"
                placeholder="Nombre del Contacto - opcional"
                error={!!errors.emergency_contact_name}
                helperText={errors.emergency_contact_name}
              />
              <TextField
                label="Teléfono del Contacto - opcional"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange('emergency_contact_phone')}
                size="small"
                placeholder="Teléfono del Contacto - opcional"
                error={!!errors.emergency_contact_phone}
                helperText={errors.emergency_contact_phone}
              />
              <FormControl size="small" error={!!errors.emergency_contact_relationship} fullWidth>
                <InputLabel id="emergency-relationship-label">Relación con el Paciente - opcional</InputLabel>
                <Select
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  labelId="emergency-relationship-label"
                  label="Relación con el Paciente - opcional"
                  onChange={handleChange('emergency_contact_relationship')}
                  sx={{ gridColumn: '1 / -1' }}
                >
                  <MenuItem value=""><em>Seleccione</em></MenuItem>
                  {emergencyRelationships.map((relationship) => (
                    <MenuItem key={relationship.code} value={relationship.code}>
                      {relationship.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.emergency_contact_relationship && <FormHelperText>{errors.emergency_contact_relationship}</FormHelperText>}
              </FormControl>
            </Box>
          </Box>

          {/* Medical Information Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BadgeIcon sx={{ fontSize: 20 }} />
              Información Médica
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Proveedor de Seguro - opcional"
                name="insurance_provider"
                value={formData.insurance_provider}
                onChange={handleChange('insurance_provider')}
                size="small"
                placeholder="Proveedor de Seguro - opcional"
                error={!!errors.insurance_provider}
                helperText={errors.insurance_provider}
              />
              <TextField
                label="Código de Seguro - opcional"
                name="insurance_number"
                value={formData.insurance_number}
                onChange={handleChange('insurance_number')}
                size="small"
                placeholder="Código de Seguro - opcional"
                error={!!errors.insurance_number}
                helperText={errors.insurance_number}
                inputProps={{ 
                  autoComplete: 'new-password',
                  'data-form-type': 'other',
                  'data-lpignore': 'true',
                  'data-1p-ignore': 'true',
                  'data-bwignore': 'true',
                  'data-autofill': 'off',
                  autoCapitalize: 'off',
                  autoCorrect: 'off',
                  spellCheck: false,
                  'name': 'medical_insurance_code',
                  'id': 'medical_insurance_code',
                  'type': 'text',
                  'role': 'textbox',
                  'aria-label': 'Código de seguro médico'
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 2 }}>
        {/* Additional Actions - only show when editing an existing patient */}
        {isEditing && patient && (
          <Box sx={{ width: '100%', borderBottom: '1px solid #e0e0e0', pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Privacy Consent Button */}
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SecurityIcon />}
              onClick={() => setPrivacyConsentDialogOpen(true)}
              size="medium"
              fullWidth
            >
              Consentimiento de Privacidad
            </Button>
            
            {/* ARCO Rights Button */}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<GavelIcon />}
              onClick={() => setArcoRequestDialogOpen(true)}
              size="medium"
              fullWidth
            >
              Derechos ARCO
            </Button>
            
            {/* Generate Certificate Button */}
            {doctorProfile && (
              <PrintCertificateButtonPatient
                patient={{
                  id: patient.id,
                  firstName: patient.first_name || '',
                  lastName: patient.paternal_surname || '',
                  maternalSurname: patient.maternal_surname || '',
                  dateOfBirth: patient.birth_date || '',
                  gender: patient.gender || '',
                  phone: patient.primary_phone || '',
                  email: patient.email || '',
                  address: patient.home_address || '',
                  city: patient.address_city || '',
                  state: patient.state || '',
                  country: patient.country || ''
                }}
                doctor={{
                  id: doctorProfile?.id || 0,
                  firstName: doctorProfile?.first_name || `${doctorProfile?.title || 'Dr.'}`,
                  lastName: doctorProfile?.paternal_surname || 'Usuario',
                  maternalSurname: doctorProfile?.maternal_surname || '',
                  title: doctorProfile?.title || 'Médico',
                  specialty: doctorProfile?.specialty_name || 'No especificada',
                  license: doctorProfile?.professional_license || 'No especificada',
                  university: doctorProfile?.university || 'No especificada',
                  phone: doctorProfile?.office_phone || doctorProfile?.phone || 'No especificado',
                  email: doctorProfile?.email || 'No especificado',
                  address: doctorProfile?.office_address || 'No especificado',
                  city: doctorProfile?.office_city || 'No especificado',
                  state: doctorProfile?.office_state_name || 'No especificado',
                  country: doctorProfile?.office_country_name || 'No especificado'
                }}
                variant="outlined"
                size="medium"
                fullWidth
              />
            )}
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={handleClose} color="inherit" disabled={loading}>
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
