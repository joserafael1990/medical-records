import React, { memo, useState, useEffect } from 'react';
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
  Divider,
  Chip,
  Avatar,
  IconButton,
  Autocomplete,
  Alert,
  Collapse,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
  Notes as NotesIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { Patient, AppointmentFormData } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
};

// Function to format patient name with age
const formatPatientNameWithAge = (patient: Patient): string => {
  const age = calculateAge(patient.birth_date);
  const fullName = [
    patient.first_name,
    patient.paternal_surname,
    patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
  ].filter(part => part && part.trim()).join(' ');
  return `${fullName} (${age} años)`;
};

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: AppointmentFormData) => void;
  onNewPatient: () => void;
  onEditPatient?: (patient: Patient) => void;
  formData: AppointmentFormData;
  patients: Patient[];
  isEditing: boolean;
  loading?: boolean;
  formErrorMessage?: string;
  fieldErrors?: Record<string, string>;
  onFormDataChange?: (formData: AppointmentFormData) => void;
  doctorProfile?: any; // Doctor profile for appointment duration
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = memo(({
  open,
  onClose,
  onSubmit,
  onNewPatient,
  onEditPatient,
  formData,
  patients,
  isEditing,
  loading = false,
  formErrorMessage = '',
  fieldErrors = {},
  onFormDataChange,
  doctorProfile
}) => {
  const [localFormData, setLocalFormData] = useState<AppointmentFormData>(formData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Determine if fields should be read-only
  // RULE: Read-only ONLY for EXISTING appointments (isEditing=true) that were originally cancelled
  // New appointments (isEditing=false) are NEVER read-only
  const isReadOnly = isEditing && 
                     formData.status === 'cancelled' && 
                     localFormData.status === 'cancelled';

  // Read-only logic for cancelled appointments

  // Update local form data when props change
  useEffect(() => {
    setLocalFormData(formData);
    if (formData.patient_id && patients.length > 0) {
      const patient = patients.find(p => p.id === formData.patient_id);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [formData, patients]);

  const handleFieldChange = (field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;
    
    // Debug: Log field changes
    if (process.env.NODE_ENV === 'development' && (field === 'patient_id' || field === 'reason')) {
      console.log(`🔄 Field change - ${field}:`, value);
    }
    
    const newFormData = {
      ...localFormData,
      [field]: value
    };
    
    setLocalFormData(newFormData);
    
    // Sync with parent component in real-time
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  };

  const handlePatientChange = (patient: Patient | null) => {
    // Debug: Log patient selection
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Patient selected:', patient?.full_name, 'ID:', patient?.id);
    }
    
    setSelectedPatient(patient);
    const newFormData = {
      ...localFormData,
      patient_id: patient?.id || ''
    };
    
    setLocalFormData(newFormData);
    
    // Sync with parent component in real-time
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  };

  const handleSubmit = () => {
    // Debug: Log current form state before submission
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 AppointmentDialog Debug');
      console.log('📋 localFormData:', localFormData);
      console.log('👤 selectedPatient:', selectedPatient);
      console.log('📝 Form validation check:');
      console.log('  - patient_id:', localFormData.patient_id);
      console.log('  - reason:', localFormData.reason);
      console.log('  - date_time:', localFormData.date_time);
      console.groupEnd();
    }
    
    onSubmit(localFormData);
  };

  const getFieldError = (field: string): string => {
    return fieldErrors[field] || '';
  };

  const hasFieldError = (field: string): boolean => {
    return Boolean(getFieldError(field));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6" component="span">
            {isEditing ? 'Editar Cita' : 'Nueva Cita'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Error Messages */}
        <Collapse in={!!formErrorMessage}>
          <Box sx={{ mb: 2 }}>
            <ErrorRibbon message={formErrorMessage} />
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Patient Selection */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Paciente
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Autocomplete
                  options={patients}
                  getOptionLabel={(option) => formatPatientNameWithAge(option)}
                  value={selectedPatient}
                  onChange={(_, newValue) => handlePatientChange(newValue)}
                  disabled={isReadOnly}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Paciente"
                      required
                      error={hasFieldError('patient_id') || (!localFormData.patient_id)}
                      helperText={getFieldError('patient_id') || (!localFormData.patient_id ? 'Campo requerido' : '')}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {option.first_name[0]}{option.paternal_surname[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{formatPatientNameWithAge(option)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.primary_phone} • {option.email}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  loading={patients.length === 0}
                  loadingText="Cargando pacientes..."
                  noOptionsText="No se encontraron pacientes"
                />
              </Box>
              <Button
                variant="outlined"
                onClick={onNewPatient}
                startIcon={<PersonAddIcon />}
                sx={{ whiteSpace: 'nowrap', height: 40 }}
                disabled={isReadOnly}
              >
                Nuevo
              </Button>
            </Box>
          </Box>

          {/* Selected Patient Information */}
          {selectedPatient && (
            <Paper sx={{ 
              p: 3, 
              bgcolor: 'primary.50', 
              border: '1px solid', 
              borderColor: 'primary.200', 
              borderRadius: '12px' 
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: 'primary.main',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1 
                }}>
                  <PersonIcon sx={{ fontSize: 20 }} />
                  Datos del Paciente
                </Typography>
                {onEditPatient && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => onEditPatient(selectedPatient)}
                    disabled={isReadOnly}
                    sx={{
                      bgcolor: 'white',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.100'
                      }
                    }}
                  >
                    Editar Datos
                  </Button>
                )}
              </Box>
              
              {/* Patient Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontSize: '1.2rem' }}>
                  {selectedPatient.first_name[0]}{selectedPatient.paternal_surname[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {selectedPatient.full_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPatient.birth_date ? `${calculateAge(selectedPatient.birth_date)} años` : 'Edad no registrada'}
                  </Typography>
                </Box>
              </Box>

              {/* Patient Details Grid */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 2 
              }}>
                <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                  <Typography variant="body2" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 0.5,
                    fontWeight: 600,
                    color: 'text.secondary'
                  }}>
                    <PhoneIcon sx={{ fontSize: 16 }} />
                    Contacto
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Teléfono:</strong> {selectedPatient.primary_phone || 'No registrado'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong> {selectedPatient.email || 'No registrado'}
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                  <Typography variant="body2" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 0.5,
                    fontWeight: 600,
                    color: 'text.secondary'
                  }}>
                    <BadgeIcon sx={{ fontSize: 16 }} />
                    Identificación
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>ID:</strong> {selectedPatient.id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>CURP:</strong> {selectedPatient.curp || 'No registrada'}
                  </Typography>
                </Box>

                {(selectedPatient.blood_type || selectedPatient.insurance_type) && (
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: '8px' }}>
                    <Typography variant="body2" sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mb: 0.5,
                      fontWeight: 600,
                      color: 'text.secondary'
                    }}>
                      <HospitalIcon sx={{ fontSize: 16 }} />
                      Información Médica
                    </Typography>
                    {selectedPatient.blood_type && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Tipo de Sangre:</strong> 
                        <Chip 
                          label={selectedPatient.blood_type} 
                          size="small" 
                          color="error" 
                          variant="filled" 
                          sx={{ ml: 1, fontWeight: 600 }} 
                        />
                      </Typography>
                    )}
                    {selectedPatient.insurance_type && (
                      <Typography variant="body2">
                        <strong>Seguro:</strong> {selectedPatient.insurance_type}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              {/* Medical Information Alert - Always show when patient is selected */}
              <Alert 
                severity="warning" 
                sx={{ mt: 2, bgcolor: 'warning.50', borderColor: 'warning.200' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  ⚠️ Información Médica Importante:
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Alergias:</strong> {selectedPatient.allergies || '(Sin información registrada)'}
                </Typography>
                {selectedPatient.chronic_conditions && (
                  <Typography variant="body2">
                    <strong>Condiciones Crónicas:</strong> {selectedPatient.chronic_conditions}
                  </Typography>
                )}
              </Alert>
            </Paper>
          )}

          {/* Date and Time Row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Date and Time */}
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon sx={{ fontSize: 20 }} />
                Fecha y Hora
              </Typography>
              <TextField
                fullWidth
                type="datetime-local"
                value={localFormData.date_time || ''}
                onChange={handleFieldChange('date_time')}
                size="small"
                error={hasFieldError('date_time')}
                helperText={getFieldError('date_time')}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  readOnly: isReadOnly
                }}
              />
            </Box>

            {/* Duration - Auto-calculated from doctor's profile */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon sx={{ fontSize: 20 }} />
                Duración
              </Typography>
              <TextField
                fullWidth
                label="Minutos (del perfil del doctor)"
                value={doctorProfile?.appointment_duration || 30}
                size="small"
                InputProps={{
                  readOnly: true
                }}
                helperText="Se obtiene automáticamente del perfil del doctor"
              />
            </Box>
          </Box>

          {/* Type and Status Row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Appointment Type */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Tipo de Cita
              </Typography>
              <FormControl fullWidth size="small" error={hasFieldError('appointment_type')}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={localFormData.appointment_type || ''}
                  onChange={handleFieldChange('appointment_type')}
                  label="Tipo"
                  disabled={isReadOnly}
                >
                  <MenuItem value="consultation">Consulta</MenuItem>
                  <MenuItem value="follow_up">Seguimiento</MenuItem>
                  <MenuItem value="emergency">Emergencia</MenuItem>
                  <MenuItem value="routine_check">Revisión de Rutina</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Status */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Estado
              </Typography>
              <FormControl fullWidth size="small" error={hasFieldError('status')}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={localFormData.status || 'scheduled'}
                  onChange={handleFieldChange('status')}
                  label="Estado"
                  disabled={isReadOnly}
                >
                  <MenuItem value="scheduled">Programada</MenuItem>
                  <MenuItem value="confirmed">Confirmada</MenuItem>
                  <MenuItem value="in_progress">En Progreso</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                  <MenuItem value="no_show">No Asistió</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Cancellation Reason - Only show when status is 'cancelled' */}
          {localFormData.status === 'cancelled' && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotesIcon sx={{ fontSize: 20 }} />
                Razón de Cancelación
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Describe la razón de la cancelación"
                value={localFormData.cancelled_reason || ''}
                onChange={handleFieldChange('cancelled_reason')}
                size="small"
                error={hasFieldError('cancelled_reason') || (localFormData.status === 'cancelled' && (!localFormData.cancelled_reason || localFormData.cancelled_reason.trim() === ''))}
                helperText={getFieldError('cancelled_reason') || (localFormData.status === 'cancelled' && (!localFormData.cancelled_reason || localFormData.cancelled_reason.trim() === '') ? 'Campo requerido para citas canceladas' : '')}
                placeholder="Ej: Enfermedad del paciente, emergencia familiar, reagendamiento, etc."
                InputProps={{
                  readOnly: false // Cancellation reason is ALWAYS editable when status is cancelled
                }}
              />
            </Box>
          )}

          {/* Reason */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Motivo de la Consulta
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Describe el motivo de la cita"
              value={localFormData.reason || ''}
              onChange={handleFieldChange('reason')}
              size="small"
              error={hasFieldError('reason') || (!localFormData.reason || localFormData.reason.trim() === '')}
              helperText={getFieldError('reason') || ((!localFormData.reason || localFormData.reason.trim() === '') ? 'Campo requerido' : '')}
              placeholder="Ej: Consulta general, dolor de cabeza, revisión, etc."
              InputProps={{
                readOnly: isReadOnly
              }}
            />
          </Box>

          {/* Priority */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon sx={{ fontSize: 20 }} />
              Prioridad
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Prioridad</InputLabel>
              <Select
                value={localFormData.priority || 'normal'}
                onChange={handleFieldChange('priority')}
                label="Prioridad"
                disabled={isReadOnly}
              >
                <MenuItem value="low">Baja</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="urgent">Urgente</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Preparation Instructions */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Instrucciones de Preparación
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Instrucciones de preparación"
              value={localFormData.preparation_instructions || ''}
              onChange={handleFieldChange('preparation_instructions')}
              size="small"
              placeholder="Ej: Ayuno de 12 horas, traer estudios previos..."
              InputProps={{
                readOnly: isReadOnly
              }}
            />
          </Box>

          {/* Notes */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Notas Adicionales
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notas opcionales"
              value={localFormData.notes || ''}
              onChange={handleFieldChange('notes')}
              size="small"
              error={hasFieldError('notes')}
              helperText={getFieldError('notes')}
              InputProps={{
                readOnly: isReadOnly
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          color="inherit"
          disabled={loading}
        >
          Cancelar
        </Button>
        {!isReadOnly && (
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !localFormData.patient_id || !localFormData.date_time}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cita')}
          </Button>
        )}
        {isReadOnly && localFormData.status === 'cancelled' && (
          <Button 
            onClick={handleSubmit}
            variant="outlined"
            disabled={loading || !localFormData.cancelled_reason?.trim()}
            sx={{ 
              minWidth: 120,
              borderColor: 'primary.main',
              color: 'primary.main'
            }}
          >
            {loading ? 'Guardando...' : 'Actualizar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
});

AppointmentDialog.displayName = 'AppointmentDialog';

export default AppointmentDialog;