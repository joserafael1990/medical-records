
// Cache buster: 2024-10-15-05-10
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
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
import type { Patient, PatientFormData } from '../../types';
import { apiService } from '../../services/api';
import { useToast } from '../common/ToastNotification';
import { disablePaymentDetection } from '../../utils/disablePaymentDetection';
import { PrintCertificateButtonPatient } from '../common/PrintCertificateButtonPatient';
import { PrivacyConsentDialog } from './PrivacyConsentDialog';
import { ARCORequestDialog } from './ARCORequestDialog';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';

interface EmergencyRelationship {
  code: string;
  name: string;
}

interface PatientDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSubmit: (data: PatientFormData) => Promise<void>;
  doctorProfile?: any;
}

const PatientDialog: React.FC<PatientDialogProps> = ({
  open,
  onClose,
  patient,
  onSubmit,
  doctorProfile
}) => {
  const isEditing = !!patient;
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    date_of_birth: '',
    gender: '',
    email: '',
    primary_phone: '',
    phone: '',
    home_address: '',
    curp: '',
    rfc: '',
    civil_status: '',
    address_city: '',
    city: '',
    address_state_id: '',
    state: '',
    address_postal_code: '',
    zip_code: '',
    address_country_id: '',
    country: '',
    birth_city: '',
    birth_state_id: '',
    birth_country_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_history: '',
    insurance_provider: '',
    insurance_number: '',
    active: true,
    is_active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [privacyConsentDialogOpen, setPrivacyConsentDialogOpen] = useState(false);
  const [arcoRequestDialogOpen, setArcoRequestDialogOpen] = useState(false);
  
  // Auto-scroll to error when it appears
  const { errorRef } = useScrollToErrorInDialog(error);
  const [emergencyRelationships, setEmergencyRelationships] = useState<EmergencyRelationship[]>([]);
  const [countries, setCountries] = useState<Array<{id: number, name: string}>>([]);
  const [states, setStates] = useState<Array<{id: number, name: string}>>([]);
  const [birthStates, setBirthStates] = useState<Array<{id: number, name: string}>>([]);

  // Load emergency relationships, countries and states when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        // Disable payment detection for insurance fields
        setTimeout(() => {
          disablePaymentDetection();
        }, 100);
        try {
          const [relationships, countriesData] = await Promise.all([
            apiService.getEmergencyRelationships(),
            apiService.getCountries()
          ]);
          console.log('🌍 Countries loaded:', countriesData);
          setEmergencyRelationships(relationships);
          setCountries(countriesData);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };
    loadData();
  }, [open]);

  // Load states when formData has country IDs
  useEffect(() => {
    const loadStatesForCountries = async () => {
      try {
        // Load states for address country
        if (formData.address_country_id) {
          const addressStatesData = await apiService.getStates(parseInt(formData.address_country_id));
          setStates(addressStatesData);
        }
        
        // Load states for birth country
        if (formData.birth_country_id) {
          const birthStatesData = await apiService.getStates(parseInt(formData.birth_country_id));
          setBirthStates(birthStatesData);
        }
      } catch (error) {
        console.error('Error loading states for countries:', error);
      }
    };

    if (formData.address_country_id || formData.birth_country_id) {
      loadStatesForCountries();
    }
  }, [formData.address_country_id, formData.birth_country_id]);

  useEffect(() => {
    const loadPatientData = async () => {
      if (patient && open) {
        try {
          // Get decrypted patient data from API
          const decryptedPatient = await apiService.getPatient(patient.id.toString());
          setFormData({
            first_name: decryptedPatient.first_name || '',
            paternal_surname: decryptedPatient.paternal_surname || '',
            maternal_surname: decryptedPatient.maternal_surname || '',
            birth_date: decryptedPatient.birth_date || '',
            date_of_birth: decryptedPatient.birth_date || '',
            gender: decryptedPatient.gender || '',
            email: decryptedPatient.email || '',
            primary_phone: decryptedPatient.primary_phone || '',
            phone: decryptedPatient.primary_phone || '',
            home_address: decryptedPatient.home_address || '',
            curp: decryptedPatient.curp || '',
            rfc: decryptedPatient.rfc || '',
            civil_status: decryptedPatient.civil_status || '',
            address_city: decryptedPatient.address_city || '',
            city: decryptedPatient.address_city || '',
            address_state_id: decryptedPatient.address_state_id?.toString() || '',
            state: '',
            address_postal_code: decryptedPatient.address_postal_code || '',
            zip_code: decryptedPatient.address_postal_code || '',
            address_country_id: decryptedPatient.address_country_id?.toString() || '',
            country: '',
            birth_city: decryptedPatient.birth_city || '',
            birth_state_id: decryptedPatient.birth_state_id?.toString() || '',
            birth_country_id: decryptedPatient.birth_country_id?.toString() || '',
            emergency_contact_name: decryptedPatient.emergency_contact_name || '',
            emergency_contact_phone: decryptedPatient.emergency_contact_phone || '',
            emergency_contact_relationship: decryptedPatient.emergency_contact_relationship || '',
            medical_history: '',
            insurance_provider: decryptedPatient.insurance_provider || '',
            insurance_number: decryptedPatient.insurance_number || '',
            active: true,
            is_active: true
          });
        } catch (error) {
          console.error('Error loading decrypted patient data:', error);
          // Fallback to encrypted data if API call fails
          setFormData({
            first_name: patient.first_name || '',
            paternal_surname: patient.paternal_surname || '',
            maternal_surname: patient.maternal_surname || '',
            birth_date: patient.birth_date || '',
            date_of_birth: patient.birth_date || '',
            gender: patient.gender || '',
            email: patient.email || '',
            primary_phone: patient.primary_phone || '',
            phone: patient.primary_phone || '',
            home_address: patient.home_address || '',
            curp: patient.curp || '',
            rfc: patient.rfc || '',
            civil_status: patient.civil_status || '',
            address_city: patient.address_city || '',
            city: patient.address_city || '',
            address_state_id: patient.address_state_id?.toString() || '',
            state: '',
            address_postal_code: patient.address_postal_code || '',
            zip_code: patient.address_postal_code || '',
            address_country_id: patient.address_country_id?.toString() || '',
            country: '',
            birth_city: patient.birth_city || '',
            birth_state_id: patient.birth_state_id?.toString() || '',
            birth_country_id: patient.birth_country_id?.toString() || '',
            emergency_contact_name: patient.emergency_contact_name || '',
            emergency_contact_phone: patient.emergency_contact_phone || '',
            emergency_contact_relationship: patient.emergency_contact_relationship || '',
            medical_history: '',
            insurance_provider: patient.insurance_provider || '',
            insurance_number: patient.insurance_number || '',
            active: true,
            is_active: true
          });
        }
      } else if (!open) {
        // Reset form when dialog closes
        setFormData({
          first_name: '',
          paternal_surname: '',
          maternal_surname: '',
          birth_date: '',
          date_of_birth: '',
          gender: '',
          email: '',
          primary_phone: '',
          phone: '',
          home_address: '',
          curp: '',
          rfc: '',
          civil_status: '',
          address_city: '',
          city: '',
          address_state_id: '',
          state: '',
          address_postal_code: '',
          zip_code: '',
          address_country_id: '',
          country: '',
          birth_city: '',
          birth_state_id: '',
          birth_country_id: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          medical_history: '',
          insurance_provider: '',
          insurance_number: '',
          active: true,
          is_active: true
        });
        setError('');
      }
    };

    loadPatientData();
  }, [patient, open]);

  const handleChange = (field: keyof PatientFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for gender
    if (field === 'gender') {
      if (!value || value.trim() === '') {
        setErrors(prev => ({ ...prev, gender: 'El género es obligatorio' }));
      } else {
        setErrors(prev => ({ ...prev, gender: '' }));
      }
    }
    
    // Real-time validation for phone
    if (field === 'primary_phone') {
      if (!value || value.trim() === '') {
        setErrors(prev => ({ ...prev, primary_phone: 'El teléfono es obligatorio' }));
      } else {
        setErrors(prev => ({ ...prev, primary_phone: '' }));
      }
    }
  };

  const handleCountryChange = async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    setFormData(prev => ({ ...prev, [field]: countryId }));
    
    // Load states for selected country
    if (countryId) {
      try {
        const statesData = await apiService.getStates(parseInt(countryId));
        if (field === 'address_country_id') {
          setStates(statesData);
        } else {
          setBirthStates(statesData);
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    }
    
    // Clear related fields when country changes
    if (field === 'address_country_id') {
      setFormData(prev => ({ ...prev, address_state_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, birth_state_id: '' }));
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    // Basic validation
    if (!formData.first_name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!formData.paternal_surname.trim()) {
      setError('El apellido paterno es requerido');
      return;
    }
    if (!formData.gender || formData.gender.trim() === '') {
      setError('El género es obligatorio');
      return;
    }
    if (!formData.primary_phone || formData.primary_phone.trim() === '') {
      setError('El teléfono es obligatorio');
      return;
    }
    // Birth date is optional - no validation needed
    setLoading(true);
    try {
      await onSubmit(formData);
      
      // Mostrar notificación de éxito según el tipo de operación
      if (isEditing) {
        showSuccess(
          'Paciente actualizado exitosamente',
          '¡Edición completada!'
        );
      } else {
        showSuccess(
          'Paciente creado exitosamente',
          '¡Creación completada!'
        );
      }
      
      // Cerrar el diálogo después de un breve delay para que el usuario vea la notificación
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || 'Error al guardar paciente');
      showError(
        err.message || 'Error al guardar paciente',
        'Error en la operación'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
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
              backgroundColor: '#d32f2f !important' // Force red background
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
                label="Nombre - obligatorio"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange('first_name')}
                size="small"
                required
                placeholder="Nombre - obligatorio"
                error={!!errors.first_name}
                helperText={errors.first_name}
              />
              <TextField
                label="Apellido Paterno - obligatorio"
                name="paternal_surname"
                value={formData.paternal_surname}
                onChange={handleChange('paternal_surname')}
                size="small"
                required
                placeholder="Apellido Paterno - obligatorio"
                error={!!errors.paternal_surname}
                helperText={errors.paternal_surname}
              />
              <TextField
                label="Apellido Materno - opcional"
                name="maternal_surname"
                value={formData.maternal_surname}
                onChange={handleChange('maternal_surname')}
                size="small"
                placeholder="Apellido Materno - opcional"
                error={!!errors.maternal_surname}
                helperText={errors.maternal_surname}
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

              <TextField
                label="Teléfono - obligatorio"
                name="primary_phone"
                value={formData.primary_phone}
                onChange={handleChange('primary_phone')}
                size="small"
                required
                placeholder="Teléfono - obligatorio"
                error={!!errors.primary_phone}
                helperText={errors.primary_phone}
              />
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
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>

              <TextField
                label="CURP - opcional"
                name="curp"
                value={formData.curp}
                onChange={handleChange('curp')}
                size="small"
                inputProps={{ maxLength: 18 }}
                placeholder="CURP - opcional"
                error={!!errors.curp}
                helperText={errors.curp}
              />
              <TextField
                label="RFC - opcional"
                name="rfc"
                value={formData.rfc}
                onChange={handleChange('rfc')}
                size="small"
                inputProps={{ maxLength: 13 }}
                placeholder="RFC - opcional"
                error={!!errors.rfc}
                helperText={errors.rfc}
              />
              <FormControl size="small" error={!!errors.civil_status} fullWidth>
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
                  'autocapitalize': 'off',
                  'autocorrect': 'off',
                  'spellcheck': 'false',
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
