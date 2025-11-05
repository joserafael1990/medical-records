import { useState, useCallback, useEffect } from 'react';
import { DoctorProfile, DoctorFormData, FieldErrors } from '../types';
import { API_CONFIG } from '../constants';
import { apiService } from '../services/api';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';

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
  handleSubmit: (documents?: { professional_documents?: any[], personal_documents?: any[] }) => Promise<void>;
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
  primary_phone: '',
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
  const { showSuccess } = useToast();
  
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
    
    if (!isEditMode || data.primary_phone?.trim()) {
      if (!data.primary_phone?.trim()) {
        errors.primary_phone = 'El teléfono es requerido';
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
          logger.error('Error fetching doctor profile', error, 'api');
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

    // Extract documents if they were added to formData
    // IMPORTANTE: Los documentos pueden venir en formData como parte del objeto
    let professional_documents = (data as any).professional_documents || [];
    let personal_documents = (data as any).personal_documents || [];
    
    // Si no están en data directamente, intentar leerlos del formData actual
    // Esto maneja el caso donde setFormData es asíncrono
    if (professional_documents.length === 0 && personal_documents.length === 0) {
      // Los documentos deberían estar ya en formData gracias al setTimeout en DoctorProfileDialog
      logger.debug('No documents in data, checking current formData state', undefined, 'ui');
    }
    
    logger.debug('Documents extracted', {
      professional: professional_documents.length,
      personal: personal_documents.length,
      professionalData: professional_documents,
      personalData: personal_documents
    });
    
    // Convert specialty name to specialty_id if needed
    let specialty_id = null;
    if (data.specialty) {
      // Try to find specialty ID from API
      try {
        const specialties = await apiService.getSpecialties();
        const specialty = specialties.find((s: any) => s.name === data.specialty);
        if (specialty) {
          specialty_id = specialty.id;
        }
      } catch (error) {
        logger.error('Error getting specialties', error, 'api');
      }
    }
    
    // Filter documents to only include those with document_id (value can be empty if only type changed)
    const filteredProfessionalDocs = professional_documents.filter((d: any) => d && d.document_id);
    const filteredPersonalDocs = personal_documents.filter((d: any) => d && d.document_id);
    
    // Transform string fields to arrays and format date for backend
    let transformedData: any = {
      ...data,
      birth_date: formatDateForBackend(data.birth_date),
      appointment_duration: data.appointment_duration ? parseInt(data.appointment_duration) : null,
      office_state_id: data.office_state_id ? parseInt(data.office_state_id) : null,
      specialty_id: specialty_id,
      specialty: undefined // Remove specialty name, use specialty_id instead
    };
    
    // Agregar documentos en formato correcto - SIEMPRE incluir si tienen datos, incluso en modo edición
    // IMPORTANTE: Incluir documentos incluso si están vacíos en modo edición para que el backend los procese
    if (filteredProfessionalDocs.length > 0) {
      transformedData.professional_documents = filteredProfessionalDocs;
    }
    if (filteredPersonalDocs.length > 0) {
      transformedData.personal_documents = filteredPersonalDocs;
    }

    // En modo edición, solo enviar campos que tienen contenido (edición parcial)
    if (method === 'PUT') {
      const fieldsToSend: any = {};
      
      // Solo incluir campos que tienen valor
      Object.keys(transformedData).forEach(key => {
        const value = transformedData[key];
        // Para arrays de documentos, SIEMPRE incluir si tienen elementos (incluso con valores vacíos)
        if (key === 'professional_documents' || key === 'personal_documents') {
          if (Array.isArray(value) && value.length > 0) {
            fieldsToSend[key] = value;
          }
        } else if (Array.isArray(value)) {
          // Para otros arrays, solo incluir si no están vacíos
          if (value.length > 0) {
            fieldsToSend[key] = value;
          }
        } else if (value !== null && value !== undefined && value !== '') {
          fieldsToSend[key] = value;
        }
      });
      
      transformedData = fieldsToSend;
    }
    
    // Debug: Log antes de enviar
    logger.debug('Sending to backend', {
      hasProfessionalDocs: !!transformedData.professional_documents,
      professionalDocsLength: transformedData.professional_documents?.length || 0,
      hasPersonalDocs: !!transformedData.personal_documents,
      personalDocsLength: transformedData.personal_documents?.length || 0,
      allKeys: Object.keys(transformedData)
    });

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
        primary_phone: doctorProfile.primary_phone || '',
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

  const handleSubmit = useCallback(async (documents?: { professional_documents?: any[], personal_documents?: any[] }) => {
    setIsSubmitting(true);
    clearMessages();

    try {
      // Combinar formData con documentos si se proporcionan
      const dataToSave: any = { ...formData };
      
      // Agregar documentos si se proporcionaron
      logger.debug('handleSubmit - Parameter received', {
        hasDocuments: !!documents,
        documentsType: typeof documents,
        documentsKeys: documents ? Object.keys(documents) : [],
        documentsValue: documents
      });
      
      if (documents && typeof documents === 'object' && !Array.isArray(documents)) {
        // Verificar que documents tenga la estructura esperada
        if ('professional_documents' in documents || 'personal_documents' in documents) {
          logger.debug('handleSubmit - Valid documents structure detected', {
            hasProfessional: 'professional_documents' in documents,
            hasPersonal: 'personal_documents' in documents,
            professional: documents.professional_documents,
            personal: documents.personal_documents
          });
          if (documents.professional_documents) {
            dataToSave.professional_documents = documents.professional_documents;
          }
          if (documents.personal_documents) {
            dataToSave.personal_documents = documents.personal_documents;
          }
        } else {
          logger.warn('handleSubmit - documents parameter does not have expected structure', documents, 'validation');
        }
      }
      
      logger.debug('dataToSave before validation', {
        hasProfessional: !!dataToSave.professional_documents,
        professionalCount: dataToSave.professional_documents?.length || 0,
        hasPersonal: !!dataToSave.personal_documents,
        personalCount: dataToSave.personal_documents?.length || 0
      });
      
      // Validate form (más flexible en modo edición)
      const { isValid, errors } = validateForm(dataToSave, isEditing);
      
      if (!isValid) {
        setFieldErrors(errors);
        setFormErrorMessage('Por favor corrige los errores en el formulario');
        return;
      }

      // Save profile - usar dataToSave que incluye documentos
      await saveProfile(dataToSave);

      // Success - Show toast notification instead of inline message
      showSuccess(
        isEditing 
          ? 'Perfil actualizado exitosamente' 
          : 'Perfil creado exitosamente',
        isEditing ? '¡Actualización completada!' : '¡Perfil creado!'
      );
      setDialogOpen(false);
      setFormData(initialFormData);

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
