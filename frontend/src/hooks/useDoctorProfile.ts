import { useState, useCallback, useEffect } from 'react';
import { DoctorProfile, DoctorFormData, FieldErrors } from '../types';
import { API_CONFIG } from '../constants';
import { apiService } from '../services/api';

interface UseDoctorProfileReturn {
  // State
  doctorProfile: DoctorProfile | null;
  isLoading: boolean;
  isEditing: boolean;
  dialogOpen: boolean;
  formData: DoctorFormData;
  fieldErrors: FieldErrors;
  formErrorMessage: string;
  successMessage: string;
  isSubmitting: boolean;

  // Actions
  setFormData: (data: DoctorFormData | ((prev: DoctorFormData) => DoctorFormData)) => void;
  setFormErrorMessage: (message: string) => void;
  handleEdit: () => void;
  handleCreate: () => void;
  handleCancel: () => void;
  handleSubmit: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearMessages: () => void;
}

const initialFormData: DoctorFormData = {
  // Información Personal
  title: 'Dr.',
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  email: '',
  phone: '',
  birth_date: '',
  gender: '',
  
  // Identificación Legal
  curp: '',
  rfc: '',
  
  // Información Profesional
  professional_license: '',
  specialty_license: '',
  university: '',
  graduation_year: '',
  specialty: '',
  subspecialty: '',
  
  // Contacto Profesional
  professional_email: '',
  office_phone: '',
  
  // Dirección del Consultorio
  office_address: '',
  office_city: '',
  office_state_id: '',
  office_country: 'México',
  office_postal_code: '',
  office_timezone: 'America/Mexico_City',
  appointment_duration: '',
  
  // Información Adicional
  // medical_school, internship_hospital, residency_hospital removed per user request
  
  // Certificaciones removed per user request
  // board_certifications: '',
  // professional_memberships: ''
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatDateForInput = (isoDate: string): string => {
  if (!isoDate) return '';
  // Convert from "1990-02-10T00:00:00" to "1990-02-10"
  return isoDate.split('T')[0];
};

const formatDateForBackend = (inputDate: string): string => {
  if (!inputDate) return '';
  // Keep date format as YYYY-MM-DD for backend date field
  return inputDate.split('T')[0];
};

export const useDoctorProfile = (): UseDoctorProfileReturn => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DoctorFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateForm = (data: DoctorFormData, isEditMode: boolean = false): { isValid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {};

    // En modo edición, solo validamos campos que tienen contenido o son críticos
    // En modo creación, validamos todos los campos requeridos
    
    // Información Personal - Solo validar si está presente o en modo creación
    if (!isEditMode || data.first_name?.trim()) {
      if (!data.first_name?.trim()) {
        errors.first_name = 'El nombre es requerido';
      }
    }
    
    if (!isEditMode || data.paternal_surname?.trim()) {
      if (!data.paternal_surname?.trim()) {
        errors.paternal_surname = 'El apellido paterno es requerido';
      }
    }
    
    // maternal_surname is optional for doctors too
    
    // Email siempre debe ser válido si está presente
    if (data.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Formato de correo inválido';
      }
    } else if (!isEditMode) {
      errors.email = 'El correo electrónico es requerido';
    }
    
    if (!isEditMode || data.phone?.trim()) {
      if (!data.phone?.trim()) {
        errors.phone = 'El teléfono es requerido';
      }
    }
    
    if (!isEditMode || data.birth_date?.trim()) {
      if (!data.birth_date?.trim()) {
        errors.birth_date = 'La fecha de nacimiento es requerida';
      }
    }

    // Información Profesional - Solo validar si está presente o en modo creación
    if (!isEditMode || data.professional_license?.trim()) {
      if (!data.professional_license?.trim()) {
        errors.professional_license = 'La cédula profesional es requerida';
      }
    }
    
    if (!isEditMode || data.university?.trim()) {
      if (!data.university?.trim()) {
        errors.university = 'La universidad es requerida';
      }
    }
    
    // Validación especial para año de graduación
    if (data.graduation_year && String(data.graduation_year).trim()) {
      const year = parseInt(String(data.graduation_year));
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1950 || year > currentYear) {
        errors.graduation_year = `El año debe estar entre 1950 y ${currentYear}`;
      }
    } else if (!isEditMode) {
      errors.graduation_year = 'El año de graduación es requerido';
    }
    
    if (!isEditMode || data.specialty?.trim()) {
      if (!data.specialty?.trim()) {
        errors.specialty = 'La especialidad es requerida';
      }
    }
    
    // medical_school validation removed per user request

    // Información del Consultorio - Solo validar si está presente o en modo creación
    if (!isEditMode || data.office_address?.trim()) {
      if (!data.office_address?.trim()) {
        errors.office_address = 'La dirección del consultorio es requerida';
      }
    }
    
    if (!isEditMode || data.office_city?.trim()) {
      if (!data.office_city?.trim()) {
        errors.office_city = 'La ciudad es requerida';
      }
    }
    
    if (!isEditMode || data.office_state_id?.trim()) {
      if (!data.office_state_id?.trim()) {
        errors.office_state_id = 'El estado es requerido';
      }
    }
    
    if (!isEditMode || data.office_country?.trim()) {
      if (!data.office_country?.trim()) {
        errors.office_country = 'El país es requerido';
      }
    }

    // Validaciones de formato - siempre aplicar si el campo tiene contenido
    if (data.professional_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.professional_email)) {
      errors.professional_email = 'Formato de correo profesional inválido';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchProfile = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoading) return;
    
    setIsLoading(true);
    setFormErrorMessage('');
    
    try {
      const data = await apiService.getDoctorProfile();
      setDoctorProfile(data);
    } catch (error: any) {
      // Handle 404 specifically (profile doesn't exist yet)
      if (error.response?.status === 404) {
        setDoctorProfile(null);
      } else {
        // Log error for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching doctor profile:', error);
        }
        setFormErrorMessage('Error al cargar el perfil del médico');
        setDoctorProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // ✅ Empty dependency array - only created once

  const saveProfile = async (data: DoctorFormData): Promise<void> => {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOR_PROFILE}`;
    const method = isEditing ? 'PUT' : 'POST';

    // Transform string fields to arrays and format date for backend
    let transformedData: any = {
      ...data,
      birth_date: formatDateForBackend(data.birth_date),
      appointment_duration: data.appointment_duration ? parseInt(data.appointment_duration) : null,
      office_state_id: data.office_state_id ? parseInt(data.office_state_id) : null,
      // board_certifications and professional_memberships removed per user request
      created_by: doctorProfile 
        ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name || ''} ${doctorProfile.paternal_surname || ''}`.trim()
        : "Usuario"
    };

    // En modo edición, solo enviar campos que tienen contenido (edición parcial)
    if (method === 'PUT') {
      const fieldsToSend: any = {};
      
      // Solo incluir campos que tienen valor
      Object.keys(transformedData).forEach(key => {
        const value = transformedData[key];
        if (value !== null && value !== undefined && value !== '') {
          // Para arrays, solo incluir si no están vacíos
          if (Array.isArray(value)) {
            if (value.length > 0) {
              fieldsToSend[key] = value;
            }
          } else {
            fieldsToSend[key] = value;
          }
        }
      });
      
      transformedData = fieldsToSend;
    }

    // Use apiService instead of fetch to ensure authentication headers are included
    if (method === 'PUT') {
      const savedProfile = await apiService.updateDoctorProfile(transformedData);
      setDoctorProfile(savedProfile);
    } else {
      const savedProfile = await apiService.createDoctorProfile(transformedData);
      setDoctorProfile(savedProfile);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const clearMessages = useCallback(() => {
    setSuccessMessage('');
    setFormErrorMessage('');
    setFieldErrors({});
  }, []);

  const handleEdit = useCallback(() => {
    if (doctorProfile) {
      // Populate form with existing data
      setFormData({
        title: doctorProfile.title || '',
        first_name: doctorProfile.first_name || '',
        paternal_surname: doctorProfile.paternal_surname || '',
        maternal_surname: doctorProfile.maternal_surname || '',
        email: doctorProfile.email || '',
        phone: doctorProfile.primary_phone || '',
        birth_date: formatDateForInput(doctorProfile.birth_date || ''),
        gender: (doctorProfile as any).gender || '',
        curp: doctorProfile.curp || '',
        rfc: doctorProfile.rfc || '',
        professional_license: doctorProfile.professional_license || '',
        specialty_license: doctorProfile.specialty_license || '',
        university: doctorProfile.university || '',
        graduation_year: doctorProfile.graduation_year || '',
        specialty: doctorProfile.specialty_name || '',
        subspecialty: doctorProfile.subspecialty || '',
        professional_email: doctorProfile.professional_email || '',
        office_phone: doctorProfile.office_phone || '',
        office_address: doctorProfile.office_address || '',
        office_city: doctorProfile.office_city || '',
        office_state_id: String(doctorProfile.office_state_id || ''),
        office_country: (doctorProfile as any).office_country || 'México',
        office_postal_code: doctorProfile.office_postal_code || '',
        office_timezone: doctorProfile.office_timezone || 'America/Mexico_City',
        appointment_duration: String(doctorProfile.appointment_duration || ''),
        // medical_school, internship_hospital, residency_hospital removed per user request
        // board_certifications and professional_memberships removed per user request
      });
      setIsEditing(true);
    }
    setDialogOpen(true);
    clearMessages();
  }, [doctorProfile, clearMessages, dialogOpen]);

  const handleCreate = useCallback(() => {
    setFormData(initialFormData);
    setIsEditing(false);
    setDialogOpen(true);
    clearMessages();
  }, [clearMessages]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setFormData(initialFormData);
    clearMessages();
  }, [clearMessages]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    clearMessages();

    try {
      // Validate form (más flexible en modo edición)
      const { isValid, errors } = validateForm(formData, isEditing);
      
      if (!isValid) {
        setFieldErrors(errors);
        setFormErrorMessage('Por favor corrige los errores en el formulario');
        return;
      }

      // Save profile
      await saveProfile(formData);

      // Success
      setSuccessMessage(
        isEditing 
          ? '✅ Perfil actualizado exitosamente' 
          : '✅ Perfil creado exitosamente'
      );
      setDialogOpen(false);
      setFormData(initialFormData);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error: any) {
      console.error('Error saving doctor profile:', error);
      setFormErrorMessage(error.message || 'Error al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditing, clearMessages]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load profile on component mount (only once)
  useEffect(() => {
    fetchProfile();
  }, []); // ✅ Only run on mount, not when fetchProfile changes

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    doctorProfile,
    isLoading,
    isEditing,
    dialogOpen,
    formData,
    fieldErrors,
    formErrorMessage,
    successMessage,
    isSubmitting,

    // Actions
    setFormData,
    setFormErrorMessage,
    handleEdit,
    handleCreate,
    handleCancel,
    handleSubmit,
    fetchProfile,
    clearMessages
  };
};

export default useDoctorProfile;
