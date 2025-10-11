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
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import type { Patient, PatientFormData } from '../../types';

interface PatientDialogProps {
  open: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSubmit: (data: PatientFormData) => Promise<void>;
}

const PatientDialog: React.FC<PatientDialogProps> = ({
  open,
  onClose,
  patient,
  onSubmit
}) => {
  const isEditing = !!patient;
  
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
    address_street: '',
    address: '',
    curp: '',
    rfc: '',
    civil_status: '',
    address_city: '',
    city: '',
    address_state_id: '',
    state: '',
    address_postal_code: '',
    zip_code: '',
    country: '',
    birth_city: '',
    birth_state_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    medical_history: '',
    insurance_provider: '',
    insurance_policy_number: '',
    active: true,
    is_active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (patient && open) {
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
        address_street: patient.address_street || '',
        address: patient.address_street || '',
        curp: patient.curp || '',
        rfc: patient.rfc || '',
        civil_status: patient.civil_status || '',
        address_city: patient.address_city || '',
        city: patient.address_city || '',
        address_state_id: '',
        state: '',
        address_postal_code: patient.address_postal_code || '',
        zip_code: patient.address_postal_code || '',
        country: '',
        birth_city: patient.birth_city || '',
        birth_state_id: '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        emergency_contact_relationship: patient.emergency_contact_relationship || '',
        blood_type: patient.blood_type || '',
        allergies: patient.allergies || '',
        chronic_conditions: patient.chronic_conditions || '',
        current_medications: patient.current_medications || '',
        medical_history: '',
        insurance_provider: patient.insurance_provider || '',
        insurance_policy_number: '',
        active: true,
        is_active: true
      });
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
        address_street: '',
        address: '',
        curp: '',
        rfc: '',
        civil_status: '',
        address_city: '',
        city: '',
        address_state_id: '',
        state: '',
        address_postal_code: '',
        zip_code: '',
        country: '',
        birth_city: '',
        birth_state_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        blood_type: '',
        allergies: '',
        chronic_conditions: '',
        current_medications: '',
        medical_history: '',
        insurance_provider: '',
        insurance_policy_number: '',
        active: true,
        is_active: true
      });
      setError('');
    }
  }, [patient, open]);

  const handleChange = (field: keyof PatientFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
    if (!formData.birth_date) {
      setError('La fecha de nacimiento es requerida');
      return;
    }
    if (!formData.gender) {
      setError('El género es requerido');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar paciente');
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
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error">{error}</Typography>
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
                label="Nombre *"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                size="small"
                required
                error={!!errors.first_name}
                helperText={errors.first_name}
              />
              <TextField
                label="Apellido Paterno *"
                name="paternal_surname"
                value={formData.paternal_surname}
                onChange={handleChange}
                size="small"
                required
                error={!!errors.paternal_surname}
                helperText={errors.paternal_surname}
              />
              <TextField
                label="Apellido Materno"
                name="maternal_surname"
                value={formData.maternal_surname}
                onChange={handleChange}
                size="small"
                error={!!errors.maternal_surname}
                helperText={errors.maternal_surname}
              />

              <TextField
                label="Fecha de Nacimiento *"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleDateChange}
                size="small"
                required
                InputLabelProps={{ shrink: true }}
                error={!!errors.birth_date}
                helperText={errors.birth_date}
              />
              <FormControl size="small" required error={!!errors.gender} fullWidth>
                <InputLabel id="gender-label">Género *</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  labelId="gender-label"
                  label="Género *"
                  onChange={handleChange}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value=""><em>Seleccione</em></MenuItem>
                  <MenuItem value="male">Masculino</MenuItem>
                  <MenuItem value="female">Femenino</MenuItem>
                  <MenuItem value="other">Otro</MenuItem>
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
                label="Teléfono"
                name="primary_phone"
                value={formData.primary_phone}
                onChange={handleChange}
                size="small"
                error={!!errors.primary_phone}
                helperText={errors.primary_phone}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                size="small"
                error={!!errors.email}
                helperText={errors.email}
              />

              <TextField
                label="Dirección"
                name="address_street"
                value={formData.address_street}
                onChange={handleChange}
                size="small"
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
                error={!!errors.address_street}
                helperText={errors.address_street}
              />
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
                label="CURP"
                name="curp"
                value={formData.curp}
                onChange={handleChange}
                size="small"
                inputProps={{ maxLength: 18 }}
                error={!!errors.curp}
                helperText={errors.curp}
              />
              <FormControl size="small" error={!!errors.blood_type} fullWidth>
                <InputLabel id="blood-type-label">Tipo de Sangre</InputLabel>
                <Select
                  name="blood_type"
                  value={formData.blood_type}
                  labelId="blood-type-label"
                  label="Tipo de Sangre"
                  onChange={handleChange}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value=""><em>Seleccione</em></MenuItem>
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                  <MenuItem value="O+">O+</MenuItem>
                  <MenuItem value="O-">O-</MenuItem>
                </Select>
                {errors.blood_type && <FormHelperText>{errors.blood_type}</FormHelperText>}
              </FormControl>

              <TextField
                label="Alergias"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                size="small"
                fullWidth
                multiline
                rows={2}
                sx={{ gridColumn: '1 / -1' }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
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
      </DialogActions>
    </Dialog>
  );
};

export default PatientDialog;

