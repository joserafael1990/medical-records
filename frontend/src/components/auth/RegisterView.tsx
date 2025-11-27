import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services';
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
  Chip
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
import { CountryCodeSelector } from '../common/CountryCodeSelector';
import { PhoneNumberInput } from '../common/PhoneNumberInput';
import { MEDICAL_SPECIALTIES, API_CONFIG } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useScrollToError } from '../../hooks/useScrollToError';
import { DocumentSelector } from '../common/DocumentSelector';
import { logger } from '../../utils/logger';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AccountInfoStep } from './RegisterView/AccountInfoStep';
import { PersonalInfoStep } from './RegisterView/PersonalInfoStep';
import { ProfessionalInfoStep } from './RegisterView/ProfessionalInfoStep';
import { OfficeInfoStep } from './RegisterView/OfficeInfoStep';
import { ScheduleStep } from './RegisterView/ScheduleStep';
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
  name: string;
  personal_documents: Array<{ document_id: number | null; document_value: string }>;
  gender: string;
  birth_date: string;
  phone_country_code: string;
  phone_number: string;
  
  // Step 3: Professional Information
  title: string;
  specialty: string;
  university: string;
  graduation_year: string;
  professional_documents: Array<{ document_id: number | null; document_value: string }>;
  
  // Step 4: Office Data
  office_name: string;
  office_address: string;
  office_country: string;
  office_state_id: string;
  office_city: string;
  office_phone_country_code: string;
  office_phone_number: string;
  office_maps_url: string;
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
  // Password visibility state removed - now handled in AccountInfoStep component
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [attemptedContinue, setAttemptedContinue] = useState<Set<number>>(new Set());
  
  const { login } = useAuth();
  const { countries, getStatesByCountry, loading: catalogsLoading } = useCatalogs();
  const [selectedOfficeCountry, setSelectedOfficeCountry] = useState<string>('México');
  
  // Auto-scroll to error when it appears
  const errorRef = useScrollToError(error);

  // Load specialties on component mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const data = await apiService.catalogs.getSpecialties();
        // Asegurar que siempre sea un array
        const specialtiesArray = Array.isArray(data) ? data : (data?.data || data?.results || []);
        setSpecialties(specialtiesArray);
        logger.debug('Especialidades cargadas', { count: specialtiesArray.length }, 'api');
      } catch (error) {
        logger.error('Error loading specialties', error, 'api');
        // Intentar con el endpoint alternativo
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/catalogs/specialties`);
          const data = await response.json();
          // Asegurar que siempre sea un array
          const specialtiesArray = Array.isArray(data) ? data : (data?.data || data?.results || []);
          setSpecialties(specialtiesArray);
          logger.debug('Especialidades cargadas (fallback)', { count: specialtiesArray.length }, 'api');
        } catch (fallbackError) {
          logger.error('Error en fallback de especialidades', fallbackError, 'api');
          setSpecialties([]); // Asegurar array vacío en caso de error
        }
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
    name: '',
    personal_documents: [{ document_id: null, document_value: '' }],
    gender: '',
    birth_date: '',
    phone_country_code: '+52', // Código de país por defecto (México)
    phone_number: '',
    
    // Step 3
    title: 'Dr.',
    specialty: '',
    university: '',
    graduation_year: '',
    professional_documents: [{ document_id: null, document_value: '' }],
    
    // Step 4
    office_name: '',
    office_address: '',
    office_country: 'México',
    office_state_id: '',
    office_city: '',
    office_phone_country_code: '+52', // Código de país por defecto (México)
    office_phone_number: '',
    office_maps_url: '',
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
        const requiredFields = ['name', 'gender', 'birth_date', 'phone_country_code', 'phone_number'];
        const missingFields = requiredFields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingFields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        // Validate personal document
        const validPersonalDocs = formData.personal_documents.filter(doc => doc.document_id && doc.document_value.trim());
        if (validPersonalDocs.length === 0) {
          setError('Debe proporcionar un documento personal con su valor');
          return false;
        }
        // Validate phone number has at least some digits
        if (!formData.phone_number || formData.phone_number.trim().length < 7) {
          setError('El número telefónico debe tener al menos 7 dígitos');
          return false;
        }
        return true;
      
      case 2:
        const requiredStep2Fields = ['title', 'specialty', 'university', 'graduation_year'];
        const missingStep2Fields = requiredStep2Fields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingStep2Fields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        // Validate at least one professional document
        const validProfessionalDocs = formData.professional_documents.filter(doc => doc.document_id && doc.document_value.trim());
        if (validProfessionalDocs.length === 0) {
          setError('Debe proporcionar al menos un documento profesional con su valor');
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
        const requiredStep3Fields = ['office_name', 'office_address', 'office_city', 'office_state_id', 'office_phone_country_code', 'office_phone_number', 'appointment_duration'];
        const missingStep3Fields = requiredStep3Fields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingStep3Fields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        
        // Validate office phone number has at least some digits
        if (!formData.office_phone_number || formData.office_phone_number.trim().length < 7) {
          setError('El número telefónico del consultorio debe tener al menos 7 dígitos');
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
    // Mark that user attempted to continue on this step
    setAttemptedContinue(prev => new Set(prev).add(activeStep));
    
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
      // Concatenar código de país con número telefónico personal
      const fullPhoneNumber = `${formData.phone_country_code}${formData.phone_number.trim()}`;
      
      // Concatenar código de país con número telefónico del consultorio
      const fullOfficePhoneNumber = `${formData.office_phone_country_code}${formData.office_phone_number.trim()}`;
      
      // Prepare documents array (filter out empty ones)
      const allDocuments = [
        ...formData.personal_documents.filter(doc => doc.document_id && doc.document_value.trim()),
        ...formData.professional_documents.filter(doc => doc.document_id && doc.document_value.trim())
      ].map(doc => ({
        document_id: doc.document_id!,
        document_value: doc.document_value.trim()
      }));

      // Create doctor profile first
      const doctorProfileData = {
        title: formData.title,
        name: formData.name,
        gender: formData.gender,
        birth_date: formData.birth_date, // Ensure YYYY-MM-DD format
        primary_phone: fullPhoneNumber, // Concatenar código de país + número
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
        office_phone: fullOfficePhoneNumber || '', // Concatenar código de país + número
        office_maps_url: formData.office_maps_url || '',
        // Documents (normalized)
        documents: allDocuments,
        // Schedule data
        schedule_data: formData.scheduleData,
        // System fields
        created_by: `${formData.title} ${formData.name}`.trim()
      };

      // Track registration started
      try {
        const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
        trackAmplitudeEvent('registration_started', {
          step: currentStep,
          total_steps: 5
        });
      } catch (e) {
        // Silently fail
      }

      // Register the doctor (creates profile and handles authentication automatically)
      logger.debug('Sending registration data', { doctorProfileData }, 'auth');
      
      const registrationResponse = await apiService.auth.register(doctorProfileData);
      
      // The registration endpoint already handles login and saves token automatically
      if (registrationResponse.access_token) {
        logger.debug('Registration successful, token saved', undefined, 'auth');
        
        // Track registration completed
        try {
          const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
          trackAmplitudeEvent('registration_completed', {
            has_specialty: !!doctorProfileData.specialty_id,
            has_office: !!doctorProfileData.office_address
          });
        } catch (e) {
          // Silently fail
        }
        
        // Force reload to trigger authentication state update
        window.location.reload();
      } else {
        throw new Error('No se recibió token de autenticación');
      }

    } catch (error: any) {
      // Track registration failed
      try {
        const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
        trackAmplitudeEvent('registration_failed', {
          error_type: error?.response?.status === 400 ? 'validation_error' : 
                     error?.response?.status === 409 ? 'duplicate_email' : 
                     error?.response?.status === 500 ? 'server_error' : 'unknown',
          step: currentStep
        });
      } catch (e) {
        // Silently fail
      }
      // Comprehensive error logging
      console.error('Registration error - Full details:', {
        error: error,
        errorString: String(error),
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error?.message,
        errorDetail: error?.detail,
        errorResponse: error?.response,
        errorResponseData: error?.response?.data,
        errorStatus: error?.status,
        errorStack: error?.stack
      });
      
      logger.error('Registration error', {
        message: error?.message,
        detail: error?.detail,
        response: error?.response?.data,
        status: error?.status || error?.response?.status
      }, 'auth');
      
      // Extract specific error message from API response
      let errorMessage = 'Error durante el registro. Intenta nuevamente.';
      
      // The API service transforms errors into ApiError format with { detail: string, status: number }
      if (error?.detail) {
        // Use the specific error message from the API service
        logger.debug('Using error.detail', { detail: error.detail }, 'auth');
        errorMessage = error.detail;
      } else if (error.response?.data?.detail) {
        // Fallback: Use the raw response if available
        logger.debug('Using error.response.data.detail', { detail: error.response.data.detail }, 'auth');
        errorMessage = error.response.data.detail;
      } else if (error.status === 400 || error.response?.status === 400) {
        logger.debug('Using 400 error message', undefined, 'auth');
        errorMessage = 'Los datos proporcionados no son válidos. Por favor, revise la información.';
      } else if (error.status === 500 || error.response?.status === 500) {
        logger.debug('Using 500 error message', undefined, 'auth');
        errorMessage = 'Error interno del servidor. Por favor, intente nuevamente más tarde.';
      } else if (error.message) {
        logger.debug('Using error.message', { message: error.message }, 'auth');
        errorMessage = error.message;
      }
      
      logger.debug('Final error message', { errorMessage }, 'auth');
      setError(errorMessage);
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
          <AccountInfoStep
            email={formData.email}
            password={formData.password}
            confirmPassword={formData.confirmPassword}
            onEmailChange={(value) => handleInputChange('email')({ target: { value } })}
            onPasswordChange={(value) => handleInputChange('password')({ target: { value } })}
            onConfirmPasswordChange={(value) => handleInputChange('confirmPassword')({ target: { value } })}
          />
        );

      case 1:
        return (
          <PersonalInfoStep
            name={formData.name}
            personalDocument={formData.personal_documents[0]}
            gender={formData.gender}
            birthDate={formData.birth_date}
            phoneCountryCode={formData.phone_country_code}
            phoneNumber={formData.phone_number}
            onNameChange={(value) => handleInputChange('name')({ target: { value } })}
            onPersonalDocumentChange={(docValue) => {
              setFormData(prev => ({
                ...prev,
                personal_documents: [docValue]
              }));
            }}
            onGenderChange={(value) => handleInputChange('gender')({ target: { value } })}
            onBirthDateChange={(value) => {
              setFormData(prev => ({ ...prev, birth_date: value }));
            }}
            onPhoneCountryCodeChange={(value) => handleInputChange('phone_country_code')({ target: { value } })}
            onPhoneNumberChange={(value) => handleInputChange('phone_number')({ target: { value } })}
            hasAttemptedContinue={attemptedContinue.has(1)}
          />
        );

      case 2:
        return (
          <ProfessionalInfoStep
            title={formData.title}
            specialty={formData.specialty}
            university={formData.university}
            graduationYear={formData.graduation_year}
            professionalDocument={formData.professional_documents[0]}
            specialties={specialties}
            onTitleChange={(value) => handleInputChange('title')({ target: { value } })}
            onSpecialtyChange={(value) => handleInputChange('specialty')({ target: { value } })}
            onUniversityChange={(value) => handleInputChange('university')({ target: { value } })}
            onGraduationYearChange={(value) => handleInputChange('graduation_year')({ target: { value } })}
            onProfessionalDocumentChange={(docValue) => {
              setFormData(prev => ({
                ...prev,
                professional_documents: [docValue]
              }));
            }}
            hasAttemptedContinue={attemptedContinue.has(2)}
          />
        );

      case 3:
        return (
          <OfficeInfoStep
            officeName={formData.office_name}
            officeAddress={formData.office_address}
            officeCountry={formData.office_country}
            officeStateId={formData.office_state_id}
            officeCity={formData.office_city}
            officePhoneCountryCode={formData.office_phone_country_code}
            officePhoneNumber={formData.office_phone_number}
            officeMapsUrl={formData.office_maps_url}
            appointmentDuration={formData.appointment_duration}
            selectedOfficeCountry={selectedOfficeCountry}
            countries={countries}
            filteredOfficeStates={filteredOfficeStates}
            onOfficeNameChange={(value) => handleInputChange('office_name')({ target: { value } })}
            onOfficeAddressChange={(value) => handleInputChange('office_address')({ target: { value } })}
            onOfficeCountryChange={(value) => handleInputChange('office_country')({ target: { value } })}
            onOfficeStateIdChange={(value) => handleInputChange('office_state_id')({ target: { value } })}
            onOfficeCityChange={(value) => handleInputChange('office_city')({ target: { value } })}
            onOfficePhoneCountryCodeChange={(value) => handleInputChange('office_phone_country_code')({ target: { value } })}
            onOfficePhoneNumberChange={(value) => handleInputChange('office_phone_number')({ target: { value } })}
            onOfficeMapsUrlChange={(value) => handleInputChange('office_maps_url')({ target: { value } })}
            onAppointmentDurationChange={(value) => handleInputChange('appointment_duration')({ target: { value } })}
            onSelectedOfficeCountryChange={(value) => handleOfficeCountryChange(value)}
          />
        );

      case 4:
        return (
          <ScheduleStep
            scheduleData={formData.scheduleData}
            onUpdateDaySchedule={updateDaySchedule}
            onAddTimeBlock={addTimeBlock}
            onRemoveTimeBlock={removeTimeBlock}
            onUpdateTimeBlock={updateTimeBlock}
            formatTime={formatTime}
            formatTimeToString={formatTimeToString}
          />
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
