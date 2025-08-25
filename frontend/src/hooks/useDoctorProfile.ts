import { useState, useCallback, useEffect } from 'react';
import { DoctorProfile, DoctorFormData, FieldErrors } from '../types';
import { API_CONFIG } from '../constants';

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
  title: '',
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  email: '',
  phone: '',
  birth_date: '',
  
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
  mobile_phone: '',
  
  // Dirección del Consultorio
  office_address: '',
  office_city: '',
  office_state: '',
  office_postal_code: '',
  office_country: 'México',
  
  // Información Adicional
  medical_school: '',
  internship_hospital: '',
  residency_hospital: '',
  
  // Certificaciones
  board_certifications: '',
  professional_memberships: ''
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

  const validateForm = (data: DoctorFormData): { isValid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {};

    // Información Personal (Requerida)
    if (!data.first_name?.trim()) {
      errors.first_name = 'El nombre es requerido';
    }
    if (!data.paternal_surname?.trim()) {
      errors.paternal_surname = 'El apellido paterno es requerido';
    }
    if (!data.maternal_surname?.trim()) {
      errors.maternal_surname = 'El apellido materno es requerido';
    }
    if (!data.email?.trim()) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Formato de correo inválido';
    }
    if (!data.phone?.trim()) {
      errors.phone = 'El teléfono es requerido';
    }
    if (!data.birth_date?.trim()) {
      errors.birth_date = 'La fecha de nacimiento es requerida';
    }

    // Información Profesional (Requerida)
    if (!data.professional_license?.trim()) {
      errors.professional_license = 'La cédula profesional es requerida';
    }
    if (!data.university?.trim()) {
      errors.university = 'La universidad es requerida';
    }
    if (!data.graduation_year?.trim()) {
      errors.graduation_year = 'El año de graduación es requerido';
    } else {
      const year = parseInt(data.graduation_year);
      const currentYear = new Date().getFullYear();
      if (year < 1950 || year > currentYear) {
        errors.graduation_year = `El año debe estar entre 1950 y ${currentYear}`;
      }
    }
    if (!data.specialty?.trim()) {
      errors.specialty = 'La especialidad es requerida';
    }
    if (!data.medical_school?.trim()) {
      errors.medical_school = 'La escuela de medicina es requerida';
    }

    // Información del Consultorio (Requerida)
    if (!data.office_address?.trim()) {
      errors.office_address = 'La dirección del consultorio es requerida';
    }
    if (!data.office_city?.trim()) {
      errors.office_city = 'La ciudad es requerida';
    }
    if (!data.office_state?.trim()) {
      errors.office_state = 'El estado es requerido';
    }

    // Validaciones adicionales
    if (data.professional_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.professional_email)) {
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
    setIsLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOR_PROFILE}`);
      if (response.ok) {
        const data = await response.json();
        setDoctorProfile(data);
      } else if (response.status === 404) {
        // Profile doesn't exist yet
        setDoctorProfile(null);
      } else {
        throw new Error('Error fetching profile');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      // For now, simulate no profile exists
      setDoctorProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProfile = async (data: DoctorFormData): Promise<void> => {
    const url = isEditing ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOR_PROFILE}/${doctorProfile?.id}` : `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCTOR_PROFILE}`;
    const method = isEditing ? 'PUT' : 'POST';

    // Transform string fields to arrays for backend
    const transformedData = {
      ...data,
      board_certifications: data.board_certifications 
        ? data.board_certifications.split(',').map(cert => cert.trim()).filter(cert => cert.length > 0)
        : [],
      professional_memberships: data.professional_memberships 
        ? data.professional_memberships.split(',').map(membership => membership.trim()).filter(membership => membership.length > 0)
        : []
    };

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error saving profile');
    }

    const savedProfile = await response.json();
    setDoctorProfile(savedProfile);
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
        phone: doctorProfile.phone || '',
        birth_date: doctorProfile.birth_date || '',
        professional_license: doctorProfile.professional_license || '',
        specialty_license: doctorProfile.specialty_license || '',
        university: doctorProfile.university || '',
        graduation_year: doctorProfile.graduation_year || '',
        specialty: doctorProfile.specialty || '',
        subspecialty: doctorProfile.subspecialty || '',
        professional_email: doctorProfile.professional_email || '',
        office_phone: doctorProfile.office_phone || '',
        mobile_phone: doctorProfile.mobile_phone || '',
        office_address: doctorProfile.office_address || '',
        office_city: doctorProfile.office_city || '',
        office_state: doctorProfile.office_state || '',
        office_postal_code: doctorProfile.office_postal_code || '',
        office_country: doctorProfile.office_country || 'México',
        medical_school: doctorProfile.medical_school || '',
        internship_hospital: doctorProfile.internship_hospital || '',
        residency_hospital: doctorProfile.residency_hospital || '',
        board_certifications: Array.isArray(doctorProfile.board_certifications) 
          ? doctorProfile.board_certifications.join(', ') 
          : doctorProfile.board_certifications || '',
        professional_memberships: Array.isArray(doctorProfile.professional_memberships) 
          ? doctorProfile.professional_memberships.join(', ') 
          : doctorProfile.professional_memberships || ''
      });
      setIsEditing(true);
    }
    setDialogOpen(true);
    clearMessages();
  }, [doctorProfile, clearMessages]);

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
      // Validate form
      const { isValid, errors } = validateForm(formData);
      
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

  // Load profile on component mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
