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
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  Notes as NotesIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  LocalHospital as HospitalIcon,
  MedicalServices as MedicalServicesIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Patient, AppointmentFormData, PatientFormData } from '../../types';
import { apiService } from '../../services/api';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useToast } from '../common/ToastNotification';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';

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
  onSubmit: (formData: AppointmentFormData) => Promise<void>;
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
  const { showSuccess, showError } = useToast();
  
  // State for available time slots
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [localFormData, setLocalFormData] = useState<AppointmentFormData>(formData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  
  // Auto-scroll to error when it appears
  const { errorRef: validationErrorRef } = useScrollToErrorInDialog(validationError);
  const { errorRef: formErrorRef } = useScrollToErrorInDialog(formErrorMessage);
  
  // State for inline patient creation (first visit)
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    primary_phone: ''
  });

  // Function to load available times for a specific date
  const loadAvailableTimes = async (date: string) => {
    if (!date) return;
    
    try {
      setLoadingTimes(true);
      const response = await apiService.getAvailableTimesForBooking(date);
      setAvailableTimes(response.available_times || []);
    } catch (error) {
      console.error('Error loading available times:', error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  // Handle date change and load available times
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedTime(''); // Reset selected time when date changes
    
    if (newDate) {
      // Extract date part for API call (YYYY-MM-DD)
      const dateOnly = newDate.split('T')[0];
      loadAvailableTimes(dateOnly);
    } else {
      setAvailableTimes([]);
    }
  };

  // Handle time selection
  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    
    if (selectedDate && time) {
      // Combine date and time for datetime-local input
      const dateOnly = selectedDate.split('T')[0];
      const dateTime = `${dateOnly}T${time}`;
      
      // Update form data
      const updatedFormData = { ...localFormData, date_time: dateTime };
      setLocalFormData(updatedFormData);
      onFormDataChange?.(updatedFormData);
    }
  };

  // Handle new patient data changes
  const handleNewPatientFieldChange = (field: string, value: string) => {
    setNewPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Determine if appointment fields should be enabled
  const areAppointmentFieldsEnabled = () => {
    if (!localFormData.appointment_type) return false;
    
    if (localFormData.appointment_type === 'primera vez') {
      // For "primera vez", enable if patient is selected OR new patient data is provided
      return localFormData.patient_id || (
        newPatientData.first_name && 
        newPatientData.paternal_surname && 
        newPatientData.primary_phone
      );
    } else {
      return selectedPatient !== null;
    }
  };

  // Determine if patient selection should be enabled (separate from appointment fields)
  const isPatientSelectionEnabled = () => {
    return patients.length > 0 && localFormData.appointment_type;
  };

  // Determine if the form is complete and ready to submit
  const isFormComplete = () => {
    // Check if appointment type is selected (or automatically set when no patients)
    if (!localFormData.appointment_type && patients.length > 0) {
      return false;
    }
    
    // Check patient data based on appointment type
    if (localFormData.appointment_type === 'primera vez' || patients.length === 0) {
      // For "primera vez", check if patient is selected OR new patient data is provided
      // Only name, surname and phone are required for appointment creation
      if (!localFormData.patient_id && (!newPatientData.first_name || 
          !newPatientData.paternal_surname || 
          !newPatientData.primary_phone)) {
        return false;
      }
    } else {
      // For other types, check if patient is selected
      if (!selectedPatient || !localFormData.patient_id) {
        return false;
      }
    }
    
    // Check if date and time are selected
    if (!selectedDate || !selectedTime) {
      return false;
    }
    
    // Additional validation: ensure selected time is in available times
    if (selectedTime && availableTimes.length > 0) {
      const isTimeValid = availableTimes.some(timeSlot => timeSlot.time === selectedTime);
      if (!isTimeValid) {
        return false;
      }
    }
    
    return true;
  };

  // Get validation error message
  const getValidationErrorMessage = () => {
    const errors = [];
    
    // Check appointment type
    if (!localFormData.appointment_type && patients.length > 0) {
      errors.push('Selecciona el tipo de consulta');
    }
    
    // Check patient data
    if (localFormData.appointment_type === 'primera vez' || patients.length === 0) {
      // For "primera vez", check if patient is selected OR new patient data is provided
      if (!localFormData.patient_id && (!newPatientData.first_name || 
          !newPatientData.paternal_surname || 
          !newPatientData.primary_phone)) {
        errors.push('Selecciona un paciente existente o completa los datos básicos del nuevo paciente (nombre, apellido y teléfono son requeridos)');
      }
      
      // If creating new patient, validate required fields
      if (!localFormData.patient_id && newPatientData.first_name) {
        if (!newPatientData.first_name) errors.push('El nombre es requerido');
        if (!newPatientData.paternal_surname) errors.push('El apellido paterno es requerido');
        if (!newPatientData.primary_phone) errors.push('El teléfono es requerido');
        // birth_date and gender are optional for first visit appointments
      }
    } else {
      if (!selectedPatient || !localFormData.patient_id) {
        errors.push('Selecciona un paciente');
      }
    }
    
    // Check date and time with more specific messages
    if (!selectedDate) {
      errors.push('La fecha es requerida');
    } else if (!selectedTime) {
      // If date is selected but no time, be more specific
      if (availableTimes.length === 0) {
        errors.push('No hay horarios disponibles para la fecha seleccionada');
      } else {
        errors.push('Debe seleccionar un horario disponible para la cita');
      }
    } else if (selectedTime && availableTimes.length > 0) {
      // Check if selected time is valid
      const isTimeValid = availableTimes.some(timeSlot => timeSlot.time === selectedTime);
      if (!isTimeValid) {
        errors.push('El horario seleccionado no está disponible');
      }
    }
    
    return errors.length > 0 ? errors.join(', ') : '';
  };

  // Determine if fields should be read-only
  // RULE: Read-only ONLY for EXISTING appointments (isEditing=true) that were originally cancelled
  // New appointments (isEditing=false) are NEVER read-only
  const isReadOnly = isEditing && 
                     formData.status === 'cancelled' && 
                     localFormData.status === 'cancelled';

  // Read-only logic for cancelled appointments

  // Update local form data when props change
  useEffect(() => {
    // Set default status for new appointments
    const updatedFormData = {
      ...formData,
      // Always set status to 'confirmed' for new appointments, preserve existing status for edits
      status: formData.status || 'confirmed',
      // If no patients exist, automatically set appointment type to primera vez
      appointment_type: patients.length === 0 ? 'primera vez' : formData.appointment_type
    };
    setLocalFormData(updatedFormData);
    
    if (formData.patient_id && patients.length > 0) {
      const patient = patients.find(p => p.id === formData.patient_id);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
    
    // Initialize date and time from existing formData when dialog opens
    if (open && formData.date_time) {
      const dateTime = formData.date_time;
      const [datePart, timePart] = dateTime.split('T');
      setSelectedDate(dateTime);
      setSelectedTime(timePart || '');
      
      // Load available times for the date
      if (datePart) {
        loadAvailableTimes(datePart);
      }
    } else if (open) {
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
    }
  }, [formData, patients, open]);

  const handleFieldChange = (field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;
    
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
    setSelectedPatient(patient);
    const newFormData = {
      ...localFormData,
      patient_id: patient?.id || ''
    };
    
    setLocalFormData(newFormData);
    
    // Clear new patient data when selecting existing patient
    if (patient) {
      setNewPatientData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        birth_date: '',
        gender: '',
        primary_phone: ''
      });
    }
    
    // Sync with parent component in real-time
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  };

  const handleSubmit = async () => {
    // Clear previous validation errors
    setValidationError('');
    
    // Debug logging
    console.log('Selected Date:', selectedDate);
    console.log('Selected Time:', selectedTime);
    console.log('Available Times:', availableTimes.length);
    console.log('Form Complete:', isFormComplete());
    
    // Validate that all required fields are complete before proceeding
    if (!isFormComplete()) {
      const errorMessage = getValidationErrorMessage();
      setValidationError(errorMessage);
      return;
    }
    
    // Additional explicit validation for time slot
    if (!selectedTime || selectedTime.trim() === '') {
      setValidationError('Debe seleccionar un horario disponible para la cita');
      return;
    }
    
    // Validate that selected time exists in available times
    if (availableTimes.length > 0) {
      const isTimeValid = availableTimes.some(timeSlot => timeSlot.time === selectedTime);
      if (!isTimeValid) {
        setValidationError('El horario seleccionado no está disponible');
        return;
      }
    } else {
      setValidationError('No hay horarios disponibles para la fecha seleccionada');
      return;
    }
    

    // Handle "Primera vez" (first visit) - create patient inline if no patient selected
    if (localFormData.appointment_type === 'primera vez' && !localFormData.patient_id) {
      try {
        // Create patient first - map to PatientFormData interface
        const patientData: PatientFormData = {
          // Basic information (required)
          first_name: newPatientData.first_name,
          paternal_surname: newPatientData.paternal_surname,
          maternal_surname: newPatientData.maternal_surname || '',
          email: '',
          date_of_birth: newPatientData.birth_date,
          birth_date: newPatientData.birth_date,
          phone: newPatientData.primary_phone,
          primary_phone: newPatientData.primary_phone,
          gender: newPatientData.gender,
          civil_status: '',
          
          // Personal details
          birth_city: '',
          birth_state_id: '',
          
          // Address (all optional for first visit)
          address: '',
          address_street: '',
          city: '',
          address_city: '',
          state: '',
          address_state_id: '',
          zip_code: '',
          country: '',
          address_postal_code: '',
          
          // Emergency contact (optional)
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          
          // Medical information (optional)
          current_medications: '',
          medical_history: '',
          chronic_conditions: '',
          insurance_provider: '',
          insurance_number: '',
          
          // Mexican official fields (optional)
          curp: '',
          rfc: '',
          
          // Technical fields
          active: true,
          is_active: true
        };

        const newPatient = await apiService.createPatient(patientData);

        // Now create appointment with the new patient
        const finalFormData = {
          ...localFormData,
          patient_id: newPatient.id,
          status: localFormData.status || 'confirmed'
        };

        // Call onSubmit directly with the final form data
        await onSubmit(finalFormData);
        
        // Show success notification
        showSuccess(
          'Cita creada exitosamente',
          '¡Operación completada!'
        );
        
        // Close dialog after a brief delay
        setTimeout(() => {
          onClose();
        }, 1000);
        
      } catch (error) {
        console.error('Error creating patient:', error);
        showError(
          'Error al crear la cita',
          'Error en la operación'
        );
      }
    } else {
      // Regular flow for existing patients
      const finalFormData = {
        ...localFormData,
        status: localFormData.status || 'confirmed'
      };
      
      // Call onSubmit directly with the final form data
      try {
        await onSubmit(finalFormData);
        
        // Show success notification
        if (isEditing) {
          showSuccess(
            'Cita actualizada exitosamente',
            '¡Edición completada!'
          );
        } else {
          showSuccess(
            'Cita creada exitosamente',
            '¡Creación completada!'
          );
        }
        
        // Close dialog after a brief delay
        setTimeout(() => {
          onClose();
        }, 1000);
        
      } catch (error) {
        console.error('Error saving appointment:', error);
        showError(
          'Error al guardar la cita',
          'Error en la operación'
        );
      }
    }
  };

  const getFieldError = (field: string): string => {
    return fieldErrors[field] || '';
  };

  const hasFieldError = (field: string): boolean => {
    return Boolean(getFieldError(field));
  };

  const handleClose = () => {
    onClose();
  };
  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
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
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Error Messages */}
        <Collapse in={!!formErrorMessage}>
          <Box ref={formErrorRef} sx={{ mb: 2 }}>
            <ErrorRibbon message={formErrorMessage} />
          </Box>
        </Collapse>
        
        {/* Validation Error Messages */}
        {validationError && (
          <Box 
            ref={validationErrorRef}
            data-testid="validation-error-message"
            sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: 'error.main', 
              borderRadius: 1,
              backgroundColor: '#d32f2f !important' // Force red background
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {validationError}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* STEP 1: Appointment Type - Only show if there are existing patients */}
          {patients.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MedicalServicesIcon sx={{ fontSize: 20 }} />
                Tipo de Consulta - obligatorio
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <FormControl fullWidth size="small" error={hasFieldError('appointment_type')}>
                <Select
                  value={localFormData.appointment_type || ''}
                  onChange={handleFieldChange('appointment_type')}
                  disabled={isReadOnly}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    <em>Seleccione una opción</em>
                  </MenuItem>
                  <MenuItem value="primera vez">Primera vez</MenuItem>
                  <MenuItem value="seguimiento">Seguimiento</MenuItem>
                </Select>
                {hasFieldError('appointment_type') && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {getFieldError('appointment_type')}
                  </Typography>
                )}
              </FormControl>
            </Box>
          )}

          {/* STEP 2: Patient Section - Conditional based on appointment type or no patients */}
          {(localFormData.appointment_type || patients.length === 0) && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Seleccionar Paciente
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              
              {/* Patient Selection Logic */}
              {patients.length === 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No hay pacientes registrados. Crear un nuevo paciente para continuar.
                  </Typography>
                  {onNewPatient && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={onNewPatient}
                      sx={{ mt: 1 }}
                    >
                      Crear Nuevo Paciente
                    </Button>
                  )}
                </Box>
              ) : localFormData.appointment_type === 'primera vez' && !localFormData.patient_id ? (
                // Show inline patient creation for "primera vez"
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                    Complete los datos para crear un nuevo paciente:
                  </Typography>
                  <Box sx={{ bgcolor: 'primary.50', p: 3, borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="body2" color="primary.main" sx={{ mb: 2, fontWeight: 500 }}>
                      📝 Complete los datos básicos del nuevo paciente
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <TextField
                        label="Nombre(s)"
                        value={newPatientData.first_name}
                        onChange={(e) => handleNewPatientFieldChange('first_name', e.target.value)}
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
                        onChange={(e) => handleNewPatientFieldChange('paternal_surname', e.target.value)}
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
                        onChange={(e) => handleNewPatientFieldChange('maternal_surname', e.target.value)}
                        size="small"
                        disabled={isReadOnly}
                        placeholder="Apellido Materno - opcional"
                      />
                      <TextField
                        label="Teléfono"
                        value={newPatientData.primary_phone}
                        onChange={(e) => handleNewPatientFieldChange('primary_phone', e.target.value)}
                        size="small"
                        required
                        disabled={isReadOnly}
                        placeholder="Teléfono - obligatorio"
                        error={hasFieldError('newPatient.primary_phone')}
                        helperText={getFieldError('newPatient.primary_phone')}
                      />
                    </Box>
                  </Box>
                </Box>
              ) : (
                // Show patient selection for "seguimiento" or when patient is selected
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Autocomplete
                      options={patients}
                      getOptionLabel={(option) => formatPatientNameWithAge(option)}
                      value={selectedPatient}
                      onChange={(_, newValue) => handlePatientChange(newValue)}
                      disabled={isReadOnly || !isPatientSelectionEnabled()}
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
                </Box>
              )}
            </Box>
          )}
          
          {/* STEP 3: Date, Time and Other Fields */}
          {/* Date and Time Row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Date Selection */}
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon sx={{ fontSize: 20 }} />
                Fecha - obligatorio
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Seleccionar fecha - obligatorio"
                  value={selectedDate ? new Date(selectedDate) : null}
                  minDate={new Date()}
                  onChange={(newValue) => {
                    if (newValue) {
                      const isoDate = newValue.toISOString().split('T')[0] + 'T00:00';
                      handleDateChange(isoDate);
                    } else {
                      handleDateChange('');
                    }
                  }}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      error: hasFieldError('date_time'),
                      helperText: hasFieldError('date_time') ? getFieldError('date_time') : 'Selecciona una fecha para ver horarios disponibles'
                    }
                  }}
                />
              </LocalizationProvider>
            </Box>

            {/* Time Selection */}
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon sx={{ fontSize: 20 }} />
                Hora Disponible - obligatorio
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                {loadingTimes && <CircularProgress size={16} />}
              </Typography>
              <FormControl 
                fullWidth 
                size="small" 
                error={hasFieldError('date_time') || (validationError && (!selectedTime || selectedTime.trim() === ''))}
                required
              >
                <InputLabel>Seleccionar horario - obligatorio</InputLabel>
                <Select
                  value={selectedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  label="Seleccionar horario - obligatorio"
                  disabled={!selectedDate || loadingTimes || isReadOnly || availableTimes.length === 0}
                >
                  {availableTimes.map((timeSlot) => (
                    <MenuItem key={timeSlot.time} value={timeSlot.time}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography>{timeSlot.display}</Typography>
                        <Chip 
                          label={`${timeSlot.duration_minutes} min`} 
                          size="small" 
                          variant="outlined" 
                          color="primary"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {!loadingTimes && selectedDate && availableTimes.length === 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No hay horarios disponibles para esta fecha
                  </Alert>
                )}
                {!selectedDate && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Selecciona primero una fecha
                  </Alert>
                )}
                {validationError && (!selectedTime || selectedTime.trim() === '') && selectedDate && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {availableTimes.length > 0 
                      ? 'Debe seleccionar un horario disponible' 
                      : 'No hay horarios disponibles para esta fecha'
                    }
                  </Typography>
                )}
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
          {/* Priority */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon sx={{ fontSize: 20 }} />
              Prioridad - opcional
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Prioridad - opcional</InputLabel>
              <Select
                value={localFormData.priority || 'normal'}
                onChange={handleFieldChange('priority')}
                label="Prioridad - opcional"
                disabled={isReadOnly}
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Preparation Instructions */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Instrucciones de Preparación - opcional
              <Typography component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.875rem', fontWeight: 400 }}>(Opcional)</Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Instrucciones de preparación - opcional"
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
              Notas Adicionales - opcional
              <Typography component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.875rem', fontWeight: 400 }}>(Opcional)</Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notas opcionales - opcional"
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
            disabled={loading}
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
