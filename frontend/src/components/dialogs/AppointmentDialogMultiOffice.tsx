import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Autocomplete,
  Avatar
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { AppointmentFormData, Office, AppointmentType, Patient } from '../../types';
import { apiService } from '../../services/api';
import { getMediumSelectMenuProps } from '../../utils/selectMenuProps';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { useSimpleToast } from '../common/ToastNotification';

// Helper function to calculate age
const calculateAge = (birthDate: string | Date): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

interface AppointmentDialogMultiOfficeProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (appointment: AppointmentFormData) => void;
  onNewPatient?: () => void;
  onEditPatient?: (patient: Patient) => void;
  formData?: AppointmentFormData;
  patients?: Patient[];
  isEditing?: boolean;
  loading?: boolean;
  formErrorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  onFormDataChange?: (data: AppointmentFormData) => void;
  doctorProfile?: any;
}

const AppointmentDialogMultiOffice: React.FC<AppointmentDialogMultiOfficeProps> = ({
  open,
  onClose,
  onSubmit,
  onNewPatient,
  onEditPatient,
  formData: externalFormData,
  patients: externalPatients,
  isEditing = false,
  loading: externalLoading = false,
  formErrorMessage,
  fieldErrors,
  onFormDataChange,
  doctorProfile
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    patient_id: 0,
    doctor_id: 0,
    appointment_date: '',
    appointment_type_id: 1, // Default to "Presencial"
    office_id: 0, // Changed from undefined to 0
    consultation_type: '', // No default value
    reason: '',
    notes: ''
  });

  // Estados para el flujo de selección de paciente
  const [isExistingPatient, setIsExistingPatient] = useState<boolean | null>(null);
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    primary_phone: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  // State for available time slots
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Use external data if provided, otherwise use internal state
  const currentFormData = externalFormData || formData;
  const currentPatients = externalPatients || patients;
  const currentLoading = externalLoading || loading;
  const currentError = formErrorMessage || error;

  // Hook para scroll automático a errores
  const { errorRef } = useScrollToErrorInDialog(currentError);
  
  // Hook para notificaciones de éxito
  const toast = useSimpleToast();

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { open, isEditing, hasExternalFormData: !!externalFormData });
    if (open) {
      if (isEditing && externalFormData) {
        console.log('🔍 AppointmentDialogMultiOffice - Setting form data for editing:', externalFormData);
        setFormData(externalFormData);
        // Para edición, determinar si es paciente existente basado en si hay patient_id
        setIsExistingPatient(externalFormData.patient_id && externalFormData.patient_id > 0 ? true : null);
        
        // Extract time from appointment_date for editing
        if (externalFormData.appointment_date) {
          const appointmentDate = new Date(externalFormData.appointment_date);
          const timeString = appointmentDate.toTimeString().slice(0, 5); // HH:MM format
          console.log('🔍 Extracted time from appointment_date:', timeString);
          setSelectedTime(timeString);
          setSelectedDate(externalFormData.appointment_date);
          
          // Load available times for the appointment date
          const dateOnly = externalFormData.appointment_date.split('T')[0];
          console.log('🔍 Loading available times for editing appointment date:', dateOnly);
          loadAvailableTimes(dateOnly);
        }
      } else {
        console.log('🔄 Resetting form for new appointment');
        console.log('🔄 Current isExistingPatient before reset:', isExistingPatient);
        const defaultData = {
          patient_id: 0,
          doctor_id: 0,
          appointment_date: '',
          appointment_type_id: 1,
          office_id: undefined,
          consultation_type: '',
          reason: '',
          notes: ''
        };
        setFormData(defaultData);
        // Para nueva cita, resetear isExistingPatient
        console.log('⚠️ Resetting isExistingPatient to null');
        setIsExistingPatient(null);
        
        // Reset time selection for new appointment
        setSelectedTime('');
        setAvailableTimes([]);
        
        // Don't load times automatically - let the DatePicker handle the date selection
        // The DatePicker will show today's date by default and trigger onChange when user interacts
        console.log('🔄 New appointment - DatePicker will show today by default');
        
        // Don't call onFormDataChange here to prevent infinite loop
        // It will be called when user actually changes form data
      }
      setError(null);
    }
  }, [open, isEditing]);

  // Load available times for default date when dialog opens
  useEffect(() => {
    if (open && !isEditing) {
      // Get today's date in Mexico timezone
      const today = new Date();
      const mexicoTimeString = today.toLocaleString("sv-SE", {timeZone: "America/Mexico_City"});
      const mexicoDate = new Date(mexicoTimeString);
      const todayString = mexicoDate.toISOString().split('T')[0];
      
      console.log('🔄 Loading times for default date:', todayString);
      console.log('🔄 Mexico time string:', mexicoTimeString);
      console.log('🔄 Mexico date object:', mexicoDate);
      setSelectedDate(todayString);
      loadAvailableTimes(todayString);
    }
  }, [open, isEditing]);

  // Separate useEffect for loading data to prevent infinite loop
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      // Only load data if not provided externally
      if (!externalPatients) {
        const [appointmentTypesData, officesData, patientsData] = await Promise.all([
          apiService.get<AppointmentType[]>('/api/appointment-types'),
          apiService.get<Office[]>('/api/offices'),
          apiService.get<Patient[]>('/api/patients')
        ]);
        
        setAppointmentTypes(appointmentTypesData);
        setOffices(officesData);
        setPatients(patientsData);
      } else {
        // Load only appointment types and offices if patients are provided externally
        const [appointmentTypesData, officesData] = await Promise.all([
          apiService.get<AppointmentType[]>('/api/appointment-types'),
          apiService.get<Office[]>('/api/offices')
        ]);
        
        setAppointmentTypes(appointmentTypesData);
        setOffices(officesData);
      }
    } catch (err) {
      setError('Error al cargar datos');
      console.error('Error loading data:', err);
    }
  };

  // Function to load available times for a specific date
  const loadAvailableTimes = async (date: string) => {
    if (!date) return [];
    
    try {
      setLoadingTimes(true);
      console.log('🔍 Loading available times for date:', date);
      console.log('🔍 Making API call to getAvailableTimesForBooking...');
      const response = await apiService.getAvailableTimesForBooking(date);
      console.log('🔍 Available times response:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', response ? Object.keys(response) : 'null');
      const times = response.available_times || [];
      console.log('🔍 Extracted times:', times);
      console.log('🔍 Times count:', times.length);
      setAvailableTimes(times);
      console.log('🔍 Set available times in state:', times);
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
      const newFormData = {
        ...currentFormData,
        appointment_date: `${selectedDate.split('T')[0]}T${time}:00`
      };
      setFormData(newFormData);
      if (onFormDataChange) {
        onFormDataChange(newFormData);
      }
    }
  };

  const handleChange = (field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    
    console.log('🔄 handleChange called:', { field, value });
    console.log('🔄 Current formData before change:', currentFormData);
    console.log('🔄 Current isExistingPatient:', isExistingPatient);
    
    let newFormData = {
      ...currentFormData,
      [field]: value
    };
    
    // Si se selecciona un consultorio, determinar automáticamente el tipo de cita
    if (field === 'office_id' && value && value !== 0) {
      const selectedOffice = offices.find(office => office.id === parseInt(value));
      console.log('🏢 Selected office:', selectedOffice);
      if (selectedOffice) {
        const appointmentTypeId = selectedOffice.is_virtual ? 2 : 1;
        console.log('🏢 Setting appointment_type_id to:', appointmentTypeId, '(is_virtual:', selectedOffice.is_virtual, ')');
        console.log('🏢 Preserving isExistingPatient state:', isExistingPatient);
        newFormData = {
          ...newFormData,
          appointment_type_id: appointmentTypeId
        };
        // NOTE: isExistingPatient state is preserved - it should NOT be reset when changing office
      }
    }
    
    console.log('🔄 New formData after change:', newFormData);
    console.log('🔄 isExistingPatient will remain:', isExistingPatient);
    
    setFormData(newFormData);
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  };


  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      
      // Validaciones básicas
      if (!currentFormData.consultation_type || currentFormData.consultation_type.trim() === '') {
        setError('Seleccione el tipo de consulta');
        return;
      }
      
      if (!currentFormData.office_id || currentFormData.office_id === 0) {
        setError('Seleccione un consultorio');
        return;
      }
      
      if (!currentFormData.appointment_date) {
        setError('Seleccione fecha y hora de la cita');
        return;
      }
      
      // Verificar que el consultorio seleccionado sea válido
      const selectedOffice = offices.find(office => office.id === currentFormData.office_id);
      if (!selectedOffice) {
        setError('Consultorio seleccionado no válido');
        return;
      }
      
      if (!currentFormData.reason.trim()) {
        setError('Ingrese el motivo de la cita');
        return;
      }

      // Validar datos del paciente
      let finalPatientId = currentFormData.patient_id;
      
      if (isExistingPatient === false) {
        // Validar datos del nuevo paciente
        if (!newPatientData.first_name.trim()) {
          setError('El nombre del paciente es requerido');
          return;
        }
        if (!newPatientData.paternal_surname.trim()) {
          setError('El apellido paterno del paciente es requerido');
          return;
        }
        if (!newPatientData.primary_phone.trim()) {
          setError('El teléfono del paciente es requerido');
          return;
        }
        if (!newPatientData.birth_date) {
          setError('La fecha de nacimiento del paciente es requerida');
          return;
        }
        if (!newPatientData.gender) {
          setError('El género del paciente es requerido');
          return;
        }
        
        // Crear nuevo paciente
        try {
          const patientData = {
            first_name: newPatientData.first_name,
            paternal_surname: newPatientData.paternal_surname,
            maternal_surname: newPatientData.maternal_surname || '',
            birth_date: newPatientData.birth_date,
            gender: newPatientData.gender,
            primary_phone: newPatientData.primary_phone,
            person_type: 'patient'
          };
          
          console.log('🆕 Creando nuevo paciente:', patientData);
          
          // Crear el paciente usando la API
          const newPatient = await apiService.post('/api/patients', patientData);
          finalPatientId = newPatient.id;
          
          console.log('✅ Paciente creado exitosamente:', newPatient);
          toast.success('Paciente creado exitosamente');
        } catch (err) {
          setError('Error al crear el nuevo paciente: ' + (err instanceof Error ? err.message : 'Error desconocido'));
          return;
        }
      } else if (isExistingPatient === true) {
        if (!currentFormData.patient_id || currentFormData.patient_id === 0) {
          setError('Seleccione un paciente existente');
          return;
        }
      } else {
        // Para consultas de seguimiento, asumir paciente existente
        if (currentFormData.consultation_type === 'Seguimiento') {
          if (!currentFormData.patient_id) {
            setError('Seleccione un paciente para la consulta de seguimiento');
            return;
          }
          finalPatientId = currentFormData.patient_id;
        } else {
          setError('Seleccione si es un paciente existente o nuevo');
          return;
        }
      }

      // Asegurar que appointment_type_id esté definido
      const formDataToSubmit = {
        ...currentFormData,
        patient_id: finalPatientId,
        appointment_type_id: currentFormData.appointment_type_id || 1 // Default to 1 if not set
      };
      
      onSubmit(formDataToSubmit);
      toast.success('Cita creada exitosamente');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={{ xs: true, sm: false }}
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          height: { xs: '100vh', sm: 'auto' },
          borderRadius: { xs: 0, sm: 2 }
        }
      }}
    >
      <DialogTitle>
        {isEditing ? 'Editar Cita' : 'Nueva Cita'}
      </DialogTitle>
      
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          overflow: 'auto',
          flex: 1,
          minHeight: { xs: '60vh', sm: 'auto' },
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        }}
      >
        {currentError && (
          <Alert severity="error" sx={{ mb: 2 }} ref={errorRef}>
            {currentError}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            
            {/* 1. TIPO DE CONSULTA (PRIMERO) */}
            <FormControl fullWidth required>
              <InputLabel>Tipo de Consulta</InputLabel>
              <Select
                value={currentFormData.consultation_type || ''}
                onChange={handleChange('consultation_type')}
                label="Tipo de Consulta"
                MenuProps={getMediumSelectMenuProps()}
              >
                <MenuItem value=""><em>Seleccione un tipo</em></MenuItem>
                <MenuItem value="Primera vez">Primera vez</MenuItem>
                <MenuItem value="Seguimiento">Seguimiento</MenuItem>
              </Select>
            </FormControl>

            {/* 2. SELECCIÓN DE PACIENTE - Solo si es "Primera vez" */}
            {!isEditing && currentFormData.consultation_type === 'Primera vez' && (
              <>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  ¿Es un paciente existente?
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant={isExistingPatient === true ? 'contained' : 'outlined'}
                    onClick={() => setIsExistingPatient(true)}
                    fullWidth
                  >
                    Sí, paciente existente
                  </Button>
                  <Button
                    variant={isExistingPatient === false ? 'contained' : 'outlined'}
                    onClick={() => setIsExistingPatient(false)}
                    fullWidth
                  >
                    No, nuevo paciente
                  </Button>
                </Box>
              </>
            )}

            {/* Si es "Seguimiento", automáticamente es paciente existente */}
            {!isEditing && currentFormData.consultation_type === 'Seguimiento' && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Para citas de seguimiento, debe seleccionar un paciente existente
                </Typography>
              </>
            )}

            {/* 3A. SELECCIÓN DE PACIENTE EXISTENTE */}
            {(isExistingPatient === true || currentFormData.consultation_type === 'Seguimiento') && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ fontSize: 20 }} />
                  Paciente
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                </Typography>
                
                {currentPatients.length === 0 ? (
                  <Box sx={{ 
                    border: '1px dashed', 
                    borderColor: 'grey.300', 
                    borderRadius: 1, 
                    p: 3, 
                    textAlign: 'center',
                    bgcolor: 'grey.50'
                  }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No hay pacientes registrados
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Para crear una nueva cita, primero debe registrar un paciente
                    </Typography>
                  </Box>
                ) : (
                  <Autocomplete
                    options={currentPatients || []}
                    getOptionLabel={(option: any) => {
                      const age = calculateAge(option.birth_date);
                      const fullName = [
                        option.first_name,
                        option.paternal_surname,
                        option.maternal_surname && option.maternal_surname !== 'null' ? option.maternal_surname : ''
                      ].filter(part => part && part.trim()).join(' ');
                      return `${fullName} (${age} años)`;
                    }}
                    value={currentPatients.find(p => p.id === currentFormData.patient_id) || null}
                    onChange={(_: any, newValue: any) => {
                      if (newValue) {
                        handleChange('patient_id')({ target: { value: newValue.id } });
                      }
                    }}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Seleccionar Paciente"
                        required
                        error={!!currentError && !currentFormData.patient_id}
                        helperText={currentError && !currentFormData.patient_id ? 'Campo requerido' : ''}
                      />
                    )}
                    renderOption={(props: any, option: any) => (
                      <Box component="li" {...props}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {option.first_name[0]}{option.paternal_surname[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {(() => {
                              const age = calculateAge(option.birth_date);
                              const fullName = [
                                option.first_name,
                                option.paternal_surname,
                                option.maternal_surname && option.maternal_surname !== 'null' ? option.maternal_surname : ''
                              ].filter(part => part && part.trim()).join(' ');
                              return `${fullName} (${age} años)`;
                            })()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.primary_phone} • {option.email}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    loading={currentPatients.length === 0}
                    loadingText="Cargando pacientes..."
                    noOptionsText="No se encontraron pacientes"
                  />
                )}
              </Box>
            )}

            {/* 3B. DATOS BÁSICOS DE NUEVO PACIENTE */}
            {isExistingPatient === false && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Datos básicos del nuevo paciente
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label="Nombre *"
                    value={newPatientData.first_name}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Apellido Paterno *"
                    value={newPatientData.paternal_surname}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, paternal_surname: e.target.value }))}
                    required
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label="Apellido Materno"
                    value={newPatientData.maternal_surname}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, maternal_surname: e.target.value }))}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Teléfono *"
                    value={newPatientData.primary_phone}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, primary_phone: e.target.value }))}
                    required
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    fullWidth
                    label="Fecha de Nacimiento *"
                    type="date"
                    value={newPatientData.birth_date}
                    onChange={(e) => setNewPatientData(prev => ({ ...prev, birth_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    required
                    size="small"
                  />
                  <FormControl fullWidth required size="small">
                    <InputLabel>Género *</InputLabel>
                    <Select
                      value={newPatientData.gender}
                      onChange={(e) => setNewPatientData(prev => ({ ...prev, gender: e.target.value }))}
                      label="Género *"
                      MenuProps={getMediumSelectMenuProps()}
                    >
                      <MenuItem value="Masculino">Masculino</MenuItem>
                      <MenuItem value="Femenino">Femenino</MenuItem>
                      <MenuItem value="Otro">Otro</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}

            {/* 4. CONSULTORIO */}
            <FormControl fullWidth required>
              <InputLabel>Consultorio</InputLabel>
              <Select
                value={currentFormData.office_id || 0}
                onChange={handleChange('office_id')}
                label="Consultorio"
                MenuProps={getMediumSelectMenuProps()}
              >
                <MenuItem value={0} disabled>
                  Seleccionar consultorio
                </MenuItem>
                {offices.map((office) => (
                  <MenuItem key={office.id} value={office.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {office.name}
                        </Typography>
                        {office.is_virtual && office.virtual_url && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#1976d2', fontSize: '0.75rem' }}>
                              💻 {office.virtual_url}
                            </Typography>
                          </Box>
                        )}
                        {!office.is_virtual && office.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                              📍 {office.address}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>


            {/* 6. FECHA Y HORA */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <DatePicker
                label="Fecha de la cita"
                value={currentFormData.appointment_date ? new Date(currentFormData.appointment_date) : new Date()}
                onChange={(date) => {
                  const dateString = date ? date.toISOString() : '';
                  const newFormData = {
                    ...currentFormData,
                    appointment_date: dateString
                  };
                  setFormData(newFormData);
                  if (onFormDataChange) {
                    onFormDataChange(newFormData);
                  }
                  
                  // Load available times when date changes
                  if (date) {
                    handleDateChange(dateString);
                  } else {
                    setAvailableTimes([]);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />

              <FormControl fullWidth required>
                <InputLabel>Hora de la cita</InputLabel>
                <Select
                  value={selectedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={loadingTimes}
                  label="Hora de la cita"
                >
                  {loadingTimes ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Cargando horarios...</Typography>
                      </Box>
                    </MenuItem>
                  ) : availableTimes.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        {selectedDate ? 'No hay horarios disponibles' : 'Selecciona una fecha primero'}
                      </Typography>
                    </MenuItem>
                  ) : (
                    availableTimes.map((timeSlot) => (
                      <MenuItem key={timeSlot.time} value={timeSlot.time}>
                        {timeSlot.display} ({timeSlot.duration_minutes} min)
                      </MenuItem>
                    ))
                  )}
                  
                  {/* Show current selected time even if not in available times (for editing) */}
                  {selectedTime && !loadingTimes && !availableTimes.some(slot => slot.time === selectedTime) && (
                    <MenuItem value={selectedTime}>
                      {selectedTime} (Horario actual)
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>
            
            {/* Show informative message when no times are available */}
            {availableTimes.length === 0 && !loadingTimes && (
              <Alert severity="info" sx={{ mt: 1 }}>
                No hay horarios disponibles para esta fecha. El doctor no tiene horarios configurados para este día.
              </Alert>
            )}
            
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', fontSize: '0.8rem' }}>
                Debug: selectedDate={selectedDate}, availableTimes.length={availableTimes.length}, loadingTimes={loadingTimes.toString()}
              </Box>
            )}

            {/* 7. MOTIVO */}
            <TextField
              fullWidth
              label="Motivo de la cita"
              value={currentFormData.reason}
              onChange={handleChange('reason')}
              required
              multiline
              rows={2}
            />

            {/* 8. NOTAS */}
            <TextField
              fullWidth
              label="Notas adicionales"
              value={currentFormData.notes || ''}
              onChange={handleChange('notes')}
              multiline
              rows={3}
            />
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={currentLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={currentLoading}
        >
          {currentLoading ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Actualizar' : 'Crear'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentDialogMultiOffice;

