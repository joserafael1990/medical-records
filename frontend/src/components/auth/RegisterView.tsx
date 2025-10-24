import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormHelperText,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Card,
  CardContent,
  Chip,
  Grid
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  ArrowBack,
  AccountCircle,
  Work,
  School,
  Business,
  Save,
  Schedule,
  AccessTime,
  Add as AddIcon
} from '@mui/icons-material';
import CortexLogo from '../common/CortexLogo';
import { MEDICAL_SPECIALTIES, MEXICAN_STATES, API_CONFIG } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useScrollToError } from '../../hooks/useScrollToError';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface TimeBlock {
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  time_blocks: TimeBlock[];
}

interface WeeklyScheduleData {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', index: 0 },
  { key: 'tuesday', label: 'Martes', index: 1 },
  { key: 'wednesday', label: 'Miércoles', index: 2 },
  { key: 'thursday', label: 'Jueves', index: 3 },
  { key: 'friday', label: 'Viernes', index: 4 },
  { key: 'saturday', label: 'Sábado', index: 5 },
  { key: 'sunday', label: 'Domingo', index: 6 }
];

interface RegistrationData {
  // Step 1: Account Info
  email: string;
  password: string;
  confirmPassword: string;
  
  // Step 2: Personal Information
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  curp: string;
  gender: string;
  birth_date: string;
  phone: string;
  
  // Step 3: Professional Information
  title: string;
  specialty: string;
  university: string;
  graduation_year: string;
  professional_license: string;
  
  // Step 4: Office Data
  office_name: string;
  office_address: string;
  office_country: string;
  office_state_id: string;
  office_city: string;
  office_phone: string;
  appointment_duration: string;
  
