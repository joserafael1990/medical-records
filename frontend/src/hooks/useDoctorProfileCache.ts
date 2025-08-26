import { useState, useCallback, useEffect, useRef } from 'react';
import { DoctorProfile, DoctorFormData, FieldErrors } from '../types';
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
  title: '',
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  email: '',
  phone: '',
  birth_date: '',
  professional_license: '',
  specialty: '',
  specialty_license: '',
  university: '',
  graduation_year: '',
  subspecialty: '',
  professional_email: '',
  office_phone: '',
  mobile_phone: '',
  office_address: '',
  office_city: '',
  office_state: '',
  office_postal_code: '',
  office_country: 'México'
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
    
    try {
      const data = await apiService.getDoctorProfile();
      
      // Update cache
      cache.data = data;
      cache.timestamp = now;
      
      setDoctorProfile(data);
    } catch (error: any) {
      // Handle 404 specifically (profile doesn't exist yet)
      if (error.response?.status === 404) {
        cache.data = null;
        cache.timestamp = now;
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
      // Map only the fields that exist in DoctorFormData
      setFormData({
        title: doctorProfile.title || '',
        first_name: doctorProfile.first_name || '',
        paternal_surname: doctorProfile.paternal_surname || '',
        maternal_surname: doctorProfile.maternal_surname || '',
        email: doctorProfile.email || '',
        phone: doctorProfile.phone || '',
        birth_date: doctorProfile.birth_date || '',
        professional_license: doctorProfile.professional_license || '',
        specialty: doctorProfile.specialty || '',
        specialty_license: doctorProfile.specialty_license || '',
        university: doctorProfile.university || '',
        graduation_year: doctorProfile.graduation_year || '',
        subspecialty: doctorProfile.subspecialty || '',
        professional_email: doctorProfile.professional_email || '',
        office_phone: doctorProfile.office_phone || '',
        mobile_phone: doctorProfile.mobile_phone || '',
        office_address: doctorProfile.office_address || '',
        office_city: doctorProfile.office_city || '',
        office_state: doctorProfile.office_state || '',
        office_postal_code: doctorProfile.office_postal_code || '',
        office_country: doctorProfile.office_country || 'México'
      });
      setIsEditing(true);
      setDialogOpen(true);
      clearMessages();
      
      // Store the section to navigate to (we'll add this functionality to the dialog)
      if (section) {
        // We'll need to pass this to the dialog component
        (window as any).doctorProfileActiveSection = section;
      }
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
    const transformedData: any = {
      ...data,
      birth_date: formatDateForBackend(data.birth_date),
      // Add required backend fields
      created_by: doctorProfile 
        ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name || ''} ${doctorProfile.paternal_surname || ''}`.trim()
        : "Usuario",
      // Include optional fields if they exist in the original profile
      digital_signature: doctorProfile?.digital_signature || '',
      professional_seal: doctorProfile?.professional_seal || ''
    };

    if (isEditing) {
      await apiService.updateDoctorProfile(transformedData);
    } else {
      await apiService.createDoctorProfile(transformedData);
    }

    // Invalidate cache after save
    cache.timestamp = 0;
    
    // Refresh the profile after saving
    return fetchProfile();
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
      console.error('Error saving doctor profile:', error);
      setFormErrorMessage(error.message || 'Error al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditing, clearMessages]);

  // Load profile on component mount (only once)
  useEffect(() => {
    if (!fetchCalledRef.current) {
      fetchCalledRef.current = true;
      fetchProfile();
    }
  }, []);

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
