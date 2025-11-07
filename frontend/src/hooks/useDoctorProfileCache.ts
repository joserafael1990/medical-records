import { useState, useCallback, useEffect, useRef } from 'react';
import { DoctorProfile, DoctorFormData, FieldErrors } from '../types';
import { apiService } from '../services';
import { useAuth } from '../contexts/AuthContext';
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
  handleSubmit: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearMessages: () => void;
}

const initialFormData: DoctorFormData = {
  title: '',
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  email: '',
  phone: '',
  birth_date: '',
  gender: '',
  curp: '',
  rfc: '',
  professional_license: '',
  specialty: '',
  specialty_license: '',
  university: '',
  graduation_year: '',
  subspecialty: '',
  professional_email: '',
  office_phone: '',
  office_address: '',
  office_city: '',
  office_state_id: '',
  office_postal_code: '',
  appointment_duration: ''
};

// Simple cache to prevent unnecessary requests
const cache = {
  data: null as DoctorProfile | null,
  timestamp: 0,
  isLoading: false,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

const formatDateForBackend = (inputDate: string): string => {
  if (!inputDate) return '';
  return inputDate.split('T')[0];
};

export const useDoctorProfileCache = (): UseDoctorProfileReturn => {
  // Removed initialization log to prevent console spam
  
  const { isAuthenticated } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(cache.data);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DoctorFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fetchCalledRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (cache.isLoading || isLoading) return;
    
    // Check cache first
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < cache.CACHE_DURATION) {
      setDoctorProfile(cache.data);
      return;
    }
    
    cache.isLoading = true;
    setIsLoading(true);
    setFormErrorMessage('');
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Token in localStorage', { present: !!localStorage.getItem('token') }, 'auth');
    }
    
    try {
      const data = await apiService.doctors.getDoctorProfile();
      
      // Doctor profile loaded successfully
      
      // Update cache
      cache.data = data;
      cache.timestamp = now;
      
      // Always update local state
      setDoctorProfile(data);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Profile state updated', { specialty: data.specialty_name }, 'api');
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error fetching doctor profile', error, 'api');
        logger.debug('Error details', { status: error.response?.status, data: error.response?.data }, 'api');
      }
      
      // Handle 404 specifically (profile doesn't exist yet)
      if (error.response?.status === 404) {
        cache.data = null;
        cache.timestamp = now;
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
      cache.isLoading = false;
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setFormErrorMessage('');
    setSuccessMessage('');
    setFieldErrors({});
  }, []);

  const handleEdit = useCallback((section?: string) => {
    
    if (doctorProfile) {
      // Map backend fields to form fields
      const mappedData = {
        title: doctorProfile.title || '',
        first_name: doctorProfile.first_name || '',
        paternal_surname: doctorProfile.paternal_surname || '',
        maternal_surname: doctorProfile.maternal_surname || '',
        email: doctorProfile.email || '',
        primary_phone: doctorProfile.primary_phone || '',
        birth_date: doctorProfile.birth_date || '',
        gender: (doctorProfile as any).gender || '',
        curp: doctorProfile.curp || '',
        rfc: doctorProfile.rfc || '',
        professional_license: doctorProfile.professional_license || '',
        specialty: doctorProfile.specialty_name || '',
        specialty_license: doctorProfile.specialty_license || '',
        university: doctorProfile.university || '',
        graduation_year: String(doctorProfile.graduation_year || ''),
        subspecialty: doctorProfile.subspecialty || '',
        professional_email: doctorProfile.professional_email || '',
        office_phone: doctorProfile.office_phone || '',
        office_address: doctorProfile.office_address || '',
        office_city: doctorProfile.office_city || '',
        office_state_id: String(doctorProfile.office_state_id || ''),
        office_postal_code: doctorProfile.office_postal_code || '',
        office_country: doctorProfile.office_country || 'México',
        appointment_duration: String(doctorProfile.appointment_duration || '')
      };
      
      setFormData(mappedData);
      setIsEditing(true);
      setDialogOpen(true);
      clearMessages();
      
      
      // Store the section to navigate to (we'll add this functionality to the dialog)
      if (section) {
        // We'll need to pass this to the dialog component
        (window as any).doctorProfileActiveSection = section;
      }
    } else {
    }
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

  const saveProfile = async (data: DoctorFormData): Promise<void> => {
    // Get specialty ID if specialty name was selected
    let specialtyId = null;
    if (data.specialty) {
      try {
        const specialties = await apiService.catalogs.getSpecialties();
        const foundSpecialty = specialties.find(spec => spec.name === data.specialty);
        specialtyId = foundSpecialty ? foundSpecialty.id : null;
      } catch (error) {
        logger.warn('Could not fetch specialties for ID conversion', error, 'api');
      }
    }
    
    // Transform frontend field names to backend field names
    const transformedData: any = {
      title: data.title,
      first_name: data.first_name,
      paternal_surname: data.paternal_surname,
      maternal_surname: data.maternal_surname,
      email: data.email,
      primary_phone: data.phone, // Frontend uses 'phone', backend expects 'primary_phone'
      birth_date: formatDateForBackend(data.birth_date),
      curp: data.curp,
      rfc: data.rfc,
      professional_license: data.professional_license,
      specialty_id: specialtyId, // Convert specialty name to ID
      specialty_license: data.specialty_license,
      university: data.university,
      graduation_year: data.graduation_year ? parseInt(data.graduation_year) : null,
      subspecialty: data.subspecialty,
      // Professional contact information
      professional_email: data.professional_email,
      office_phone: data.office_phone,
      // Office information
      office_address: data.office_address,
      office_postal_code: data.office_postal_code,
      // Office address with state ID
      office_city: data.office_city,
      office_state_id: data.office_state_id ? parseInt(data.office_state_id) : null,
      appointment_duration: data.appointment_duration ? parseInt(data.appointment_duration) : null,
      // Include optional fields if they exist in the original profile
      digital_signature: doctorProfile?.digital_signature || '',
      professional_seal: doctorProfile?.professional_seal || ''
    };

    // Clean data: only send fields with values
    const cleanedData: any = {};
    Object.keys(transformedData).forEach(key => {
      const value = transformedData[key];
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value;
      }
    });
    try {
      if (isEditing) {
        await apiService.doctors.updateDoctorProfile(cleanedData);
      } else {
        await apiService.doctors.createDoctorProfile(cleanedData);
      }

      // Invalidate cache after save
      cache.data = null;
      cache.timestamp = 0;
      
      // Refresh the profile after saving
      await fetchProfile();
      
      if (process.env.NODE_ENV === 'development') {
        // Profile updated and reloaded successfully
      }
    } catch (error: any) {
      logger.error('Error in saveProfile', error, 'api');
      
      // Handle specific error types with user-friendly messages
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('La solicitud tardó demasiado tiempo. Verifica tu conexión e intenta nuevamente.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
      } else if (error.response?.status === 401) {
        throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
      } else if (error.response?.status >= 500) {
        throw new Error('Error interno del servidor. Intenta más tarde.');
      } else {
        throw new Error(error.response?.data?.detail || error.message || 'Error al guardar el perfil');
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    clearMessages();

    try {
      // Basic validation would go here
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
      logger.error('Error saving doctor profile', error, 'api');
      setFormErrorMessage(error.message || 'Error al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditing, clearMessages]);

  // Load profile when authenticated
  useEffect(() => {
    logger.debug('useEffect - Load profile when authenticated', {
      isAuthenticated,
      fetchCalledRef: fetchCalledRef.current,
      doctorProfile: doctorProfile ? 'exists' : 'null'
    });
    
    if (isAuthenticated && (!fetchCalledRef.current || !doctorProfile)) {
      // Calling fetchProfile
      fetchCalledRef.current = true;
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile, doctorProfile]);

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

export default useDoctorProfileCache;
