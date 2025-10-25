
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
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  office_country: string;
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
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [timezones, setTimezones] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await apiService.getCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading countries:', error);
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
      loadCountries();
      loadTimezones();
    }
  }, [open]);

  // Cargar estados cuando cambie el país seleccionado
  useEffect(() => {
    const loadStates = async () => {
      if (!formData.office_country || !countries.length) {
        setStates([]);
        return;
      }

      try {
        // Buscar el ID del país seleccionado
        const selectedCountry = countries.find(c => c.name === formData.office_country);
        if (selectedCountry) {
          const statesData = await apiService.getStates(selectedCountry.id);
          setStates(statesData);
        } else {
          setStates([]);
        }
      } catch (error) {
        console.error('Error loading states:', error);
        setStates([]);
      }
    };

    loadStates();
  }, [formData.office_country, countries]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    console.log('🔄 handleChange called:', { name, value });
    
    // Si cambia el país, limpiar el estado seleccionado
    if (name === 'office_country') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        office_state_id: '' // Limpiar estado cuando cambia el país
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
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
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
            <Typography color="white">{formErrorMessage}</Typography>
          </Box>
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
            <TextField
              name="gender"
              label="Género"
              value={formData.gender || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.gender}
              helperText={fieldErrors.gender}
              select
              SelectProps={{
                native: true,
                style: { zIndex: 9999 }
              }}
              InputLabelProps={{
                shrink: true
              }}
              sx={{
                '& .MuiSelect-select': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingRight: '32px !important',
                  minHeight: 'auto !important'
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: 'primary.main'
                  },
                  transform: 'translate(14px, -9px) scale(0.75)',
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)'
                  }
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.87)'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main'
                  }
                }
              }}
            >
              <option value="">Seleccione</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </TextField>
            <TextField
              name="curp"
              label="CURP *"
              value={formData.curp || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.curp}
              helperText={fieldErrors.curp}
              inputProps={{
                maxLength: 18,
                style: { textTransform: 'uppercase' }
              }}
            />
            </Box>

          {/* Información Profesional */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
            Información Profesional
              </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                name="title"
                label="Título"
                value={formData.title || ''}
                onChange={handleChange}
                size="small"
                required
                error={!!fieldErrors.title}
                helperText={fieldErrors.title}
                select
                SelectProps={{
                  native: true,
                  style: { zIndex: 9999 }
                }}
              >
                <option value="Dr.">Dr.</option>
                <option value="Dra.">Dra.</option>
                <option value="Lic.">Lic.</option>
                <option value="M.C.">M.C.</option>
                <option value="Esp.">Esp.</option>
              </TextField>
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
            <TextField
              name="appointment_duration"
              label="Duración de Consulta (minutos) *"
              value={formData.appointment_duration || ''}
              onChange={handleChange}
              size="small"
              type="number"
              required
              error={!!fieldErrors.appointment_duration}
              helperText={fieldErrors.appointment_duration}
              inputProps={{
                min: 15,
                max: 120,
                step: 15
              }}
            />
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