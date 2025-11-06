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
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { DocumentSelector } from '../../common/DocumentSelector';

export interface InlinePatientCreationProps {
  newPatientData: {
    first_name: string;
    paternal_surname: string;
    maternal_surname: string;
    birth_date: string;
    gender: string;
    primary_phone: string;
    email: string;
    home_address: string;
    address_city: string;
    address_postal_code: string;
    address_country_id: string;
    address_state_id: string;
    civil_status: string;
    birth_city: string;
    birth_country_id: string;
    birth_state_id: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: string;
    insurance_provider: string;
    insurance_number: string;
  };
  personalDocument: { document_id: number | null; document_value: string };
  countries: any[];
  states: any[];
  birthStates: any[];
  emergencyRelationships: any[];
  showAdvancedPatientData: boolean;
  isReadOnly: boolean;
  patientsCount: number;
  onFieldChange: (field: string, value: string) => void;
  onCountryChange: (field: 'address_country_id' | 'birth_country_id', countryId: string) => Promise<void>;
  onPersonalDocumentChange: (doc: { document_id: number | null; document_value: string }) => void;
  onShowAdvancedData: () => void;
  getFieldError: (field: string) => string;
  hasFieldError: (field: string) => boolean;
}

export const InlinePatientCreation: React.FC<InlinePatientCreationProps> = ({
  newPatientData,
  personalDocument,
  countries,
  states,
  birthStates,
  emergencyRelationships,
  showAdvancedPatientData,
  isReadOnly,
  patientsCount,
  onFieldChange,
  onCountryChange,
  onPersonalDocumentChange,
  onShowAdvancedData,
  getFieldError,
  hasFieldError
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {patientsCount === 0 ? 'Crear nuevo paciente:' : 'O complete los datos para crear un nuevo paciente:'}
        </Typography>
      </Divider>
      
      <Box sx={{ bgcolor: 'primary.50', p: 3, borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
        <Typography variant="body2" color="primary.main" sx={{ mb: 2, fontWeight: 500 }}>
          📝 Complete los datos básicos del nuevo paciente
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Nombre(s)"
            value={newPatientData.first_name}
            onChange={(e) => onFieldChange('first_name', e.target.value)}
            size="small"
            required
            disabled={isReadOnly}
            placeholder="Nombre(s) - obligatorio"
            error={hasFieldError('newPatient.first_name')}
            helperText={getFieldError('newPatient.first_name')}
          />
          <TextField
            label="Apellido Paterno"
            value={newPatientData.paternal_surname}
            onChange={(e) => onFieldChange('paternal_surname', e.target.value)}
            size="small"
            required
            disabled={isReadOnly}
            placeholder="Apellido Paterno - obligatorio"
            error={hasFieldError('newPatient.paternal_surname')}
            helperText={getFieldError('newPatient.paternal_surname')}
          />
          <TextField
            label="Apellido Materno"
            value={newPatientData.maternal_surname}
            onChange={(e) => onFieldChange('maternal_surname', e.target.value)}
            size="small"
            disabled={isReadOnly}
            placeholder="Apellido Materno - opcional"
          />
          <TextField
            label="Teléfono"
            value={newPatientData.primary_phone}
            onChange={(e) => onFieldChange('primary_phone', e.target.value)}
            size="small"
            required
            disabled={isReadOnly}
            placeholder="Teléfono - obligatorio"
            error={hasFieldError('newPatient.primary_phone')}
            helperText={getFieldError('newPatient.primary_phone')}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DatePicker
              label="Fecha de Nacimiento - opcional"
              value={newPatientData.birth_date ? new Date(newPatientData.birth_date) : null}
              onChange={(newValue) => {
                const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                onFieldChange('birth_date', dateStr);
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  placeholder: 'Fecha de Nacimiento - opcional',
                  disabled: isReadOnly
                }
              }}
            />
          </LocalizationProvider>
          <FormControl size="small" fullWidth required>
            <InputLabel>Género *</InputLabel>
            <Select
              value={newPatientData.gender || ''}
              onChange={(e) => onFieldChange('gender', e.target.value)}
              label="Género *"
              required
              disabled={isReadOnly}
            >
              <MenuItem value="Masculino">Masculino</MenuItem>
              <MenuItem value="Femenino">Femenino</MenuItem>
              <MenuItem value="Otro">Otro</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Show Advanced Data Button */}
        {!showAdvancedPatientData && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={onShowAdvancedData}
              startIcon={<EditIcon />}
              sx={{ minWidth: 200 }}
              disabled={isReadOnly}
            >
              Ver Datos Avanzados
            </Button>
          </Box>
        )}

        {/* Advanced Patient Data - Show when requested */}
        {showAdvancedPatientData && (
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
                  value={newPatientData.primary_phone || ''}
                  onChange={(e) => onFieldChange('primary_phone', e.target.value)}
                  size="small"
                  required
                  disabled={isReadOnly}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={newPatientData.email || ''}
                  onChange={(e) => onFieldChange('email', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                  helperText={newPatientData.email && newPatientData.email !== '' && !newPatientData.email.includes('@') ? 'El email debe tener un formato válido' : ''}
                  error={newPatientData.email && newPatientData.email !== '' && !newPatientData.email.includes('@')}
                />
                <TextField
                  label="Dirección"
                  value={newPatientData.home_address || ''}
                  onChange={(e) => onFieldChange('home_address', e.target.value)}
                  size="small"
                  fullWidth
                  disabled={isReadOnly}
                  sx={{ gridColumn: '1 / -1' }}
                />
                <TextField
                  label="Ciudad"
                  value={newPatientData.address_city || ''}
                  onChange={(e) => onFieldChange('address_city', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                />
                <TextField
                  label="Código Postal"
                  value={newPatientData.address_postal_code || ''}
                  onChange={(e) => onFieldChange('address_postal_code', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                  inputProps={{ maxLength: 5 }}
                  helperText="Opcional"
                />
                <FormControl size="small">
                  <InputLabel>País</InputLabel>
                  <Select
                    value={newPatientData.address_country_id || ''}
                    onChange={(e) => onCountryChange('address_country_id', e.target.value as string)}
                    label="País"
                    disabled={isReadOnly}
                  >
                    {(countries || []).map((country) => (
                      <MenuItem key={country.id} value={country.id.toString()}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={newPatientData.address_state_id || ''}
                    onChange={(e) => onFieldChange('address_state_id', e.target.value)}
                    label="Estado"
                    disabled={!newPatientData.address_country_id || isReadOnly}
                  >
                    {(states || []).map((state) => (
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
                    onChange={onPersonalDocumentChange}
                    label="Documento Personal"
                    required={false}
                  />
                </Box>
                <FormControl size="small" fullWidth>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select
                    value={newPatientData.civil_status || ''}
                    onChange={(e) => onFieldChange('civil_status', e.target.value)}
                    label="Estado Civil"
                    disabled={isReadOnly}
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
                  value={newPatientData.birth_city || ''}
                  onChange={(e) => onFieldChange('birth_city', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                />
                <FormControl size="small">
                  <InputLabel>País de Nacimiento</InputLabel>
                  <Select
                    value={newPatientData.birth_country_id || ''}
                    onChange={(e) => onCountryChange('birth_country_id', e.target.value as string)}
                    label="País de Nacimiento"
                    disabled={isReadOnly}
                  >
                    {(countries || []).map((country) => (
                      <MenuItem key={country.id} value={country.id.toString()}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Estado de Nacimiento</InputLabel>
                  <Select
                    value={newPatientData.birth_state_id || ''}
                    onChange={(e) => onFieldChange('birth_state_id', e.target.value)}
                    label="Estado de Nacimiento"
                    disabled={!newPatientData.birth_country_id || isReadOnly}
                  >
                    {(birthStates || []).map((state) => (
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
                  value={newPatientData.emergency_contact_name || ''}
                  onChange={(e) => onFieldChange('emergency_contact_name', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                />
                <TextField
                  label="Teléfono del Contacto"
                  value={newPatientData.emergency_contact_phone || ''}
                  onChange={(e) => onFieldChange('emergency_contact_phone', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Relación con el Paciente</InputLabel>
                  <Select
                    value={newPatientData.emergency_contact_relationship || ''}
                    onChange={(e) => onFieldChange('emergency_contact_relationship', e.target.value)}
                    label="Relación con el Paciente"
                    disabled={isReadOnly}
                    sx={{ gridColumn: '1 / -1' }}
                  >
                    <MenuItem value=""><em>Seleccione</em></MenuItem>
                    {(emergencyRelationships || []).map((relationship) => (
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
                  value={newPatientData.insurance_provider || ''}
                  onChange={(e) => onFieldChange('insurance_provider', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
                />
                <TextField
                  label="Código de Seguro"
                  value={newPatientData.insurance_number || ''}
                  onChange={(e) => onFieldChange('insurance_number', e.target.value)}
                  size="small"
                  disabled={isReadOnly}
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
          </>
        )}
      </Box>
    </Box>
  );
};

