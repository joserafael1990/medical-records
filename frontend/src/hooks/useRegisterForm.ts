import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useCatalogs } from './useCatalogs';
import { useScrollToError } from './useScrollToError';
import { MEDICAL_SPECIALTIES, API_CONFIG } from '../constants';

export interface TimeBlock {
  start_time: string;
  end_time: string;
}

export interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  time_blocks: TimeBlock[];
}

export interface WeeklyScheduleData {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface RegistrationData {
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
  office_address: string;
  office_country: string;
  office_state_id: string;
  office_city: string;
  office_phone: string;
  appointment_duration: string;
  
  // Step 5: Schedule Data
  scheduleData: WeeklyScheduleData;
}

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

export interface UseRegisterFormReturn {
  // Form state
  formData: RegistrationData;
  setFormData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  
  // Step management
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  visitedSteps: Set<number>;
  setVisitedSteps: React.Dispatch<React.SetStateAction<Set<number>>>;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  catalogsLoading: boolean;
  
  // Error handling
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  fieldErrors: Record<string, string>;
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  // Password validation
  passwordValidation: PasswordValidation;
  setPasswordValidation: React.Dispatch<React.SetStateAction<PasswordValidation>>;
  
  // UI state
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Data
  specialties: any[];
  countries: any[];
  states: any[];
  selectedOfficeCountry: string;
  setSelectedOfficeCountry: React.Dispatch<React.SetStateAction<string>>;
  
  // Actions
  handleInputChange: (field: string, value: any) => void;
  handleScheduleChange: (day: string, schedule: DaySchedule) => void;
  handleTimeBlockChange: (day: string, blockIndex: number, field: string, value: string) => void;
  handleAddTimeBlock: (day: string) => void;
  handleRemoveTimeBlock: (day: string, blockIndex: number) => void;
  handleNext: () => void;
  handleBack: () => void;
  handleSubmit: () => Promise<void>;
  validateStep: (step: number) => boolean;
  validatePassword: (password: string) => PasswordValidation;
  validateCURP: (curp: string) => boolean;
  validateEmail: (email: string) => boolean;
  
