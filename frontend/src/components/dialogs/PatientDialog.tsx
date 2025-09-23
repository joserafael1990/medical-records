import React, { memo, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import { PatientFormData, Patient } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useEmergencyRelationships } from '../../hooks/useEmergencyRelationships';
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
                value={formData.gender || (isEditing ? selectedPatient?.gender || '' : '')}
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
          
          {/* Domicilio de Residencia */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              🏠 Domicilio de Residencia
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
              helperText={fieldErrors.address_street || "Calle, número, colonia"}
              placeholder="Av. Insurgentes Sur 123, Col. Roma Norte"
              required
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <TextField
              label="Ciudad"
              value={formData.address_city || (isEditing ? selectedPatient?.city || selectedPatient?.address_city || '' : '')}
              onChange={(e) => onFormDataChange('address_city', e.target.value)}
              fullWidth
              required
              error={!!fieldErrors.address_city}
              helperText={fieldErrors.address_city}
              placeholder="Ciudad de México"
            />
            <FormControl fullWidth required error={!!fieldErrors.address_state_id}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.address_state_id ? String(formData.address_state_id) : (isEditing ? selectedPatient?.state || selectedPatient?.address_state_id || '' : '')}
                onChange={(e) => onFormDataChange('address_state_id', e.target.value)}
                label="Estado"
              >
                <MenuItem value="">Selecciona un estado</MenuItem>
                <MenuItem value="1">Aguascalientes</MenuItem>
                <MenuItem value="2">Baja California</MenuItem>
                <MenuItem value="3">Baja California Sur</MenuItem>
                <MenuItem value="4">Campeche</MenuItem>
                <MenuItem value="5">Chiapas</MenuItem>
                <MenuItem value="6">Chihuahua</MenuItem>
                <MenuItem value="7">Ciudad de México</MenuItem>
                <MenuItem value="8">Coahuila</MenuItem>
                <MenuItem value="9">Colima</MenuItem>
                <MenuItem value="10">Durango</MenuItem>
                <MenuItem value="11">Guanajuato</MenuItem>
                <MenuItem value="12">Guerrero</MenuItem>
                <MenuItem value="13">Hidalgo</MenuItem>
                <MenuItem value="14">Jalisco</MenuItem>
                <MenuItem value="15">Estado de México</MenuItem>
                <MenuItem value="16">Michoacán</MenuItem>
                <MenuItem value="17">Morelos</MenuItem>
                <MenuItem value="18">Nayarit</MenuItem>
                <MenuItem value="19">Nuevo León</MenuItem>
                <MenuItem value="20">Oaxaca</MenuItem>
                <MenuItem value="21">Puebla</MenuItem>
                <MenuItem value="22">Querétaro</MenuItem>
                <MenuItem value="23">Quintana Roo</MenuItem>
                <MenuItem value="24">San Luis Potosí</MenuItem>
                <MenuItem value="25">Sinaloa</MenuItem>
                <MenuItem value="26">Sonora</MenuItem>
                <MenuItem value="27">Tabasco</MenuItem>
                <MenuItem value="28">Tamaulipas</MenuItem>
                <MenuItem value="29">Tlaxcala</MenuItem>
                <MenuItem value="30">Veracruz</MenuItem>
                <MenuItem value="31">Yucatán</MenuItem>
                <MenuItem value="32">Zacatecas</MenuItem>
              </Select>
              {fieldErrors.address_state_id && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {fieldErrors.address_state_id}
                </Typography>
              )}
            </FormControl>
            <TextField
              label="Código Postal"
              value={formData.address_postal_code || (isEditing ? selectedPatient?.zip_code || selectedPatient?.postal_code || selectedPatient?.address_postal_code || '' : '')}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                onFormDataChange('address_postal_code', value);
              }}
              fullWidth
              required
              error={!!fieldErrors.address_postal_code}
              helperText={fieldErrors.address_postal_code || "Solo números (5 dígitos)"}
              placeholder="12345"
              inputProps={{ maxLength: 5 }}
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

          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormDataChange('email', e.target.value)}
            />
          </Box>

          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="CURP"
              value={formData.curp}
              onChange={(e) => onFormDataChange('curp', e.target.value)}
              helperText="Clave Única de Registro de Población"
            />
          </Box>

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

          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Alergias"
              value={formData.allergies}
              onChange={(e) => onFormDataChange('allergies', e.target.value)}
              multiline
              rows={2}
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
