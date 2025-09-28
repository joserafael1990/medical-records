import React, { memo, useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Autocomplete,
  FormHelperText
} from '@mui/material';
import { PatientFormData, Patient } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useEmergencyRelationships } from '../../hooks/useEmergencyRelationships';
import { useCatalogs } from '../../hooks/useCatalogs';
import { apiService } from '../../services/api';

interface PatientDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: PatientFormData;
  onFormDataChange: (field: string, value: string) => void;
  onSubmit: () => void;
  fieldErrors: { [key: string]: string };
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  onDelete?: () => void;
  selectedPatient?: Patient | null;
}

const PatientDialog: React.FC<PatientDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  onFormDataChange,
  onSubmit,
  fieldErrors,
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting,
  onDelete,
  selectedPatient
}) => {
  const { relationships, isLoading: relationshipsLoading } = useEmergencyRelationships();
  const { countries, states, getStatesByCountry, getCountryByName, loading: catalogsLoading } = useCatalogs();
  
  // State for selected country to filter states
  const [selectedAddressCountry, setSelectedAddressCountry] = useState<string>('México');
  const [selectedBirthCountry, setSelectedBirthCountry] = useState<string>('México');
  
  
  // Initialize country when countries are loaded
  useEffect(() => {
    if (countries.length > 0) {
      if (!selectedAddressCountry) {
        setSelectedAddressCountry('México');
      }
      if (!selectedBirthCountry) {
        setSelectedBirthCountry('México');
      }
    }
  }, [countries.length]); // Solo depender de la longitud para evitar bucles
  
  // Get current state info to determine its country
  const currentStateInfo = useMemo(() => {
    if (!formData.address_state_id || !states.length) return null;
    return states.find(state => state.id === parseInt(formData.address_state_id));
  }, [formData.address_state_id, states]);

  // Get current birth state info to determine its country
  const currentBirthStateInfo = useMemo(() => {
    if (!formData.birth_state_id || !states.length) return null;
    return states.find(state => state.id === parseInt(formData.birth_state_id));
  }, [formData.birth_state_id, states]);
  
  // Update selected country when state changes (for editing mode)
  useEffect(() => {
    if (currentStateInfo && countries.length) {
      const countryForState = countries.find(c => c.id === currentStateInfo.country_id);
      if (countryForState && countryForState.name !== selectedAddressCountry) {
        setSelectedAddressCountry(countryForState.name);
      }
    }
  }, [currentStateInfo, countries]); // Removido selectedAddressCountry para evitar bucle

  // Update selected birth country when birth state changes (for editing mode)
  useEffect(() => {
    if (currentBirthStateInfo && countries.length) {
      const countryForBirthState = countries.find(c => c.id === currentBirthStateInfo.country_id);
      if (countryForBirthState && countryForBirthState.name !== selectedBirthCountry) {
        setSelectedBirthCountry(countryForBirthState.name);
      }
    }
  }, [currentBirthStateInfo, countries]); // Removido selectedBirthCountry para evitar bucle

  // Update selected birth country when editing a patient with a country value
  useEffect(() => {
    if (isEditing && formData.country) {
      setSelectedBirthCountry(formData.country);
    }
  }, [isEditing, formData.country]);
  
  // Get filtered states for selected country
  const filteredStates = useMemo(() => {
    return getStatesByCountry(selectedAddressCountry);
  }, [getStatesByCountry, selectedAddressCountry]);

  // Get filtered birth states for selected birth country
  const filteredBirthStates = useMemo(() => {
    return getStatesByCountry(selectedBirthCountry);
  }, [getStatesByCountry, selectedBirthCountry]);
  
  // Handle country change
  const handleCountryChange = (countryName: string) => {
    setSelectedAddressCountry(countryName);
    // Clear state selection when country changes
    onFormDataChange('address_state_id', '');
  };

  // Handle birth country change
  const handleBirthCountryChange = (countryName: string) => {
    setSelectedBirthCountry(countryName);
    // Clear birth state selection when country changes
    onFormDataChange('birth_state_id', '');
    // Update the country field in form data
    onFormDataChange('country', countryName);
  };

  // Map backend gender values to frontend display values
  const mapGenderToFrontend = (gender: string | null | undefined): string => {
    if (!gender) return '';
    switch (gender.toLowerCase()) {
      case 'm':
      case 'male':
      case 'masculino':
        return 'Masculino';
      case 'f':
      case 'female':
      case 'femenino':
        return 'Femenino';
      default:
        return '';
    }
  };
  

  const handleClose = () => {
    onClose();
    setFormErrorMessage('');
  };




  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
      </DialogTitle>

      {/* Error Message Ribbon */}
      {formErrorMessage && (
        <ErrorRibbon 
          message={formErrorMessage} 
          onClose={() => setFormErrorMessage('')} 
        />
      )}

      <DialogContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
          {/* SECCIÓN: INFORMACIÓN PERSONAL OBLIGATORIA - NOM-004 */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 'bold', mb: 2 }}>