  // Step 5: Schedule Data
  scheduleData: WeeklyScheduleData;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

const RegisterView: React.FC<{ onBackToLogin: () => void }> = ({ onBackToLogin }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [specialties, setSpecialties] = useState<any[]>([]);
  
  const { login } = useAuth();
  const { countries, getStatesByCountry, loading: catalogsLoading } = useCatalogs();
  const [selectedOfficeCountry, setSelectedOfficeCountry] = useState<string>('México');
  
  // Auto-scroll to error when it appears
  const errorRef = useScrollToError(error);

  // Load specialties on component mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/catalogs/specialties`);
        const data = await response.json();
        setSpecialties(data);
      } catch (error) {
        console.error('Error loading specialties:', error);
      }
    };
    loadSpecialties();
  }, []);

  const [formData, setFormData] = useState<RegistrationData>({
    // Step 1
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    curp: '',
    gender: '',
    birth_date: '',
    phone: '',
    
    // Step 3
    title: 'Dr.',
    specialty: '',
    university: '',
    graduation_year: '',
    professional_license: '',
    
    // Step 4
    office_name: '',
    office_address: '',
    office_country: 'México',
    office_state_id: '',
    office_city: '',
    office_phone: '',
    appointment_duration: '',
    
    // Step 5: Schedule Data
    scheduleData: {}
  });

  // Funciones para manejo de horarios
  const formatTime = (timeString?: string): Date | null => {
    if (!timeString) return null;
    
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return date;
    } catch {
      return null;
    }
  };

  const formatTimeToString = (date: Date | null): string => {
    if (!date) return '';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const updateDaySchedule = (dayIndex: number, isActive: boolean) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklyScheduleData;
    
    setFormData(prev => ({
      ...prev,
      scheduleData: {
        ...prev.scheduleData,
        [dayKey]: isActive ? {
          day_of_week: dayIndex,
          is_active: true,
          time_blocks: [{ start_time: '09:00', end_time: '17:00' }]
        } : undefined
      }
    }));
  };

  const addTimeBlock = (dayIndex: number) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklyScheduleData;
    const currentDay = formData.scheduleData[dayKey];
    
    if (currentDay) {
      setFormData(prev => ({
        ...prev,
        scheduleData: {
          ...prev.scheduleData,
          [dayKey]: {
            ...currentDay,
            time_blocks: [...currentDay.time_blocks, { start_time: '09:00', end_time: '17:00' }]
          }
        }
      }));
    }
  };

  const removeTimeBlock = (dayIndex: number, blockIndex: number) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklyScheduleData;
    const currentDay = formData.scheduleData[dayKey];
    
    if (currentDay && currentDay.time_blocks.length > 1) {
      setFormData(prev => ({
        ...prev,
        scheduleData: {
          ...prev.scheduleData,
          [dayKey]: {
            ...currentDay,
            time_blocks: currentDay.time_blocks.filter((_, index) => index !== blockIndex)
          }
        }
      }));
    }
  };

  const updateTimeBlock = (dayIndex: number, blockIndex: number, field: 'start_time' | 'end_time', value: string) => {
    const dayKey = DAYS_OF_WEEK[dayIndex].key as keyof WeeklyScheduleData;
    const currentDay = formData.scheduleData[dayKey];
    
    if (currentDay) {
      const updatedTimeBlocks = currentDay.time_blocks.map((block, index) => {
        if (index === blockIndex) {
          return { ...block, [field]: value };
        }
        return block;
      });
      
      setFormData(prev => ({
        ...prev,
        scheduleData: {
          ...prev.scheduleData,
          [dayKey]: {
            ...currentDay,
            time_blocks: updatedTimeBlocks
          }
        }
      }));
    }
  };

  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const getPasswordStrength = (validation: PasswordValidation): number => {
    const criteria = Object.values(validation);
    return criteria.filter(Boolean).length;
  };

  const passwordValidation = validatePassword(formData.password);
  const passwordStrength = getPasswordStrength(passwordValidation);
  const isPasswordValid = passwordStrength >= 4;

  const handleInputChange = (field: keyof RegistrationData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  // Handle office country change and reset state
  const handleOfficeCountryChange = (countryName: string) => {
    setSelectedOfficeCountry(countryName);
    setFormData(prev => ({ 
      ...prev, 
      office_country: countryName,
      office_state_id: '' // Reset state when country changes
    }));
    setError('');
  };

  // Filtered states based on selected country
  const filteredOfficeStates = useMemo(() => {
    return getStatesByCountry(selectedOfficeCountry);
  }, [selectedOfficeCountry, getStatesByCountry]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Por favor, ingresa un correo electrónico válido');
          return false;
        }
        if (!isPasswordValid) {
          setError('La contraseña debe cumplir con al menos 4 de los 5 criterios de seguridad');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          return false;
        }
        return true;
      
      case 1:
        const requiredFields = ['first_name', 'paternal_surname', 'curp', 'gender', 'birth_date', 'phone'];
        const missingFields = requiredFields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingFields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        // Validate CURP format
        if (formData.curp && formData.curp.length !== 18) {
          setError('El CURP debe tener exactamente 18 caracteres');
          return false;
        }
        return true;
      
      case 2:
        const requiredStep2Fields = ['title', 'specialty', 'university', 'graduation_year', 'professional_license'];
        const missingStep2Fields = requiredStep2Fields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingStep2Fields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        // Validate graduation year
        if (formData.graduation_year) {
          const year = parseInt(formData.graduation_year);
          const currentYear = new Date().getFullYear();
          if (isNaN(year) || year < 1950 || year > currentYear) {
            setError(`El año de graduación debe estar entre 1950 y ${currentYear}`);
            return false;
          }
        }
        return true;
      
      case 3:
        const requiredStep3Fields = ['office_name', 'office_address', 'office_city', 'office_state_id', 'appointment_duration'];
        const missingStep3Fields = requiredStep3Fields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingStep3Fields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        
        // Validate appointment duration is a number and reasonable range
        const duration = parseInt(formData.appointment_duration);
        if (isNaN(duration) || duration < 5 || duration > 300) {
          setError('La duración de la consulta debe ser un número entre 5 y 300 minutos');
          return false;
        }
        
        return true;
      
      case 4:
        // Validate that at least one day has been configured
        const activeDays = Object.values(formData.scheduleData).filter(day => day?.is_active);
        if (activeDays.length === 0) {
          setError('Por favor, configura al menos un día de atención');
          return false;
        }
        
        // Validate that each active day has at least one time block
        const daysWithoutTimeBlocks = activeDays.filter(day => !day.time_blocks || day.time_blocks.length === 0);
        if (daysWithoutTimeBlocks.length > 0) {
          setError('Todos los días activos deben tener al menos un horario configurado');
          return false;
        }
        
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => {
        const newStep = prev + 1;
        setVisitedSteps(prevVisited => new Set(prevVisited).add(newStep));
        return newStep;
      });
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  // Función para navegación directa a cualquier paso
  const handleStepClick = (step: number) => {
    setActiveStep(step);
    setVisitedSteps(prev => new Set(prev).add(step));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    setError('');

    try {
      // Create doctor profile first
      const doctorProfileData = {
        title: formData.title,
        first_name: formData.first_name,
        paternal_surname: formData.paternal_surname,
        maternal_surname: formData.maternal_surname || '',
        curp: formData.curp,
        gender: formData.gender,
        professional_license: formData.professional_license,
        birth_date: formData.birth_date, // Ensure YYYY-MM-DD format
        primary_phone: formData.phone, // Fixed field name
        email: formData.email,
        password: formData.password, // Added required password field
        // Required fields
        specialty_id: parseInt(formData.specialty) || null,
        university: formData.university,
        graduation_year: formData.graduation_year,
        office_name: formData.office_name,
        office_address: formData.office_address,
        office_city: formData.office_city,
        office_state_id: parseInt(formData.office_state_id) || null,
        appointment_duration: parseInt(formData.appointment_duration) || null,
        // Optional fields
        office_phone: formData.office_phone || '',
        // Schedule data
        schedule_data: formData.scheduleData,
        // System fields
        created_by: `${formData.title} ${formData.first_name} ${formData.paternal_surname}`.trim()
      };

      // Register the doctor (creates profile and handles authentication automatically)
      console.log('📝 Sending registration data:', doctorProfileData);
      
      const registrationResponse = await apiService.register(doctorProfileData);
      
      // The registration endpoint already handles login, so we just need to update the auth context
      if (registrationResponse.success) {
        
        // Store authentication data from registration response
        localStorage.setItem('token', registrationResponse.access_token);
        localStorage.setItem('doctor_data', JSON.stringify(registrationResponse.user));
        
        // Force reload to trigger authentication state update
        window.location.reload();
      } else {
        throw new Error('Error en el registro');
      }

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error detail:', error.detail);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.status);
      
      // Extract specific error message from API response
      let errorMessage = 'Error durante el registro. Intenta nuevamente.';
      
      // The API service transforms errors into ApiError format with { detail: string, status: number }
      if (error.detail) {
        // Use the specific error message from the API service
        console.log('✅ Using error.detail:', error.detail);
        errorMessage = error.detail;
      } else if (error.response?.data?.detail) {
        // Fallback: Use the raw response if available
        console.log('✅ Using error.response.data.detail:', error.response.data.detail);
        errorMessage = error.response.data.detail;
      } else if (error.status === 400 || error.response?.status === 400) {
        console.log('✅ Using 400 error message');
        errorMessage = 'Los datos proporcionados no son válidos. Por favor, revise la información.';
      } else if (error.status === 500 || error.response?.status === 500) {
        console.log('✅ Using 500 error message');
        errorMessage = 'Error interno del servidor. Por favor, intente nuevamente más tarde.';
      } else if (error.message) {
        console.log('✅ Using error.message:', error.message);
        errorMessage = error.message;
      }
      
      console.log('✅ Final error message:', errorMessage);
      console.log('✅ Setting error state with:', errorMessage);
      setError(errorMessage);
      console.log('✅ Error state set, current error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      label: 'Información de la Cuenta',
      icon: <AccountCircle />,
      description: 'Email y contraseña'
    },
    {
      label: 'Información Personal',
      icon: <AccountCircle />,
      description: 'Datos personales básicos'
    },
    {
      label: 'Información Profesional',
      icon: <Work />,
      description: 'Título, cédula, universidad'
    },
    {
      label: 'Datos del Consultorio',
      icon: <Business />,
      description: 'Dirección y contacto'
    },
    {
      label: 'Horarios de Atención',
      icon: <Schedule />,
      description: 'Configura tus horarios de trabajo'
    }
  ];

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
              autoComplete="email"
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange('password')}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {formData.password && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Fortaleza de la contraseña:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(passwordStrength / 5) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: passwordStrength < 3 ? 'error.main' : 
                                      passwordStrength < 4 ? 'warning.main' : 'success.main'
                    }
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  {Object.entries({
                    'Al menos 8 caracteres': passwordValidation.minLength,
                    'Una letra mayúscula': passwordValidation.hasUppercase,
                    'Una letra minúscula': passwordValidation.hasLowercase,
                    'Un número': passwordValidation.hasNumbers,
                    'Un carácter especial': passwordValidation.hasSpecialChars
                  }).map(([criterion, met]) => (
                    <Box key={criterion} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      {met ? (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 16, mr: 1 }} />
                      ) : (
                        <Cancel sx={{ color: 'error.main', fontSize: 16, mr: 1 }} />
                      )}
                      <Typography variant="caption" color={met ? 'success.main' : 'error.main'}>
                        {criterion}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              margin="normal"
              label="Confirmar Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Información Personal
            </Typography>
            
            <TextField
              fullWidth
              margin="normal"
              label="Nombre(s)"
              value={formData.first_name}
              onChange={handleInputChange('first_name')}
              required
            />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Apellido Paterno"
                  value={formData.paternal_surname}
                  onChange={handleInputChange('paternal_surname')}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Apellido Materno"
                  value={formData.maternal_surname}
                  onChange={handleInputChange('maternal_surname')}
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              margin="normal"
              label="CURP"
              value={formData.curp}
              onChange={handleInputChange('curp')}
              required
              placeholder="AAAA######HAAAAA##"
              inputProps={{
                maxLength: 18,
                style: { textTransform: 'uppercase' }
              }}
              helperText="Clave Única de Registro de Población (18 caracteres)"
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel required>Género</InputLabel>
              <Select
                value={formData.gender}
                onChange={handleInputChange('gender')}
                label="Género"
                required
              >
                <MenuItem value="M">Masculino</MenuItem>
                <MenuItem value="F">Femenino</MenuItem>
                <MenuItem value="O">Otro</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Fecha de Nacimiento *"
                    value={formData.birth_date ? new Date(formData.birth_date) : null}
                    maxDate={new Date()}
                    onChange={(newValue) => {
                      if (newValue) {
                        const dateValue = newValue.toISOString().split('T')[0];
                        setFormData(prev => ({ ...prev, birth_date: dateValue }));
                      } else {
                        setFormData(prev => ({ ...prev, birth_date: '' }));
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                        required: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => {
                    // Solo permitir números
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('phone')({ target: { value } });
                  }}
                  placeholder="5551234567"
                  helperText="Solo números (10 dígitos)"
                  inputProps={{ maxLength: 15 }}
                  required
                />
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Información Profesional
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: '120px', flex: '0 0 auto' }}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Título</InputLabel>
                  <Select
                    value={formData.title}
                    onChange={handleInputChange('title')}
                    label="Título"
                    required
                  >
                    <MenuItem value="Dr.">Dr.</MenuItem>
                    <MenuItem value="Dra.">Dra.</MenuItem>
                    <MenuItem value="Lic.">Lic.</MenuItem>
                    <MenuItem value="M.C.">M.C.</MenuItem>
                    <MenuItem value="Esp.">Esp.</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: '1 1 300px' }}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Especialidad</InputLabel>
                  <Select
                    value={formData.specialty}
                    onChange={handleInputChange('specialty')}
                    label="Especialidad"
                    required
                  >
                    {specialties.map((specialty) => (
                      <MenuItem key={specialty.id} value={specialty.id.toString()}>
                        {specialty.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Universidad"
                  value={formData.university}
                  onChange={handleInputChange('university')}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
            <TextField
              fullWidth
              margin="normal"
              label="Año de Graduación"
              value={formData.graduation_year}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleInputChange('graduation_year')({ target: { value } });
              }}
              placeholder="2020"
              helperText={`Solo números - Año entre 1950 y ${new Date().getFullYear()}`}
              inputProps={{ maxLength: 4 }}
              required
            />
              </Box>
            </Box>

            <TextField
              fullWidth
              margin="normal"
              label="Cédula Profesional"
              value={formData.professional_license}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleInputChange('professional_license')({ target: { value } });
              }}
              placeholder="12345678"
              helperText="Solo números (7-8 dígitos)"
              inputProps={{ maxLength: 8 }}
              required
            />
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Datos del Consultorio
            </Typography>
            
            {/* 1. Dirección */}
            <TextField
              fullWidth
              margin="normal"
              label="Nombre del Consultorio"
              value={formData.office_name}
              onChange={handleInputChange('office_name')}
              placeholder="Consultorio Médico Dr. García"
              helperText="Nombre que aparecerá en las citas"
              required
            />

            <TextField
              fullWidth
              margin="normal"
              label="Dirección"
              multiline
              rows={2}
              value={formData.office_address}
              onChange={handleInputChange('office_address')}
              placeholder="Av. Reforma 123, Col. Centro"
              helperText="Calle, número, colonia"
              required
            />

            {/* 2. País y Estado */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>País</InputLabel>
                  <Select
                    value={selectedOfficeCountry}
                    onChange={(e) => handleOfficeCountryChange(e.target.value)}
                    label="País"
                  >
                    {countries.map((country) => (
                      <MenuItem key={country.id} value={country.name}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.office_state_id}
                    onChange={handleInputChange('office_state_id')}
                    label="Estado"
                    disabled={!selectedOfficeCountry || filteredOfficeStates.length === 0}
                  >
                    {filteredOfficeStates.map((state: {id: number, name: string}) => (
                      <MenuItem key={state.id} value={String(state.id)}>
                        {state.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {!selectedOfficeCountry 
                      ? "Primero selecciona un país" 
                      : filteredOfficeStates.length === 0 
                      ? "No hay estados disponibles"
                      : "Estado/Provincia"
                    }
                  </FormHelperText>
                </FormControl>
              </Box>
            </Box>

            {/* 3. Ciudad y Duración de Consulta */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Ciudad"
                  value={formData.office_city}
                  onChange={handleInputChange('office_city')}
                  placeholder="Ciudad de México"
                  helperText="Ciudad del consultorio"
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Duración de Consulta"
                  value={formData.appointment_duration}
                  onChange={(e) => {
                    // Solo permitir números
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('appointment_duration')({ target: { value } });
                  }}
                  placeholder="30"
                  helperText="Tiempo en minutos (ej: 30)"
                  inputProps={{ maxLength: 3 }}
                  required
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>
                  }}
                />
              </Box>
            </Box>

            {/* 4. Teléfono del Consultorio */}
            <TextField
              fullWidth
              margin="normal"
              label="Teléfono del Consultorio"
              value={formData.office_phone}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                handleInputChange('office_phone')({ target: { value } });
              }}
              placeholder="5551234567"
              helperText="Solo números (opcional)"
              inputProps={{ maxLength: 15 }}
            />
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Horarios de Atención
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>¿Cómo funciona?</strong><br />
                  • Para cada día, haz click en <strong>"Agregar Horarios"</strong> para activarlo<br />
                  • Puedes tener múltiples horarios por día (ej: mañana y tarde)<br />
                  • Los pacientes solo podrán agendar en los horarios que configures
                </Typography>
              </Alert>
            </Box>

            <Box>
              {DAYS_OF_WEEK.map(day => {
                const dayKey = day.key as keyof WeeklyScheduleData;
                const schedule = formData.scheduleData[dayKey];
                const isActive = schedule?.is_active ?? false;
                const timeBlocks = schedule?.time_blocks || [];

                return (
                  <Card 
                    key={day.key} 
                    sx={{ 
                      mb: 2,
                      border: isActive ? '2px solid' : '1px solid',
                      borderColor: isActive ? 'primary.main' : 'divider',
                      backgroundColor: isActive ? 'primary.50' : 'background.paper',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      {/* Header del día */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mr: 2 }}>
                            {day.label}
                          </Typography>
                          
                          {/* Estado visual más claro */}
                          {isActive ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label="Disponible"
                                color="primary"
                                size="small"
                                icon={<AccessTime />}
                                variant="filled"
                              />
                              {timeBlocks.length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  {timeBlocks.length} horario{timeBlocks.length > 1 ? 's' : ''}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Chip
                              label="No disponible"
                              color="default"
                              size="small"
                              variant="outlined"
                            />
                          )}
                          
                          {/* Mostrar resumen de horarios */}
                          {isActive && timeBlocks.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                              {timeBlocks.map((block, index) => (
                                <Chip
                                  key={index}
                                  label={`${block.start_time} - ${block.end_time}`}
                                  variant="outlined"
                                  size="small"
                                  sx={{ backgroundColor: 'white' }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                        
                        {/* Botones de acción más claros */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {!isActive ? (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => updateDaySchedule(day.index, true)}
                              sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 500
                              }}
                            >
                              Agregar Horarios
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => addTimeBlock(day.index)}
                                sx={{
                                  borderRadius: '8px',
                                  textTransform: 'none',
                                  fontWeight: 500
                                }}
                              >
                                Nuevo Horario
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                color="error"
                                onClick={() => updateDaySchedule(day.index, false)}
                                sx={{
                                  borderRadius: '8px',
                                  textTransform: 'none',
                                  fontWeight: 500
                                }}
                              >
                                Desactivar
                              </Button>
                            </>
                          )}
                        </Box>
                      </Box>

                      {/* Configuración de horarios (solo si está activo) */}
                      {isActive && (
                        <Box sx={{ mt: 2 }}>
                          {timeBlocks.length === 0 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              <Typography variant="body2">
                                <strong>¡Agrega tu primer horario!</strong><br />
                                Haz click en "Nuevo Horario" para definir cuándo atiendes este día.
                              </Typography>
                            </Alert>
                          )}

                          {timeBlocks.map((block, blockIndex) => (
                            <Card key={blockIndex} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', backgroundColor: 'background.default' }}>
                              <CardContent sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                                    Horario {blockIndex + 1}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeTimeBlock(day.index, blockIndex)}
                                    disabled={timeBlocks.length === 1}
                                    sx={{
                                      '&:hover': {
                                        backgroundColor: 'error.50'
                                      }
                                    }}
                                  >
                                    <Cancel />
                                  </IconButton>
                                </Box>
                                
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                                      <TimePicker
                                        label="Hora de inicio"
                                        value={formatTime(block.start_time)}
                                        onChange={(newValue) => {
                                          if (newValue) {
                                            updateTimeBlock(day.index, blockIndex, 'start_time', formatTimeToString(newValue));
                                          }
                                        }}
                                        closeOnSelect={true}
                                        openTo="hours"
                                        slotProps={{
                                          textField: {
                                            size: "small",
                                            fullWidth: true
                                          },
                                          actionBar: {
                                            actions: []
                                          }
                                        }}
                                      />
                                    </LocalizationProvider>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                                      <TimePicker
                                        label="Hora de fin"
                                        value={formatTime(block.end_time)}
                                        onChange={(newValue) => {
                                          if (newValue) {
                                            updateTimeBlock(day.index, blockIndex, 'end_time', formatTimeToString(newValue));
                                          }
                                        }}
                                        closeOnSelect={true}
                                        openTo="hours"
                                        slotProps={{
                                          textField: {
                                            size: "small",
                                            fullWidth: true
                                          },
                                          actionBar: {
                                            actions: []
                                          }
                                        }}
                                      />
                                    </LocalizationProvider>
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {timeBlocks.length > 0 && (
                            <Alert severity="success" icon={<AccessTime />} sx={{ mt: 2 }}>
                              <Typography variant="body2">
                                <strong>Resumen para {day.label}:</strong><br />
                                Los pacientes podrán agendar citas de {timeBlocks.map((block, index) => (
                                  <span key={index}>
                                    {block.start_time} a {block.end_time}
                                    {index < timeBlocks.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </Typography>
                            </Alert>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        );

      default:
        return 'Paso desconocido';
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%',
            p: 4,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={onBackToLogin}
                sx={{ color: 'text.secondary' }}
              >
                Volver al login
              </Button>
              <CortexLogo variant="full" sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>

            <Typography variant="h4" gutterBottom>
              Crear Cuenta
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Únete a CORTEX y gestiona tu práctica médica de manera profesional
            </Typography>

            {error && (
              <Box 
                ref={errorRef}
                sx={{ width: '100%', mb: 2, p: 2, bgcolor: 'error.main', borderRadius: 1 }}
              >
                <Typography color="white">{error}</Typography>
              </Box>
            )}
            {console.log('🔍 Render - error state:', error)}

            <Box sx={{ width: '100%', mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Registro de Usuario
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Haz clic en cualquier paso para navegar directamente
                </Typography>
              </Box>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel
                      onClick={() => handleStepClick(index)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderRadius: 1
                        },
                        p: 1,
                        borderRadius: 1,
                        transition: 'background-color 0.2s ease'
                      }}
                      StepIconComponent={() => {
                        const isActive = index === activeStep;
                        const isCompleted = index < activeStep;
                        const isVisited = visitedSteps.has(index);
                        
                        return (
                          <Avatar
                            sx={{
                              bgcolor: isCompleted 
                                ? 'success.main' 
                                : isActive 
                                  ? 'primary.main' 
                                  : isVisited 
                                    ? 'info.main' 
                                    : 'grey.300',
                              color: 'white',
                              width: 32,
                              height: 32,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              border: isActive ? '2px solid' : 'none',
                              borderColor: isActive ? 'primary.dark' : 'transparent',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                bgcolor: isCompleted 
                                  ? 'success.dark' 
                                  : isActive 
                                    ? 'primary.dark' 
                                    : isVisited 
                                      ? 'info.dark' 
                                      : 'grey.400'
                              }
                            }}
                          >
                            {isCompleted ? <Save fontSize="small" /> : step.icon}
                          </Avatar>
                        );
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: index === activeStep ? 600 : 400,
                          cursor: 'pointer',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        {step.label}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      {getStepContent(index)}
                      
                      <Box sx={{ mb: 2, mt: 3 }}>
                        <div>
                          {index === steps.length - 1 ? (
                            <Button
                              variant="contained"
                              onClick={handleSubmit}
                              disabled={isLoading}
                              startIcon={isLoading ? <CircularProgress size={20} /> : null}
                            >
                              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              onClick={handleNext}
                              sx={{ mt: 1, mr: 1 }}
                            >
                              Continuar
                            </Button>
                          )}
                          
                          <Button
                            disabled={index === 0 || isLoading}
                            onClick={handleBack}
                            sx={{ mt: 1, mr: 1 }}
                          >
                            Atrás
                          </Button>
                        </div>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterView;