  // Error refs
  errorRef: React.RefObject<HTMLDivElement>;
}

export const useRegisterForm = (): UseRegisterFormReturn => {
  const { login } = useAuth();
  const { countries, getStatesByCountry, loading: catalogsLoading } = useCatalogs();
  
  // Form state
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    curp: '',
    gender: '',
    birth_date: '',
    phone: '',
    title: '',
    specialty: '',
    university: '',
    graduation_year: '',
    professional_license: '',
    office_address: '',
    office_country: 'México',
    office_state_id: '',
    office_city: '',
    office_phone: '',
    appointment_duration: '30',
    scheduleData: {}
  });
  
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  
  // Error handling
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Password validation
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Data
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [selectedOfficeCountry, setSelectedOfficeCountry] = useState<string>('México');
  
  // Auto-scroll to error when it appears
  const errorRef = useScrollToError(error);
  
  // Load specialties on component mount
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/catalogs/specialties`);
        if (response.ok) {
          const data = await response.json();
          setSpecialties(data);
        } else {
          setSpecialties(MEDICAL_SPECIALTIES);
        }
      } catch (error) {
        console.error('Error loading specialties:', error);
        setSpecialties(MEDICAL_SPECIALTIES);
      }
    };
    
    loadSpecialties();
  }, []);
  
  // Get states when country changes
  const states = getStatesByCountry(selectedOfficeCountry);
  
  // Handle input change
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    
    // Validate password when password field changes
    if (field === 'password') {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    }
  }, [fieldErrors]);
  
  // Handle schedule change
  const handleScheduleChange = useCallback((day: string, schedule: DaySchedule) => {
    setFormData(prev => ({
      ...prev,
      scheduleData: {
        ...prev.scheduleData,
        [day]: schedule
      }
    }));
  }, []);
  
  // Handle time block change
  const handleTimeBlockChange = useCallback((day: string, blockIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const daySchedule = prev.scheduleData[day as keyof WeeklyScheduleData];
      if (!daySchedule) return prev;
      
      const updatedBlocks = [...daySchedule.time_blocks];
      updatedBlocks[blockIndex] = {
        ...updatedBlocks[blockIndex],
        [field]: value
      };
      
      return {
        ...prev,
        scheduleData: {
          ...prev.scheduleData,
          [day]: {
            ...daySchedule,
            time_blocks: updatedBlocks
          }
        }
      };
    });
  }, []);
  
  // Handle add time block
  const handleAddTimeBlock = useCallback((day: string) => {
    setFormData(prev => {
      const daySchedule = prev.scheduleData[day as keyof WeeklyScheduleData];
      if (!daySchedule) return prev;
      
      return {
        ...prev,
        scheduleData: {
          ...prev.scheduleData,
          [day]: {
            ...daySchedule,
            time_blocks: [
              ...daySchedule.time_blocks,
              { start_time: '09:00', end_time: '17:00' }
            ]
          }
        }
      };
    });
  }, []);
  
  // Handle remove time block
  const handleRemoveTimeBlock = useCallback((day: string, blockIndex: number) => {
    setFormData(prev => {
      const daySchedule = prev.scheduleData[day as keyof WeeklyScheduleData];
      if (!daySchedule) return prev;
      
      const updatedBlocks = daySchedule.time_blocks.filter((_, index) => index !== blockIndex);
      
      return {
        ...prev,
        scheduleData: {
          ...prev.scheduleData,
          [day]: {
            ...daySchedule,
            time_blocks: updatedBlocks
          }
        }
      };
    });
  }, []);
  
  // Validate password
  const validatePassword = useCallback((password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  }, []);
  
  // Validate CURP
  const validateCURP = useCallback((curp: string): boolean => {
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
    return curpRegex.test(curp);
  }, []);
  
  // Validate email
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);
  
  // Validate step
  const validateStep = useCallback((step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 0: // Account Info
        if (!formData.email) errors.email = 'El email es obligatorio';
        else if (!validateEmail(formData.email)) errors.email = 'El email no es válido';
        
        if (!formData.password) errors.password = 'La contraseña es obligatoria';
        else {
          const validation = validatePassword(formData.password);
          if (!validation.minLength) errors.password = 'La contraseña debe tener al menos 8 caracteres';
          else if (!validation.hasUppercase) errors.password = 'La contraseña debe tener al menos una mayúscula';
          else if (!validation.hasLowercase) errors.password = 'La contraseña debe tener al menos una minúscula';
          else if (!validation.hasNumbers) errors.password = 'La contraseña debe tener al menos un número';
          else if (!validation.hasSpecialChars) errors.password = 'La contraseña debe tener al menos un carácter especial';
        }
        
        if (!formData.confirmPassword) errors.confirmPassword = 'La confirmación de contraseña es obligatoria';
        else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Las contraseñas no coinciden';
        }
        break;
        
      case 1: // Personal Information
        if (!formData.first_name) errors.first_name = 'El nombre es obligatorio';
        if (!formData.paternal_surname) errors.paternal_surname = 'El apellido paterno es obligatorio';
        if (!formData.curp) errors.curp = 'El CURP es obligatorio';
        else if (!validateCURP(formData.curp)) errors.curp = 'El CURP no es válido';
        if (!formData.gender) errors.gender = 'El género es obligatorio';
        if (!formData.birth_date) errors.birth_date = 'La fecha de nacimiento es obligatoria';
        if (!formData.phone) errors.phone = 'El teléfono es obligatorio';
        break;
        
      case 2: // Professional Information
        if (!formData.title) errors.title = 'El título es obligatorio';
        if (!formData.specialty) errors.specialty = 'La especialidad es obligatoria';
        if (!formData.university) errors.university = 'La universidad es obligatoria';
        if (!formData.graduation_year) errors.graduation_year = 'El año de graduación es obligatorio';
        if (!formData.professional_license) errors.professional_license = 'La cédula profesional es obligatoria';
        break;
        
      case 3: // Office Data
        if (!formData.office_address) errors.office_address = 'La dirección del consultorio es obligatoria';
        if (!formData.office_city) errors.office_city = 'La ciudad es obligatoria';
        if (!formData.office_phone) errors.office_phone = 'El teléfono del consultorio es obligatorio';
        if (!formData.appointment_duration) errors.appointment_duration = 'La duración de citas es obligatoria';
        break;
        
      case 4: // Schedule Data
        // Schedule validation is optional, but we can add basic validation if needed
        break;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateEmail, validatePassword, validateCURP]);
  
  // Handle next step
  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) {
      setVisitedSteps(prev => new Set([...prev, activeStep + 1]));
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, validateStep]);
  
  // Handle back step
  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
  }, []);
  
  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateStep(activeStep)) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await apiService.auth.register(formData);
      // Auto-login after successful registration
      await login(formData.email, formData.password);
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Error al registrar el doctor');
    } finally {
      setIsLoading(false);
    }
  }, [formData, activeStep, validateStep, login]);
  
  return {
    formData,
    setFormData,
    activeStep,
    setActiveStep,
    visitedSteps,
    setVisitedSteps,
    isLoading,
    setIsLoading,
    catalogsLoading,
    error,
    setError,
    fieldErrors,
    setFieldErrors,
    passwordValidation,
    setPasswordValidation,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    specialties,
    countries,
    states,
    selectedOfficeCountry,
    setSelectedOfficeCountry,
    handleInputChange,
    handleScheduleChange,
    handleTimeBlockChange,
    handleAddTimeBlock,
    handleRemoveTimeBlock,
    handleNext,
    handleBack,
    handleSubmit,
    validateStep,
    validatePassword,
    validateCURP,
    validateEmail,
    errorRef
  };
};
