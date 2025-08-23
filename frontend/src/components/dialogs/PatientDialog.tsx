import React, { memo } from 'react';
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
  Typography
} from '@mui/material';
import { PatientFormData } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';

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
  onDelete
}) => {
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
              📋 DATOS OBLIGATORIOS
            </Typography>
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Nombre(s)"
              value={formData.first_name}
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
              value={formData.paternal_surname}
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
              value={formData.maternal_surname}
              onChange={(e) => onFormDataChange('maternal_surname', e.target.value)}
              error={!!fieldErrors.maternal_surname}
              helperText={fieldErrors.maternal_surname}
              required
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <TextField
              fullWidth
              label="Fecha de Nacimiento"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => onFormDataChange('date_of_birth', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!fieldErrors.date_of_birth}
              helperText={fieldErrors.date_of_birth}
              required
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
            <FormControl fullWidth required error={!!fieldErrors.gender}>
              <InputLabel>Género</InputLabel>
              <Select
                value={formData.gender}
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
              placeholder="Ej: +52 555 123 4567 o 5551234567"
              value={formData.phone}
              onChange={(e) => onFormDataChange('phone', e.target.value)}
              error={!!fieldErrors.phone}
              helperText={fieldErrors.phone || "Formato México: +52 555 123 4567 o 5551234567 (10 dígitos mínimo)"}
              required
            />
          </Box>
          
          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Domicilio de Residencia"
              value={formData.address}
              onChange={(e) => onFormDataChange('address', e.target.value)}
              multiline
              rows={2}
              error={!!fieldErrors.address}
              helperText={fieldErrors.address || "Dirección completa donde reside actualmente"}
              required
            />
          </Box>
          
          {/* Antecedentes Médicos - NOM-004 Obligatorio */}
          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Antecedentes Heredofamiliares"
              value={formData.family_history}
              onChange={(e) => onFormDataChange('family_history', e.target.value)}
              multiline
              rows={3}
              error={!!fieldErrors.family_history}
              helperText={fieldErrors.family_history || "Enfermedades presentes en familiares directos"}
              required
            />
          </Box>
          
          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Antecedentes Personales Patológicos"
              value={formData.personal_pathological_history}
              onChange={(e) => onFormDataChange('personal_pathological_history', e.target.value)}
              multiline
              rows={3}
              error={!!fieldErrors.personal_pathological_history}
              helperText={fieldErrors.personal_pathological_history || "Enfermedades, cirugías, hospitalizaciones previas"}
              required
            />
          </Box>
          
          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Antecedentes Personales No Patológicos"
              value={formData.personal_non_pathological_history}
              onChange={(e) => onFormDataChange('personal_non_pathological_history', e.target.value)}
              multiline
              rows={3}
              error={!!fieldErrors.personal_non_pathological_history}
              helperText={fieldErrors.personal_non_pathological_history || "Hábitos: tabaquismo, alcoholismo, ejercicio, alimentación"}
              required
            />
          </Box>

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