DATOS OBLIGATORIOS
            </Typography>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Nombre(s)"
              value={formData.first_name || (isEditing ? selectedPatient?.first_name || '' : '')}
              onChange={(e) => onFormDataChange('first_name', e.target.value)}
              error={!!fieldErrors.first_name}
              helperText={fieldErrors.first_name}
              required
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Apellido Paterno"
              value={formData.paternal_surname || (isEditing ? selectedPatient?.paternal_surname || '' : '')}
              onChange={(e) => onFormDataChange('paternal_surname', e.target.value)}
              error={!!fieldErrors.paternal_surname}
              helperText={fieldErrors.paternal_surname}
              required
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Apellido Materno"
              value={formData.maternal_surname || (isEditing ? selectedPatient?.maternal_surname || '' : '')}
              onChange={(e) => onFormDataChange('maternal_surname', e.target.value)}
              error={!!fieldErrors.maternal_surname}
              helperText={fieldErrors.maternal_surname || "Opcional"}
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Fecha de Nacimiento"
              type="date"
              value={formData.birth_date ? formData.birth_date.split('T')[0] : (isEditing && selectedPatient?.birth_date ? selectedPatient.birth_date.split('T')[0] : '')}
              onChange={(e) => onFormDataChange('birth_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.birth_date}
              helperText={fieldErrors.birth_date}
              required
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <FormControl fullWidth required error={!!fieldErrors.gender}>
              <InputLabel>Género</InputLabel>
              <Select
                value={formData.gender ? mapGenderToFrontend(formData.gender) : (isEditing ? mapGenderToFrontend(selectedPatient?.gender) : '')}
                onChange={(e) => onFormDataChange('gender', e.target.value)}
                label="Género"
              >
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Femenino">Femenino</MenuItem>
              </Select>
              {fieldErrors.gender && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {fieldErrors.gender}
                </Typography>
              )}
            </FormControl>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Teléfono"
              placeholder="Ej: 5551234567 (solo números)"
              value={formData.primary_phone || (isEditing ? selectedPatient?.primary_phone || '' : '')}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                onFormDataChange('primary_phone', value);
              }}
              onBlur={(e) => {
                // Validación en tiempo real al perder el foco
                const value = e.target.value;
                if (value && value.length < 10) {
                  onFormDataChange('primary_phone_error', 'El teléfono debe tener al menos 10 dígitos');
                } else {
                  onFormDataChange('primary_phone_error', '');
                }
              }}
              error={!!fieldErrors.primary_phone}
              helperText={fieldErrors.primary_phone || fieldErrors.primary_phone_error || "Solo números (10 dígitos mínimo)"}
              required
              inputProps={{ maxLength: 15 }}
            />
          </Box>
          
          
          {/* Antecedentes Médicos movidos a Evaluación Clínica en Consultas */}
          {/* Los antecedentes heredofamiliares, patológicos y no patológicos */}
          {/* ahora se capturan durante la consulta médica como parte de la evaluación clínica */}

          {/* SECCIÓN: INFORMACIÓN OPCIONAL */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold', mt: 3, mb: 2 }}>
              📝 DATOS OPCIONALES
            </Typography>
          </Box>

          {/* Domicilio de Residencia - OPCIONAL */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h6" sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              🏠 Domicilio de Residencia (Opcional)
            </Typography>
          </Box>

          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Dirección Completa"
              value={formData.address_street || (isEditing ? selectedPatient?.address || selectedPatient?.address_street || '' : '')}
              onChange={(e) => onFormDataChange('address_street', e.target.value)}
              multiline
              rows={2}
              error={!!fieldErrors.address_street}
              helperText={fieldErrors.address_street || "Calle, número, colonia (opcional)"}
              placeholder="Av. Insurgentes Sur 123, Col. Roma Norte"
            />
          </Box>

          {/* País, Estado y Ciudad en la misma línea para mejor legibilidad */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Autocomplete
              options={countries}
              getOptionLabel={(option) => option.name}
              value={countries.find(country => country.name === selectedAddressCountry) || null}
              onChange={(_, newValue) => {
                const countryName = newValue?.name || 'México';
                handleCountryChange(countryName);
              }}
              loading={catalogsLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="País (Opcional)"
                  error={!!fieldErrors.address_country}
                  helperText={fieldErrors.address_country || "Selecciona el país (opcional)"}
                />
              )}
            />
            <Autocomplete
              options={filteredStates}
              getOptionLabel={(option) => option.name}
              value={filteredStates.find(state => state.id === parseInt(formData.address_state_id || '0')) || null}
              onChange={(_, newValue) => {
                onFormDataChange('address_state_id', newValue ? String(newValue.id) : '');
              }}
              loading={catalogsLoading}
              disabled={!selectedAddressCountry || filteredStates.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Estado/Provincia (Opcional)"
                  error={!!fieldErrors.address_state_id}
                  helperText={fieldErrors.address_state_id || 
                    (!selectedAddressCountry ? "Primero selecciona un país" :
                     filteredStates.length === 0 ? "No hay estados disponibles" : 
                     "Selecciona el estado (opcional)")}
                />
              )}
            />
            <TextField
              label="Ciudad (Opcional)"
              value={formData.address_city || (isEditing ? selectedPatient?.city || selectedPatient?.address_city || '' : '')}
              onChange={(e) => onFormDataChange('address_city', e.target.value)}
              fullWidth
              error={!!fieldErrors.address_city}
              helperText={fieldErrors.address_city || "Ciudad de residencia (opcional)"}
              placeholder="Ciudad de México"
            />
          </Box>

          {/* Código Postal en línea separada */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
            <TextField
              label="Código Postal (Opcional)"
              value={formData.address_postal_code || (isEditing ? selectedPatient?.zip_code || selectedPatient?.postal_code || selectedPatient?.address_postal_code || '' : '')}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                onFormDataChange('address_postal_code', value);
              }}
              fullWidth
              error={!!fieldErrors.address_postal_code}
              helperText={fieldErrors.address_postal_code || "Solo números, 5 dígitos (opcional)"}
              placeholder="12345"
              inputProps={{ maxLength: 5 }}
            />
            {/* Espacio vacío para mantener el layout balanceado */}
            <Box />
          </Box>

          {/* 1. País de Nacimiento */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <Autocomplete
              options={countries}
              getOptionLabel={(option) => option.name}
              value={countries.find(country => country.name === selectedBirthCountry) || null}
              onChange={(_, newValue) => {
                const countryName = newValue?.name || 'México';
                handleBirthCountryChange(countryName);
              }}
              loading={catalogsLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="País de Nacimiento"
                  helperText="Selecciona el país de nacimiento"
                />
              )}
            />
          </Box>

          {/* 2. Estado de Nacimiento */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <Autocomplete
              options={filteredBirthStates}
              getOptionLabel={(option) => option.name}
              value={filteredBirthStates.find(state => state.id === parseInt(formData.birth_state_id || '0')) || null}
              onChange={(_, newValue) => {
                onFormDataChange('birth_state_id', newValue ? String(newValue.id) : '');
              }}
              loading={catalogsLoading}
              disabled={!selectedBirthCountry || filteredBirthStates.length === 0}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Estado de Nacimiento"
                  helperText={
                    !selectedBirthCountry ? "Primero selecciona un país" :
                    filteredBirthStates.length === 0 ? "No hay estados disponibles" : 
                    "Estado/Provincia donde nació"
                  }
                />
              )}
            />
          </Box>

          {/* 3. Ciudad de Nacimiento */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Ciudad de Nacimiento"
              value={formData.birth_city || (isEditing ? selectedPatient?.birth_city || '' : '')}
              onChange={(e) => onFormDataChange('birth_city', e.target.value)}
              helperText="Ciudad donde nació"
              placeholder="Ciudad de México"
            />
          </Box>

          {/* 4. Estado Civil */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <FormControl fullWidth error={!!fieldErrors.civil_status}>
              <InputLabel>Estado Civil</InputLabel>
              <Select
                value={formData.civil_status}
                onChange={(e) => onFormDataChange('civil_status', e.target.value)}
                label="Estado Civil"
              >
                <MenuItem value="">--Seleccionar--</MenuItem>
                <MenuItem value="Soltero(a)">Soltero(a)</MenuItem>
                <MenuItem value="Casado(a)">Casado(a)</MenuItem>
                <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
                <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
                <MenuItem value="Unión libre">Unión libre</MenuItem>
                <MenuItem value="Separado(a)">Separado(a)</MenuItem>
              </Select>
              {fieldErrors.civil_status && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {fieldErrors.civil_status}
                </Typography>
              )}
            </FormControl>
          </Box>

          {/* 5. Tipo de Sangre */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Sangre</InputLabel>
              <Select
                value={formData.blood_type}
                onChange={(e) => onFormDataChange('blood_type', e.target.value)}
                label="Tipo de Sangre"
              >
                <MenuItem value="">--Seleccionar--</MenuItem>
                <MenuItem value="A+">A+</MenuItem>
                <MenuItem value="A-">A-</MenuItem>
                <MenuItem value="B+">B+</MenuItem>
                <MenuItem value="B-">B-</MenuItem>
                <MenuItem value="AB+">AB+</MenuItem>
                <MenuItem value="AB-">AB-</MenuItem>
                <MenuItem value="O+">O+</MenuItem>
                <MenuItem value="O-">O-</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 6. Alergias */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Alergias"
              value={formData.allergies}
              onChange={(e) => onFormDataChange('allergies', e.target.value)}
              multiline
              rows={2}
              helperText="Medicamentos, alimentos, etc."
            />
          </Box>

          {/* 7. Email */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormDataChange('email', e.target.value)}
              helperText="Correo electrónico"
            />
          </Box>

          {/* 8. CURP */}
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="CURP"
              value={formData.curp}
              onChange={(e) => onFormDataChange('curp', e.target.value)}
              helperText="Clave Única de Registro de Población"
            />
          </Box>

          {/* SECCIÓN: CONTACTO DE EMERGENCIA */}
          <Box sx={{ width: '100%', mt: 3 }}>
            <Typography variant="h6" sx={{ color: 'warning.main', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', mb: 2 }}>
              🚨 Contacto de Emergencia
            </Typography>
          </Box>

          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Nombre del Contacto"
              value={formData.emergency_contact_name}
              onChange={(e) => onFormDataChange('emergency_contact_name', e.target.value)}
              error={!!fieldErrors.emergency_contact_name}
              helperText={fieldErrors.emergency_contact_name || "Nombre completo de la persona de contacto"}
            />
          </Box>

          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Teléfono de Emergencia"
              value={formData.emergency_contact_phone}
              onChange={(e) => onFormDataChange('emergency_contact_phone', e.target.value)}
              error={!!fieldErrors.emergency_contact_phone}
              helperText={fieldErrors.emergency_contact_phone || "Número telefónico del contacto"}
              placeholder="Ej: +52 555 123 4567"
            />
          </Box>

          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <FormControl fullWidth error={!!fieldErrors.emergency_contact_relationship}>
              <InputLabel>Relación</InputLabel>
              <Select
                value={formData.emergency_contact_relationship}
                onChange={(e) => onFormDataChange('emergency_contact_relationship', e.target.value)}
                label="Relación"
                disabled={relationshipsLoading}
              >
                {relationshipsLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Cargando...
                  </MenuItem>
                ) : (
                  relationships.map((relationship) => (
                    <MenuItem key={relationship.code} value={relationship.code}>
                      {relationship.name}
                    </MenuItem>
                  ))
                )}
              </Select>
              {fieldErrors.emergency_contact_relationship && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {fieldErrors.emergency_contact_relationship}
                </Typography>
              )}
            </FormControl>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        justifyContent: 'flex-end',
        gap: 1
      }}>
        {isEditing && onDelete && (
          <Button 
            onClick={onDelete}
            color="error"
            variant="outlined"
            sx={{ mr: 'auto' }}
          >
            Eliminar Paciente
          </Button>
        )}
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={isSubmitting}
        >
          {isEditing ? 'Actualizar Paciente' : 'Crear Paciente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(PatientDialog);
