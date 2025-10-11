import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface DoctorFormData {
  title: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: string;
  curp: string;
  rfc: string;
  professional_license: string;
  university: string;
  graduation_year: string;
  specialty: string;
  office_address: string;
  office_city: string;
  office_state_id: string;
  office_postal_code: string;
  office_timezone: string;
  appointment_duration: string;
}

interface DoctorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: DoctorFormData;
  setFormData: (data: DoctorFormData | ((prev: DoctorFormData) => DoctorFormData)) => void;
  onSubmit: () => void;
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  fieldErrors?: { [key: string]: string };
}

const DoctorProfileDialog: React.FC<DoctorProfileDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting,
  fieldErrors = {}
}) => {
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [timezones, setTimezones] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const loadStates = async () => {
      try {
        const statesData = await apiService.getStates();
        setStates(statesData);
      } catch (error) {
        console.error('Error loading states:', error);
      }
    };

    const loadTimezones = async () => {
      try {
        const timezonesData = await apiService.getTimezones();
        setTimezones(timezonesData);
      } catch (error) {
        console.error('Error loading timezones:', error);
      }
    };

    if (open) {
      loadStates();
      loadTimezones();
    }
  }, [open]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFormErrorMessage('');
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFormErrorMessage('');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    onSubmit();
  };


  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: '16px', 
          minHeight: '60vh',
          zIndex: 9999
        }
      }}
      sx={{
        zIndex: 9999
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
        pt: 3,
        px: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Perfil Profesional' : 'Crear Perfil Profesional'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2 }}>
        {formErrorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formErrorMessage}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Información Personal */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
            Información Personal
              </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
              name="first_name"
              label="Nombre(s) *"
                value={formData.first_name || ''}
              onChange={handleChange}
              size="small"
                required
                error={!!fieldErrors.first_name}
              helperText={fieldErrors.first_name}
              />
              <TextField
              name="paternal_surname"
              label="Apellido Paterno *"
                value={formData.paternal_surname || ''}
              onChange={handleChange}
              size="small"
                required
                error={!!fieldErrors.paternal_surname}
                helperText={fieldErrors.paternal_surname}
              />
              <TextField
              name="maternal_surname"
                label="Apellido Materno"
                value={formData.maternal_surname || ''}
              onChange={handleChange}
              size="small"
            />
            <TextField
              name="email"
              label="Email *"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />
              <TextField
              name="phone"
              label="Teléfono *"
                value={formData.phone || ''}
              onChange={handleChange}
              size="small"
                required
                error={!!fieldErrors.phone}
              helperText={fieldErrors.phone}
            />
            <TextField
              name="birth_date"
                  label="Fecha de Nacimiento *"
              type="date"
              value={formData.birth_date || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.birth_date}
              helperText={fieldErrors.birth_date}
              InputLabelProps={{ shrink: true }}
            />
            </Box>

          {/* Información Profesional */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
            Información Profesional
              </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
              name="professional_license"
              label="Cédula Profesional *"
              value={formData.professional_license || ''}
              onChange={handleChange}
              size="small"
                required
              error={!!fieldErrors.professional_license}
              helperText={fieldErrors.professional_license}
            />
            <TextField
              name="university"
              label="Universidad *"
              value={formData.university || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.university}
              helperText={fieldErrors.university}
            />
            <TextField
              name="graduation_year"
              label="Año de Graduación *"
              type="number"
              value={formData.graduation_year || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.graduation_year}
              helperText={fieldErrors.graduation_year}
            />
            <TextField
              name="specialty"
              label="Especialidad *"
              value={formData.specialty || ''}
              onChange={handleChange}
              size="small"
                  required
                  error={!!fieldErrors.specialty}
              helperText={fieldErrors.specialty}
            />
          </Box>

          {/* Información del Consultorio */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
            Información del Consultorio
            </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              name="office_address"
              label="Dirección del Consultorio *"
              value={formData.office_address || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.office_address}
              helperText={fieldErrors.office_address}
            />
                  <TextField
              name="office_city"
              label="Ciudad *"
              value={formData.office_city || ''}
              onChange={handleChange}
              size="small"
                required
                error={!!fieldErrors.office_city}
              helperText={fieldErrors.office_city}
            />
                  <TextField
                    name="office_state_id"
                    label="Estado *"
                    value={states.find(s => s.id.toString() === formData.office_state_id)?.name || ''}
                    onChange={(e) => {
                      const stateName = e.target.value;
                      const state = states.find(s => s.name === stateName);
                      handleSelectChange({
                        target: {
                          name: 'office_state_id',
                          value: state ? state.id.toString() : ''
                        }
                      });
                    }}
                    size="small"
                    required
                    error={!!fieldErrors.office_state_id}
                    helperText={fieldErrors.office_state_id}
                    select
                    SelectProps={{
                      native: true,
                      style: { zIndex: 9999 }
                    }}
                  >
                    <option value="">Seleccione</option>
                    {states.map(state => (
                      <option key={state.id} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </TextField>
              <TextField
              name="office_postal_code"
                label="Código Postal"
                value={formData.office_postal_code || ''}
              onChange={handleChange}
              size="small"
            />
              <TextField
                name="office_timezone"
                label="Zona Horaria *"
                value={formData.office_timezone || 'America/Mexico_City'}
                onChange={handleChange}
                size="small"
                required
                error={!!fieldErrors.office_timezone}
                helperText={fieldErrors.office_timezone}
                select
                SelectProps={{
                  native: true,
                  style: { zIndex: 9999 }
                }}
              >
                {timezones.map(timezone => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </TextField>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
            <Button 
              variant="contained"
          onClick={handleSubmit}
                  disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <EditIcon />}
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoctorProfileDialog;