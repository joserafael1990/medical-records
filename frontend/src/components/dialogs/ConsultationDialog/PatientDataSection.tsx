import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { DocumentSelector } from '../../common/DocumentSelector';

interface PatientDataSectionProps {
  // Patient data
  patientEditData: any;
  personalDocument: {
    document_id: number | null;
    document_value: string;
  };
  
  // States
  showAdvancedPatientData: boolean;
  setShowAdvancedPatientData: (show: boolean) => void;
  
  // Data sources
  countries: any[];
  states: any[];
  birthStates: any[];
  emergencyRelationships: any[];
  
  // Handlers
  getPatientData: (field: string) => any;
  handlePatientDataChange: (field: string, value: any) => void;
  handlePatientDataChangeWrapper: (field: string, value: any) => void;
  handleCountryChange: (field: 'address_country_id' | 'birth_country_id', countryId: string) => void;
  setPersonalDocument: (doc: { document_id: number | null; document_value: string }) => void;
  
  // Conditional display
  shouldShowOnlyBasicPatientData: () => boolean;
  shouldShowPreviousConsultationsButton: () => boolean;
  handleViewPreviousConsultations: () => void;
}

export const PatientDataSection: React.FC<PatientDataSectionProps> = ({
  patientEditData,
  personalDocument,
  showAdvancedPatientData,
  setShowAdvancedPatientData,
  countries,
  states,
  birthStates,
  emergencyRelationships,
  getPatientData,
  handlePatientDataChange,
  handlePatientDataChangeWrapper,
  handleCountryChange,
  setPersonalDocument,
  shouldShowOnlyBasicPatientData,
  shouldShowPreviousConsultationsButton,
  handleViewPreviousConsultations
}) => {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon sx={{ fontSize: 20 }} />
        Datos del Paciente (Editable)
      </Typography>
      
      <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
        {/* Basic Patient Information - Always shown */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ fontSize: 20 }} />
            Información Básica
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="Nombre"
              value={getPatientData('first_name')}
              onChange={(e: any) => handlePatientDataChangeWrapper('first_name', e.target.value)}
              size="small"
              required
            />
            <TextField
              label="Apellido Paterno"
              value={getPatientData('paternal_surname')}
              onChange={(e: any) => handlePatientDataChangeWrapper('paternal_surname', e.target.value)}
              size="small"
              required
            />
            <TextField
              label="Apellido Materno"
              value={getPatientData('maternal_surname')}
              onChange={(e: any) => handlePatientDataChangeWrapper('maternal_surname', e.target.value)}
              size="small"
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha de Nacimiento - opcional"
                value={getPatientData('birth_date') ? new Date(getPatientData('birth_date')) : null}
                onChange={(newValue: any) => {
                  const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                  handlePatientDataChangeWrapper('birth_date', dateStr);
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
            <FormControl size="small" fullWidth required>
              <InputLabel>Género *</InputLabel>
              <Select
                value={getPatientData('gender')}
                onChange={(e: any) => handlePatientDataChangeWrapper('gender', e.target.value)}
                label="Género *"
                required
              >
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Femenino">Femenino</MenuItem>
                <MenuItem value="Otro">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Teléfono"
              value={getPatientData('primary_phone')}
              onChange={(e: any) => handlePatientDataChangeWrapper('primary_phone', e.target.value)}
              size="small"
              required
            />
          </Box>
        </Box>

        {/* Show Advanced Data Button and Previous Consultations Button - For existing patients */}
        {!showAdvancedPatientData && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowAdvancedPatientData(true)}
              startIcon={<EditIcon />}
              sx={{ minWidth: 200 }}
            >
              Ver Datos Avanzados
            </Button>
            {shouldShowPreviousConsultationsButton() && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleViewPreviousConsultations}
                startIcon={<HospitalIcon />}
                sx={{ minWidth: 200 }}
              >
                Ver Consultas Previas
              </Button>
            )}
          </Box>
        )}

        {/* Advanced Patient Data - Show when requested or for existing patients */}
        {(!shouldShowOnlyBasicPatientData()) && (
          <>
            <Divider sx={{ my: 3 }} />

            {/* Contact Information Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 20 }} />
                Información de Contacto
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Teléfono"
                  value={patientEditData.primary_phone || ''}
                  onChange={(e: any) => handlePatientDataChange('primary_phone', e.target.value)}
                  size="small"
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  value={patientEditData.email || ''}
                  onChange={(e: any) => handlePatientDataChange('email', e.target.value)}
                  size="small"
                  helperText={patientEditData.email && patientEditData.email !== '' && !patientEditData.email.includes('@') ? 'El email debe tener un formato válido' : ''}
                  error={patientEditData.email && patientEditData.email !== '' && !patientEditData.email.includes('@')}
                />
                <TextField
                  label="Dirección"
                  value={patientEditData.home_address || ''}
                  onChange={(e: any) => handlePatientDataChange('home_address', e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ gridColumn: '1 / -1' }}
                />
                <TextField
                  label="Ciudad"
                  value={patientEditData.address_city || ''}
                  onChange={(e: any) => handlePatientDataChange('address_city', e.target.value)}
                  size="small"
                />
                <TextField
                  label="Código Postal"
                  value={patientEditData.address_postal_code || ''}
                  onChange={(e: any) => handlePatientDataChange('address_postal_code', e.target.value)}
                  size="small"
                  inputProps={{ maxLength: 5 }}
                  helperText="Opcional"
                />
                <FormControl size="small">
                  <InputLabel>País</InputLabel>
                  <Select
                    value={patientEditData.address_country_id || ''}
                    onChange={(e: any) => handleCountryChange('address_country_id', e.target.value as string)}
                    label="País"
                  >
                    {(countries || []).map((country: any) => (
                      <MenuItem key={country.id} value={country.id.toString()}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={patientEditData.address_state_id || ''}
                    onChange={(e: any) => handlePatientDataChange('address_state_id', e.target.value)}
                    label="Estado"
                    disabled={!patientEditData.address_country_id}
                  >
                    {(states || []).map((state: any) => (
                      <MenuItem key={state.id} value={state.id.toString()}>
                        {state.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Additional Information Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BadgeIcon sx={{ fontSize: 20 }} />
                Información Adicional
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* Documento Personal - Solo uno permitido */}
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}>
                  <DocumentSelector
                    documentType="personal"
                    value={personalDocument}
                    onChange={(newValue) => {
                      setPersonalDocument(newValue);
                    }}
                    label="Documento Personal"
                    required={false}
                  />
                </Box>
                <FormControl size="small" fullWidth>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select
                    value={patientEditData.civil_status || ''}
                    onChange={(e: any) => handlePatientDataChange('civil_status', e.target.value)}
                    label="Estado Civil"
                  >
                    <MenuItem value=""><em>Seleccione</em></MenuItem>
                    <MenuItem value="single">Soltero(a)</MenuItem>
                    <MenuItem value="married">Casado(a)</MenuItem>
                    <MenuItem value="divorced">Divorciado(a)</MenuItem>
                    <MenuItem value="widowed">Viudo(a)</MenuItem>
                    <MenuItem value="free_union">Unión libre</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Birth Information Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Información de Nacimiento
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Ciudad de Nacimiento"
                  value={patientEditData.birth_city || ''}
                  onChange={(e: any) => handlePatientDataChange('birth_city', e.target.value)}
                  size="small"
                />
                <FormControl size="small">
                  <InputLabel>País de Nacimiento</InputLabel>
                  <Select
                    value={patientEditData.birth_country_id || ''}
                    onChange={(e: any) => handleCountryChange('birth_country_id', e.target.value as string)}
                    label="País de Nacimiento"
                  >
                    {(countries || []).map((country: any) => (
                      <MenuItem key={country.id} value={country.id.toString()}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Estado de Nacimiento</InputLabel>
                  <Select
                    value={patientEditData.birth_state_id || ''}
                    onChange={(e: any) => handlePatientDataChange('birth_state_id', e.target.value)}
                    label="Estado de Nacimiento"
                    disabled={!patientEditData.birth_country_id}
                  >
                    {(birthStates || []).map((state: any) => (
                      <MenuItem key={state.id} value={state.id.toString()}>
                        {state.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Emergency Contact Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 20 }} />
                Contacto de Emergencia
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Nombre del Contacto"
                  value={patientEditData.emergency_contact_name || ''}
                  onChange={(e: any) => handlePatientDataChange('emergency_contact_name', e.target.value)}
                  size="small"
                />
                <TextField
                  label="Teléfono del Contacto"
                  value={patientEditData.emergency_contact_phone || ''}
                  onChange={(e: any) => handlePatientDataChange('emergency_contact_phone', e.target.value)}
                  size="small"
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Relación con el Paciente</InputLabel>
                  <Select
                    value={patientEditData.emergency_contact_relationship || ''}
                    onChange={(e: any) => handlePatientDataChange('emergency_contact_relationship', e.target.value)}
                    label="Relación con el Paciente"
                    sx={{ gridColumn: '1 / -1' }}
                  >
                    <MenuItem value=""><em>Seleccione</em></MenuItem>
                    {(emergencyRelationships || []).map((relationship: any) => (
                      <MenuItem key={relationship.code} value={relationship.code}>
                        {relationship.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Medical Information Section */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BadgeIcon sx={{ fontSize: 20 }} />
                Información Médica
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Proveedor de Seguro"
                  value={patientEditData.insurance_provider || ''}
                  onChange={(e: any) => handlePatientDataChange('insurance_provider', e.target.value)}
                  size="small"
                />
                <TextField
                  label="Código de Seguro"
                  value={patientEditData.insurance_number || ''}
                  onChange={(e: any) => handlePatientDataChange('insurance_number', e.target.value)}
                  size="small"
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
          </>
        )}
      </Paper>
    </Box>
  );
};


