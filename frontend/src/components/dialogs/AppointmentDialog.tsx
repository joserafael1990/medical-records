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
  MedicalServices as MedicalServicesIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Patient, AppointmentFormData, PatientFormData, Office, AppointmentType } from '../../types';
import { apiService } from '../../services/api';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useToast } from '../common/ToastNotification';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { Switch, FormControlLabel } from '@mui/material';

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
  // Infer edit mode defensively in case parent doesn't pass isEditing correctly
  const computedIsEditing = isEditing || Boolean((formData as any)?.id) || Boolean(formData?.patient_id && formData?.appointment_date);
  // Debug props
  console.log('[AppointmentDialog] props isEditing:', isEditing, 'computedIsEditing:', computedIsEditing,
    'auto_reminder_enabled:', (formData as any)?.auto_reminder_enabled,
    'auto_reminder_offset_minutes:', (formData as any)?.auto_reminder_offset_minutes);
  
  // State for available time slots
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [localFormData, setLocalFormData] = useState<AppointmentFormData>(formData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isOnlineAppointment, setIsOnlineAppointment] = useState(false);

  // Function to format time from HH:MM to AM/PM format
  const formatTimeToAMPM = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
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
    primary_phone: '',
    email: '',
    home_address: '',
    address_city: '',
    address_postal_code: '',
    address_country_id: '',
    address_state_id: '',
    curp: '',
    rfc: '',
    civil_status: '',
    birth_city: '',
    birth_country_id: '',
    birth_state_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    insurance_provider: '',
    insurance_number: ''
  });
  
  // State for advanced patient data
  const [showAdvancedPatientData, setShowAdvancedPatientData] = useState<boolean>(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [birthStates, setBirthStates] = useState<any[]>([]);
  const [emergencyRelationships, setEmergencyRelationships] = useState<any[]>([]);

  // Function to load available times for a specific date
  const loadAvailableTimes = async (date: string) => {
    if (!date) return [];
    
    try {
      setLoadingTimes(true);
      console.log('🔍 Loading available times for date:', date);
      const response = await apiService.getAvailableTimesForBooking(date);
      const times = response.available_times || [];
      console.log('🔍 Found', times.length, 'available times');
      setAvailableTimes(times);
      return times;
    } catch (error) {
      console.error('❌ Error loading available times:', error);
      setAvailableTimes([]);
      return [];
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

  // Handle country change for new patients
  const handleNewPatientCountryChange = async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    handleNewPatientFieldChange(field, countryId);
    
    if (countryId) {
      try {
        const statesData = await apiService.getStates(parseInt(countryId));
        if (field === 'address_country_id') {
          setStates(statesData);
        } else {
          setBirthStates(statesData);
        }
      } catch (error) {
        console.error('Error loading states:', error);
      }
    }
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
      // Required fields: name, surname, phone, and gender
      if (!localFormData.patient_id && (!newPatientData.first_name || 
          !newPatientData.paternal_surname || 
          !newPatientData.primary_phone ||
          !newPatientData.gender)) {
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
          !newPatientData.primary_phone ||
          !newPatientData.gender)) {
        errors.push('Selecciona un paciente existente o completa los datos básicos del nuevo paciente (nombre, apellido, teléfono y género son requeridos)');
      }
      
      // If creating new patient, validate required fields
      if (!localFormData.patient_id && newPatientData.first_name) {
        if (!newPatientData.first_name) errors.push('El nombre es requerido');
        if (!newPatientData.paternal_surname) errors.push('El apellido paterno es requerido');
        if (!newPatientData.primary_phone) errors.push('El teléfono es requerido');
        if (!newPatientData.gender) errors.push('El género es requerido');
        // birth_date is optional for first visit appointments
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

  // Load initial data (countries, emergency relationships)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [countriesData, relationshipsData] = await Promise.all([
          apiService.getCountries(),
          apiService.getEmergencyRelationships()
        ]);
        setCountries(countriesData);
        setEmergencyRelationships(relationshipsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Initialize form data when dialog opens (only once when dialog opens)
  useEffect(() => {
    if (open) {
      console.log('🚀 Initializing form data on dialog open');
      console.log('  - formData.appointment_type:', formData.appointment_type);
      console.log('  - patients.length:', patients.length);
      
      // Set default status for new appointments
      const updatedFormData = {
        ...formData,
        // Always set status to 'confirmed' for new appointments, preserve existing status for edits
        status: formData.status || 'confirmed',
        // If no patients exist, automatically set appointment type to primera vez
        // Normalize appointment_type to lowercase to match select options
        appointment_type: formData.appointment_type ? formData.appointment_type.toLowerCase() : (patients.length === 0 ? 'primera vez' : ''),
        // Ensure auto reminder fields are initialized from formData or sensible defaults
        auto_reminder_enabled: (formData as any)?.auto_reminder_enabled ?? false,
        auto_reminder_offset_minutes: (formData as any)?.auto_reminder_offset_minutes ?? 360
      };
      
      console.log('  - Final appointment_type:', updatedFormData.appointment_type);
      setLocalFormData(updatedFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only run when dialog opens, not when formData or patients change

  // Handle patient selection when formData.patient_id changes
  useEffect(() => {
    if (formData.patient_id && patients.length > 0) {
      // Try both string and number comparison
      const patient = patients.find(p => p.id === formData.patient_id || p.id === String(formData.patient_id) || p.id === Number(formData.patient_id));
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [formData.patient_id, patients]);

  // Handle appointment type changes - clear patient data when switching to "seguimiento"
  useEffect(() => {
    console.log('🔄 useEffect appointment_type changed:', localFormData.appointment_type);
    if (localFormData.appointment_type === 'seguimiento') {
      console.log('🧹 Clearing new patient data for seguimiento');
      // Clear new patient data when switching to follow-up
      setNewPatientData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        birth_date: '',
        gender: '',
        primary_phone: '',
        email: '',
        curp: '',
        rfc: '',
        civil_status: '',
        birth_city: '',
        birth_country_id: '',
        birth_state_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: ''
      });
    }
  }, [localFormData.appointment_type]);

  // Handle date/time initialization for editing
  useEffect(() => {
    if (open && formData.date_time && isEditing) {
      const dateTime = formData.date_time;
      const [datePart, timePart] = dateTime.split('T');
      setSelectedDate(dateTime);
      
      // Load available times for the date first, then set the time
      if (datePart) {
        loadAvailableTimes(datePart).then((times) => {
          // Set the time after available times are loaded
          if (timePart) {
            // Always set the original appointment time, regardless of available slots
            setSelectedTime(timePart);
          }
        });
      }
    } else if (open && !isEditing) {
      // Reset everything for new appointments
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
    }
  }, [open, isEditing, formData.date_time]);

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
    // Never execute this path when editing an existing appointment
    if (!computedIsEditing && localFormData.appointment_type === 'primera vez' && !localFormData.patient_id) {
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
          medical_history: '',
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
        
        // Show success notification (use computed edit mode)
        if (computedIsEditing) {
          showSuccess(
            'Cita actualizada exitosamente',
            '¡Edición completada!'
          );
        } else {
          showSuccess(
            'Cita creada exitosamente',
            '¡Operación completada!'
          );
        }
        
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
        
        // Show success notification (use computed edit mode)
        if (computedIsEditing) {
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
    // Reset available times when closing dialog
    setAvailableTimes([]);
    setSelectedDate('');
    setSelectedTime('');
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
            {computedIsEditing ? 'Editar Cita' : 'Nueva Cita'}
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
              {(() => {
                console.log('🔍 Debug Patient Selection Logic:');
                console.log('  - patients.length:', patients.length);
                console.log('  - localFormData.appointment_type:', localFormData.appointment_type);
                
                // More explicit condition
                const shouldShowNewPatientForm = patients.length === 0 || localFormData.appointment_type === 'primera vez';
                console.log('  - shouldShowNewPatientForm:', shouldShowNewPatientForm);
                
                if (shouldShowNewPatientForm) {
                  console.log('  - Showing new patient form');
                } else {
                  console.log('  - Showing existing patient selector');
                }
                
                return shouldShowNewPatientForm;
              })() ? (
                // Show inline patient creation for "primera vez" or when no patients
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {patients.length === 0 ? 'Crear nuevo paciente:' : 'O complete los datos para crear un nuevo paciente:'}
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
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                        <DatePicker
                          label="Fecha de Nacimiento - opcional"
                          value={newPatientData.birth_date ? new Date(newPatientData.birth_date) : null}
                          onChange={(newValue) => {
                            const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                            handleNewPatientFieldChange('birth_date', dateStr);
                          }}
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              placeholder: 'Fecha de Nacimiento - opcional'
                            }
                          }}
                        />
                      </LocalizationProvider>
                      <FormControl size="small" fullWidth required>
                        <InputLabel>Género *</InputLabel>
                        <Select
                          value={newPatientData.gender || ''}
                          onChange={(e) => handleNewPatientFieldChange('gender', e.target.value)}
                          label="Género *"
                          required
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
                          onClick={() => setShowAdvancedPatientData(true)}
                          startIcon={<EditIcon />}
                          sx={{ minWidth: 200 }}
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
                              onChange={(e) => handleNewPatientFieldChange('primary_phone', e.target.value)}
                              size="small"
                              required
                            />
                            <TextField
                              label="Email"
                              type="email"
                              value={newPatientData.email || ''}
                              onChange={(e) => handleNewPatientFieldChange('email', e.target.value)}
                              size="small"
                              helperText={newPatientData.email && newPatientData.email !== '' && !newPatientData.email.includes('@') ? 'El email debe tener un formato válido' : ''}
                              error={newPatientData.email && newPatientData.email !== '' && !newPatientData.email.includes('@')}
                            />
                            <TextField
                              label="Dirección"
                              value={newPatientData.home_address || ''}
                              onChange={(e) => handleNewPatientFieldChange('home_address', e.target.value)}
                              size="small"
                              fullWidth
                              sx={{ gridColumn: '1 / -1' }}
                            />
                            <TextField
                              label="Ciudad"
                              value={newPatientData.address_city || ''}
                              onChange={(e) => handleNewPatientFieldChange('address_city', e.target.value)}
                              size="small"
                            />
                            <TextField
                              label="Código Postal"
                              value={newPatientData.address_postal_code || ''}
                              onChange={(e) => handleNewPatientFieldChange('address_postal_code', e.target.value)}
                              size="small"
                              inputProps={{ maxLength: 5 }}
                              helperText="Opcional"
                            />
                            <FormControl size="small">
                              <InputLabel>País</InputLabel>
                              <Select
                                value={newPatientData.address_country_id || ''}
                                onChange={(e) => handleNewPatientCountryChange('address_country_id', e.target.value as string)}
                                label="País"
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
                                onChange={(e) => handleNewPatientFieldChange('address_state_id', e.target.value)}
                                label="Estado"
                                disabled={!newPatientData.address_country_id}
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
                            <TextField
                              label="CURP"
                              value={newPatientData.curp || ''}
                              onChange={(e) => handleNewPatientFieldChange('curp', e.target.value)}
                              size="small"
                              inputProps={{ maxLength: 18 }}
                              helperText={newPatientData.curp && newPatientData.curp.length !== 18 ? 'El CURP debe tener exactamente 18 caracteres' : ''}
                              error={newPatientData.curp && newPatientData.curp.length !== 18}
                            />
                            <TextField
                              label="RFC"
                              value={newPatientData.rfc || ''}
                              onChange={(e) => handleNewPatientFieldChange('rfc', e.target.value)}
                              size="small"
                              inputProps={{ maxLength: 13 }}
                              helperText={newPatientData.rfc && newPatientData.rfc.length < 10 ? 'El RFC debe tener al menos 10 caracteres' : ''}
                              error={newPatientData.rfc && newPatientData.rfc.length < 10}
                            />
                            <FormControl size="small" fullWidth>
                              <InputLabel>Estado Civil</InputLabel>
                              <Select
                                value={newPatientData.civil_status || ''}
                                onChange={(e) => handleNewPatientFieldChange('civil_status', e.target.value)}
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
                              value={newPatientData.birth_city || ''}
                              onChange={(e) => handleNewPatientFieldChange('birth_city', e.target.value)}
                              size="small"
                            />
                            <FormControl size="small">
                              <InputLabel>País de Nacimiento</InputLabel>
                              <Select
                                value={newPatientData.birth_country_id || ''}
                                onChange={(e) => handleNewPatientCountryChange('birth_country_id', e.target.value as string)}
                                label="País de Nacimiento"
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
                                onChange={(e) => handleNewPatientFieldChange('birth_state_id', e.target.value)}
                                label="Estado de Nacimiento"
                                disabled={!newPatientData.birth_country_id}
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
                              onChange={(e) => handleNewPatientFieldChange('emergency_contact_name', e.target.value)}
                              size="small"
                            />
                            <TextField
                              label="Teléfono del Contacto"
                              value={newPatientData.emergency_contact_phone || ''}
                              onChange={(e) => handleNewPatientFieldChange('emergency_contact_phone', e.target.value)}
                              size="small"
                            />
                            <FormControl size="small" fullWidth>
                              <InputLabel>Relación con el Paciente</InputLabel>
                              <Select
                                value={newPatientData.emergency_contact_relationship || ''}
                                onChange={(e) => handleNewPatientFieldChange('emergency_contact_relationship', e.target.value)}
                                label="Relación con el Paciente"
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
                              onChange={(e) => handleNewPatientFieldChange('insurance_provider', e.target.value)}
                              size="small"
                            />
                            <TextField
                              label="Código de Seguro"
                              value={newPatientData.insurance_number || ''}
                              onChange={(e) => handleNewPatientFieldChange('insurance_number', e.target.value)}
                              size="small"
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
              ) : (
                // Show patient selection for "seguimiento" or when patient is selected
                <>
                  {localFormData.appointment_type === 'seguimiento' && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                      <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon sx={{ fontSize: 16 }} />
                        Para citas de seguimiento, debe seleccionar un paciente existente
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Autocomplete
                        options={patients || []}
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
                </>
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
                  disabled={!selectedDate || loadingTimes || isReadOnly}
                >
                  {/* Show available times */}
                  {availableTimes.map((timeSlot) => (
                    <MenuItem key={timeSlot.time} value={timeSlot.time}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography>{formatTimeToAMPM(timeSlot.time)}</Typography>
                        <Chip 
                          label={`${timeSlot.duration_minutes} min`} 
                          size="small" 
                          variant="outlined" 
                          color="primary"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                  
                  {/* Show original appointment time if it's not in available times */}
                  {selectedTime && !availableTimes.find(slot => slot.time === selectedTime) && (
                    <MenuItem key={selectedTime} value={selectedTime}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography>{formatTimeToAMPM(selectedTime)}</Typography>
                        <Chip 
                          label="Cita existente" 
                          size="small" 
                          variant="outlined" 
                          color="warning"
                        />
                      </Box>
                    </MenuItem>
                  )}
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

          {/* Auto WhatsApp Reminder */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Recordatorio automático por WhatsApp
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={!!localFormData.auto_reminder_enabled}
                  onChange={(_, checked) => {
                    const updated = {
                      ...localFormData,
                      auto_reminder_enabled: checked,
                      auto_reminder_offset_minutes: checked
                        ? (localFormData.auto_reminder_offset_minutes ?? 360)
                        : localFormData.auto_reminder_offset_minutes
                    };
                    setLocalFormData(updated);
                    onFormDataChange && onFormDataChange(updated);
                  }}
                />
              }
              label="Enviar recordatorio automático"
            />

            {localFormData.auto_reminder_enabled && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '160px 160px' }, gap: 2, mt: 1 }}>
                <TextField
                  type="number"
                  size="small"
                  label="Horas antes"
                  inputProps={{ min: 0, max: 168 }}
                  value={Math.floor(((localFormData.auto_reminder_offset_minutes ?? 360) / 60))}
                  onChange={(e) => {
                    const hours = Math.max(0, Math.min(168, parseInt(e.target.value || '0', 10)));
                    const minutes = (localFormData.auto_reminder_offset_minutes ?? 360) % 60;
                    const updated = {
                      ...localFormData,
                      auto_reminder_offset_minutes: hours * 60 + minutes
                    };
                    setLocalFormData(updated);
                    onFormDataChange && onFormDataChange(updated);
                  }}
                />
                <TextField
                  type="number"
                  size="small"
                  label="Minutos antes"
                  inputProps={{ min: 0, max: 59 }}
                  value={(localFormData.auto_reminder_offset_minutes ?? 360) % 60}
                  onChange={(e) => {
                    const mins = Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10)));
                    const hours = Math.floor(((localFormData.auto_reminder_offset_minutes ?? 360) / 60));
                    const updated = {
                      ...localFormData,
                      auto_reminder_offset_minutes: hours * 60 + mins
                    };
                    setLocalFormData(updated);
                    onFormDataChange && onFormDataChange(updated);
                  }}
                />
              </Box>
            )}
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
