import React, { useState, useEffect, useCallback } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  FormHelperText,
  Autocomplete,
  Avatar,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  CalendarToday as CalendarIcon,
  LocalHospital as HospitalIcon,
  MedicalServices as MedicalServicesIcon,
  Notes as NotesIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Patient, PatientFormData } from '../../types';
import { MEDICAL_VALIDATION_RULES, validateForm } from '../../utils/validation';
import { apiService } from '../../services/api';
// import { useSnackbar } from '../../contexts/SnackbarContext';

// Define ConsultationFormData interface based on the hook
interface ConsultationFormData {
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  treatment_plan: string;
  therapeutic_plan: string;
  follow_up_instructions: string;
  prognosis: string;
  laboratory_results: string;
  imaging_studies: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
  // New fields for appointment selection
  has_appointment: boolean;
  appointment_id: string;
}

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  consultation?: any | null;
  onSubmit: (data: ConsultationFormData) => Promise<void>;
  patients: Patient[];
  doctorProfile?: any;
  onNewPatient?: () => void;
  appointments?: any[]; // Add appointments prop
}

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
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

const ConsultationDialog: React.FC<ConsultationDialogProps> = ({
  open,
  onClose,
  consultation,
  onSubmit,
  patients,
  doctorProfile,
  onNewPatient,
  appointments = []
}) => {
  const isEditing = !!consultation;

  const initialFormData: ConsultationFormData = {
    patient_id: '',
    date: new Date().toISOString().split('T')[0],
    chief_complaint: '',
    history_present_illness: '',
    family_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    physical_examination: '',
    primary_diagnosis: '',
    secondary_diagnoses: '',
    treatment_plan: '',
    therapeutic_plan: '',
    follow_up_instructions: '',
    prognosis: '',
    laboratory_results: '',
    imaging_studies: '',
    interconsultations: '',
    doctor_name: doctorProfile?.first_name && doctorProfile?.last_name 
      ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
      : '',
    doctor_professional_license: doctorProfile?.professional_license || '',
    doctor_specialty: doctorProfile?.specialty || '',
    // New fields
    has_appointment: false,
    appointment_id: ''
  };

  const [formData, setFormData] = useState<ConsultationFormData>(initialFormData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [patientEditData, setPatientEditData] = useState<PatientFormData | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [birthStates, setBirthStates] = useState<any[]>([]);
  const [emergencyRelationships, setEmergencyRelationships] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setErrors({});
      if (consultation) {
        // Map consultation data to form data
        setFormData({
          ...initialFormData,
          patient_id: consultation.patient_id || '',
          date: consultation.date ? consultation.date.split('T')[0] : new Date().toISOString().split('T')[0],
          chief_complaint: consultation.chief_complaint || '',
          history_present_illness: consultation.history_present_illness || '',
          family_history: consultation.family_history || '',
          personal_pathological_history: consultation.personal_pathological_history || '',
          personal_non_pathological_history: consultation.personal_non_pathological_history || '',
          physical_examination: consultation.physical_examination || '',
          primary_diagnosis: consultation.primary_diagnosis || '',
          secondary_diagnoses: consultation.secondary_diagnoses || '',
          treatment_plan: consultation.treatment_plan || '',
          therapeutic_plan: consultation.therapeutic_plan || '',
          follow_up_instructions: consultation.follow_up_instructions || '',
          prognosis: consultation.prognosis || '',
          laboratory_results: consultation.laboratory_results || '',
          imaging_studies: consultation.imaging_studies || '',
          interconsultations: consultation.interconsultations || '',
          doctor_name: consultation.doctor_name || initialFormData.doctor_name,
          doctor_professional_license: consultation.doctor_professional_license || initialFormData.doctor_professional_license,
          doctor_specialty: consultation.doctor_specialty || initialFormData.doctor_specialty
        });

        // Find and set selected patient
        if (consultation.patient_id && patients.length > 0) {
          const patient = patients.find(p => p.id === consultation.patient_id);
          setSelectedPatient(patient || null);
        }
      } else {
        setFormData(initialFormData);
        setSelectedPatient(null);
      }
    }
  }, [open, consultation, patients, doctorProfile]);

  // Load countries and emergency relationships
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

  // Load states when patient data changes
  useEffect(() => {
    const loadStatesForPatient = async () => {
      if (patientEditData) {
        try {
          // Load states for address country
          if (patientEditData.address_country_id) {
            const addressStatesData = await apiService.getStates(parseInt(patientEditData.address_country_id));
            setStates(addressStatesData);
          }
          
          // Load states for birth country
          if (patientEditData.birth_country_id) {
            const birthStatesData = await apiService.getStates(parseInt(patientEditData.birth_country_id));
            setBirthStates(birthStatesData);
          }
        } catch (error) {
          console.error('Error loading states:', error);
        }
      }
    };

    loadStatesForPatient();
  }, [patientEditData?.address_country_id, patientEditData?.birth_country_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name as string]: value }));
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  };

  const handleDateChange = (newValue: Date | null) => {
    const dateString = newValue ? newValue.toISOString().split('T')[0] : '';
    setFormData(prev => ({ ...prev, date: dateString }));
    if (errors.date) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.date;
        return newErrors;
      });
    }
  };

  const handlePatientChange = async (patient: Patient | null) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient?.id || '' }));
    
    // Load full patient data for editing
    if (patient) {
      try {
        const fullPatientData = await apiService.getPatient(patient.id);
        setPatientEditData(fullPatientData);
      } catch (error) {
        console.error('Error loading patient data:', error);
        setPatientEditData(null);
      }
    } else {
      setPatientEditData(null);
    }
    
    if (errors.patient_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.patient_id;
        return newErrors;
      });
    }
  };

  const handlePatientDataChange = (field: keyof PatientFormData, value: any) => {
    setPatientEditData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleCountryChange = async (field: 'address_country_id' | 'birth_country_id', countryId: string) => {
    handlePatientDataChange(field, countryId);
    
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
    } else {
      if (field === 'address_country_id') {
        setStates([]);
      } else {
        setBirthStates([]);
      }
    }
  };

  const handleAppointmentChange = async (appointment: any | null) => {
    setSelectedAppointment(appointment);
    
    if (appointment) {
      // Set patient from appointment
      const patient = patients.find(p => p.id === appointment.patient_id);
      if (patient) {
        setSelectedPatient(patient);
        setFormData(prev => ({ ...prev, patient_id: patient.id.toString(), appointment_id: appointment.id.toString() }));
        
        // Load full patient data for editing
        try {
          const fullPatientData = await apiService.getPatient(patient.id);
          setPatientEditData(fullPatientData);
        } catch (error) {
          console.error('Error loading patient data:', error);
          setPatientEditData(null);
        }
      }
    } else {
      setSelectedPatient(null);
      setPatientEditData(null);
      setFormData(prev => ({ ...prev, patient_id: '', appointment_id: '' }));
    }
  };

  // Filter appointments to show only non-cancelled ones
  const availableAppointments = appointments.filter(appointment => 
    appointment.status !== 'cancelled' && appointment.status !== 'canceled'
  );

  const handleSubmit = async () => {
    setError(null);
    
    // Basic validation
    if (!selectedPatient) {
      setError('Por favor, selecciona un paciente');
      return;
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      return;
    }

    // Update patient data if modified
    if (patientEditData && selectedPatient) {
      try {
        await apiService.updatePatient(selectedPatient.id, patientEditData);
        console.log('✅ Patient data updated successfully');
      } catch (error) {
        console.error('Error updating patient data:', error);
        setError('Error al actualizar los datos del paciente');
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      // Consulta creada exitosamente - sin mostrar diálogo
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setError(err.message || 'Error al guardar consulta');
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
          <HospitalIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Consulta' : 'Nueva Consulta'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
          <Box 
            data-testid="error-message"
            sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: 'error.main', 
              borderRadius: 1,
              backgroundColor: '#d32f2f !important' // Force red background
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {error}
            </Typography>
          </Box>
        )}
        
        <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Appointment Question */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              ¿Consulta con previa cita?
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Seleccione una opción</InputLabel>
              <Select
                value={formData.has_appointment ? 'yes' : formData.has_appointment === false ? 'no' : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const hasAppointment = value === 'yes';
                  setFormData(prev => ({ 
                    ...prev, 
                    has_appointment: hasAppointment,
                    appointment_id: hasAppointment ? prev.appointment_id : ''
                  }));
                  if (!hasAppointment) {
                    setSelectedAppointment(null);
                    setSelectedPatient(null);
                    setPatientEditData(null);
                  }
                }}
                label="Seleccione una opción"
              >
                <MenuItem value="yes">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Appointment Selection - Only show if has_appointment is true */}
          {formData.has_appointment && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon sx={{ fontSize: 20 }} />
                Seleccionar Cita
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <FormControl size="small" fullWidth>
                <InputLabel>Citas Programadas</InputLabel>
                <Select
                  value={formData.appointment_id || ''}
                  onChange={(e) => {
                    const appointmentId = e.target.value;
                    const appointment = availableAppointments.find(apt => apt.id.toString() === appointmentId);
                    handleAppointmentChange(appointment);
                  }}
                  label="Citas Programadas"
                >
                  {availableAppointments.map((appointment) => {
                    const patient = patients.find(p => p.id === appointment.patient_id);
                    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
                    const appointmentTime = new Date(appointment.appointment_date).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    // Get consultation type
                    const consultationType = appointment.appointment_type === 'primera vez' ? 'Primera vez' : 
                                           appointment.appointment_type === 'seguimiento' ? 'Seguimiento' : 
                                           appointment.appointment_type || 'No especificado';
                    return (
                      <MenuItem key={appointment.id} value={appointment.id.toString()}>
                        {patient ? `${patient.first_name} ${patient.paternal_surname}` : 'Paciente no encontrado'} - {appointmentDate} {appointmentTime} - {consultationType}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Patient Selection - Only show if has_appointment is false or no appointment selected */}
          {!formData.has_appointment && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Paciente
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            
            {patients.length === 0 ? (
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
                  Para crear una nueva consulta, primero debe registrar un paciente
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
            ) : (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Autocomplete
                    options={patients}
                    getOptionLabel={(option) => formatPatientNameWithAge(option)}
                    value={selectedPatient}
                    onChange={(_, newValue) => handlePatientChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seleccionar Paciente"
                        required
                        error={!!error && !selectedPatient}
                        helperText={error && !selectedPatient ? 'Campo requerido' : ''}
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
                {onNewPatient && (
                  <Button
                    variant="outlined"
                    onClick={onNewPatient}
                    startIcon={<PersonAddIcon />}
                    sx={{ whiteSpace: 'nowrap', height: 40 }}
                  >
                    Nuevo
                  </Button>
                )}
              </Box>
            )}
          </Box>
          )}

          {/* Patient Data Section - Show when patient is selected */}
          {selectedPatient && patientEditData && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon sx={{ fontSize: 20 }} />
                Datos del Paciente (Editable)
              </Typography>
              
              <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                {/* Personal Information Section */}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 20 }} />
                    Información Personal
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      label="Nombre"
                      value={patientEditData.first_name || ''}
                      onChange={(e) => handlePatientDataChange('first_name', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Apellido Paterno"
                      value={patientEditData.paternal_surname || ''}
                      onChange={(e) => handlePatientDataChange('paternal_surname', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Apellido Materno"
                      value={patientEditData.maternal_surname || ''}
                      onChange={(e) => handlePatientDataChange('maternal_surname', e.target.value)}
                      size="small"
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                      <DatePicker
                        label="Fecha de Nacimiento"
                        value={patientEditData.birth_date ? new Date(patientEditData.birth_date) : null}
                        onChange={(newValue) => {
                          const dateStr = newValue ? newValue.toISOString().split('T')[0] : '';
                          handlePatientDataChange('birth_date', dateStr);
                        }}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true
                          }
                        }}
                      />
                    </LocalizationProvider>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Género</InputLabel>
                      <Select
                        value={patientEditData.gender || ''}
                        onChange={(e) => handlePatientDataChange('gender', e.target.value)}
                        label="Género"
                      >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        <MenuItem value="male">Masculino</MenuItem>
                        <MenuItem value="female">Femenino</MenuItem>
                        <MenuItem value="other">Otro</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

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
                      value={patientEditData.primary_phone || ''}
                      onChange={(e) => handlePatientDataChange('primary_phone', e.target.value)}
                      size="small"
                      required
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={patientEditData.email || ''}
                      onChange={(e) => handlePatientDataChange('email', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Dirección"
                      value={patientEditData.home_address || ''}
                      onChange={(e) => handlePatientDataChange('home_address', e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    <TextField
                      label="Ciudad"
                      value={patientEditData.address_city || ''}
                      onChange={(e) => handlePatientDataChange('address_city', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Código Postal"
                      value={patientEditData.address_postal_code || ''}
                      onChange={(e) => handlePatientDataChange('address_postal_code', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 5 }}
                      helperText="Opcional"
                    />
                    <FormControl size="small">
                      <InputLabel>País</InputLabel>
                      <Select
                        value={patientEditData.address_country_id || ''}
                        onChange={(e) => handleCountryChange('address_country_id', e.target.value as string)}
                        label="País"
                      >
                        {countries.map((country) => (
                          <MenuItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small">
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={patientEditData.address_state_id || ''}
                        onChange={(e) => handlePatientDataChange('address_state_id', e.target.value)}
                        label="Estado"
                        disabled={!patientEditData.address_country_id}
                      >
                        {states.map((state) => (
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
                      value={patientEditData.curp || ''}
                      onChange={(e) => handlePatientDataChange('curp', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 18 }}
                    />
                    <TextField
                      label="RFC"
                      value={patientEditData.rfc || ''}
                      onChange={(e) => handlePatientDataChange('rfc', e.target.value)}
                      size="small"
                      inputProps={{ maxLength: 13 }}
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel>Estado Civil</InputLabel>
                      <Select
                        value={patientEditData.civil_status || ''}
                        onChange={(e) => handlePatientDataChange('civil_status', e.target.value)}
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
                      value={patientEditData.birth_city || ''}
                      onChange={(e) => handlePatientDataChange('birth_city', e.target.value)}
                      size="small"
                    />
                    <FormControl size="small">
                      <InputLabel>País de Nacimiento</InputLabel>
                      <Select
                        value={patientEditData.birth_country_id || ''}
                        onChange={(e) => handleCountryChange('birth_country_id', e.target.value as string)}
                        label="País de Nacimiento"
                      >
                        {countries.map((country) => (
                          <MenuItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small">
                      <InputLabel>Estado de Nacimiento</InputLabel>
                      <Select
                        value={patientEditData.birth_state_id || ''}
                        onChange={(e) => handlePatientDataChange('birth_state_id', e.target.value)}
                        label="Estado de Nacimiento"
                        disabled={!patientEditData.birth_country_id}
                      >
                        {birthStates.map((state) => (
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
                      value={patientEditData.emergency_contact_name || ''}
                      onChange={(e) => handlePatientDataChange('emergency_contact_name', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Teléfono del Contacto"
                      value={patientEditData.emergency_contact_phone || ''}
                      onChange={(e) => handlePatientDataChange('emergency_contact_phone', e.target.value)}
                      size="small"
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel>Relación con el Paciente</InputLabel>
                      <Select
                        value={patientEditData.emergency_contact_relationship || ''}
                        onChange={(e) => handlePatientDataChange('emergency_contact_relationship', e.target.value)}
                        label="Relación con el Paciente"
                        sx={{ gridColumn: '1 / -1' }}
                      >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        {emergencyRelationships.map((relationship) => (
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
                      label="Condiciones Crónicas"
                      value={patientEditData.chronic_conditions || ''}
                      onChange={(e) => handlePatientDataChange('chronic_conditions', e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                      fullWidth
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    <TextField
                      label="Medicamentos Actuales"
                      value={patientEditData.current_medications || ''}
                      onChange={(e) => handlePatientDataChange('current_medications', e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                      fullWidth
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    <TextField
                      label="Proveedor de Seguro"
                      value={patientEditData.insurance_provider || ''}
                      onChange={(e) => handlePatientDataChange('insurance_provider', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Número de Póliza"
                      value={patientEditData.insurance_number || ''}
                      onChange={(e) => handlePatientDataChange('insurance_number', e.target.value)}
                      size="small"
                    />
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}

          {/* Date */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              Fecha de Consulta
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha"
                value={formData.date ? new Date(formData.date) : null}
                maxDate={new Date()}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Box>

          {/* Chief Complaint */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Motivo de Consulta
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <TextField
              name="chief_complaint"
              label="Motivo de consulta"
              value={formData.chief_complaint}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
              required
              error={!!error && !formData.chief_complaint.trim()}
              helperText={error && !formData.chief_complaint.trim() ? 'Campo requerido' : ''}
            />
          </Box>

          {/* History of Present Illness */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon sx={{ fontSize: 20 }} />
              Historia de la Enfermedad Actual
            </Typography>
            <TextField
              name="history_present_illness"
              label="Historia de la enfermedad actual"
              value={formData.history_present_illness}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Physical Examination */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HospitalIcon sx={{ fontSize: 20 }} />
              Exploración Física
            </Typography>
            <TextField
              name="physical_examination"
              label="Exploración física"
              value={formData.physical_examination}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Primary Diagnosis */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon sx={{ fontSize: 20 }} />
              Diagnóstico Principal
            </Typography>
            <TextField
              name="primary_diagnosis"
              label="Diagnóstico principal"
              value={formData.primary_diagnosis}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>

          {/* Treatment Plan */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Plan de Tratamiento
            </Typography>
            <TextField
              name="treatment_plan"
              label="Plan de tratamiento"
              value={formData.treatment_plan}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Follow-up Instructions */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              Instrucciones de Seguimiento
            </Typography>
            <TextField
              name="follow_up_instructions"
              label="Instrucciones de seguimiento"
              value={formData.follow_up_instructions}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
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
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar Consulta' : 'Crear Consulta')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsultationDialog;
