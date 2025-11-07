import { useState, useEffect, useCallback, useRef } from 'react';
import { AppointmentFormData, Office, AppointmentType, Patient } from '../types';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';
import { extractCountryCode } from '../utils/countryCodes';

export interface UseAppointmentMultiOfficeFormProps {
  open: boolean;
  formData?: AppointmentFormData;
  patients?: Patient[];
  isEditing: boolean;
  doctorProfile?: any;
  onFormDataChange?: (data: AppointmentFormData) => void;
  onSubmit: (appointment: AppointmentFormData) => void;
  onClose: () => void;
  formErrorMessage?: string | null;
  fieldErrors?: Record<string, string>;
}

export interface UseAppointmentMultiOfficeFormReturn {
  // Form state
  formData: AppointmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
  loading: boolean;
  error: string | null;
  
  // Patient selection state
  isExistingPatient: boolean | null;
  setIsExistingPatient: React.Dispatch<React.SetStateAction<boolean | null>>;
  newPatientData: {
    first_name: string;
    paternal_surname: string;
    maternal_surname: string;
    birth_date: string;
    gender: string;
    phone_country_code: string;
    phone_number: string;
  };
  setNewPatientData: React.Dispatch<React.SetStateAction<{
    first_name: string;
    paternal_surname: string;
    maternal_surname: string;
    birth_date: string;
    gender: string;
    phone_country_code: string;
    phone_number: string;
  }>>;
  
  // Catalog data
  appointmentTypes: AppointmentType[];
  offices: Office[];
  patients: Patient[];
  
  // Time management
  availableTimes: any[];
  setAvailableTimes: React.Dispatch<React.SetStateAction<any[]>>;
  loadingTimes: boolean;
  selectedDate: string;
  selectedTime: string;
  
  // Handlers
  handleChange: (field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => void;
  handleDateChange: (newDate: string) => void;
  handleTimeChange: (time: string) => void;
  handleSubmit: () => Promise<void>;
  
  // Computed
  currentFormData: AppointmentFormData;
  currentPatients: Patient[];
  currentLoading: boolean;
  currentError: string | null;
}

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

// Function to format patient name with age
const formatPatientNameWithAge = (patient: Patient): string => {
  const age = calculateAge(patient.birth_date || '');
  const fullName = [
    patient.first_name,
    patient.paternal_surname,
    patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
  ].filter(part => part && part.trim()).join(' ');
  return `${fullName} (${age} años)`;
};

export const useAppointmentMultiOfficeForm = (
  props: UseAppointmentMultiOfficeFormProps
): UseAppointmentMultiOfficeFormReturn => {
  const {
    open,
    formData: externalFormData,
    patients: externalPatients,
    isEditing,
    doctorProfile,
    onFormDataChange,
    onSubmit,
    onClose,
    formErrorMessage,
    fieldErrors
  } = props;

  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<AppointmentFormData>({
    patient_id: 0,
    doctor_id: 0,
    appointment_date: '',
    appointment_type_id: 1,
    office_id: 0,
    consultation_type: '',
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
    phone_country_code: '+52',
    phone_number: ''
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
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Use external data if provided, otherwise use internal state
  const currentFormData = externalFormData || formData;
  const currentPatients = externalPatients || patients;
  const currentLoading = loading;
  const currentError = formErrorMessage || error;

  // Function to load available times for a specific date
  const loadAvailableTimes = useCallback(async (date: string) => {
    if (!date) {
      logger.debug('No date provided for loading available times', undefined, 'api');
      return [];
    }
    
    try {
      setLoadingTimes(true);
      logger.debug('Loading available times for date', { date }, 'api');
      const response = await apiService.appointments.getAvailableTimesForBooking(date);
      logger.debug('Response from getAvailableTimesForBooking', { response, hasAvailableTimes: !!response?.available_times }, 'api');
      const times = response?.available_times || [];
      logger.debug(`Found ${times.length} available times`, { count: times.length, times: times.slice(0, 5) }, 'api');
      
      setAvailableTimes(times);
      
      return times;
    } catch (error) {
      logger.error('Error loading available times', error, 'api');
      setAvailableTimes([]);
      return [];
    } finally {
      setLoadingTimes(false);
    }
  }, []);

  // Load data when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        try {
          // Only load data if not provided externally
          if (!externalPatients) {
            const [appointmentTypesData, officesData, patientsData] = await Promise.all([
              apiService.catalogs.getAppointmentTypes?.() || Promise.resolve([]),
              apiService.offices.getOffices(doctorProfile?.id),
              apiService.patients.getPatients()
            ]);
            
            setAppointmentTypes(appointmentTypesData || []);
            setOffices(officesData || []);
            setPatients(patientsData || []);
          } else {
            // Load only appointment types and offices if patients are provided externally
            const [appointmentTypesData, officesData] = await Promise.all([
              apiService.catalogs.getAppointmentTypes?.() || Promise.resolve([]),
              apiService.offices.getOffices(doctorProfile?.id)
            ]);
            
            setAppointmentTypes(appointmentTypesData || []);
            setOffices(officesData || []);
          }
        } catch (err) {
          logger.error('Error loading data', err, 'api');
          setError('Error al cargar datos');
        }
      }
    };
    loadData();
  }, [open, externalPatients, doctorProfile?.id]);

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      isInitializingRef.current = true;
      
      if (isEditing && externalFormData) {
        setFormData(externalFormData);
        setIsExistingPatient(externalFormData.patient_id && externalFormData.patient_id > 0 ? true : null);
        
        // Extract time from appointment_date for editing
        if (externalFormData.appointment_date) {
          const appointmentDate = new Date(externalFormData.appointment_date);
          const timeString = appointmentDate.toTimeString().slice(0, 5);
          setSelectedTime(timeString);
          setSelectedDate(externalFormData.appointment_date);
          
          // Load available times for the appointment date
          const dateOnly = externalFormData.appointment_date.split('T')[0];
          loadAvailableTimes(dateOnly).then(() => {
            isInitializingRef.current = false;
          });
        } else {
          isInitializingRef.current = false;
        }
      } else if (!isEditing) {
        const defaultData = {
          patient_id: 0,
          doctor_id: 0,
          appointment_date: '',
          appointment_type_id: 1,
          office_id: 0,
          consultation_type: '',
          reason: '',
          notes: ''
        };
        setFormData(defaultData);
        setIsExistingPatient(null);
        setSelectedTime('');
        // Don't clear availableTimes here - let the default date useEffect handle it
      }
      setError(null);
    } else if (!open) {
      // Reset initialization flag when dialog closes
      hasInitializedRef.current = false;
      isInitializingRef.current = false;
    }
  }, [open, isEditing, externalFormData, loadAvailableTimes]); // Keep dependencies but use ref to prevent re-execution

  // Load available times for default date when dialog opens
  useEffect(() => {
    if (open && !isEditing) {
      const today = new Date();
      const mexicoTimeString = today.toLocaleString("sv-SE", {timeZone: "America/Mexico_City"});
      const todayString = mexicoTimeString.split(' ')[0];
      
      logger.debug('Loading times for default date', { date: todayString }, 'ui');
      
      setSelectedDate(todayString);
      
      const mexicoDate = new Date(mexicoTimeString);
      const newFormData = {
        ...currentFormData,
        appointment_date: mexicoDate.toISOString()
      };
      setFormData(newFormData);
      if (onFormDataChange) {
        onFormDataChange(newFormData);
      }
      
      // Load available times - use a small delay to ensure state is ready
      const timeoutId = setTimeout(() => {
        loadAvailableTimes(todayString).then(() => {
          isInitializingRef.current = false;
        });
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [open, isEditing]); // Removed loadAvailableTimes to prevent re-execution

  // Handle consultation type changes
  useEffect(() => {
    if (currentFormData.consultation_type === 'Seguimiento') {
      setIsExistingPatient(true);
    } else if (currentFormData.consultation_type === 'Primera vez') {
      setIsExistingPatient(false);
    }
  }, [currentFormData.consultation_type]);

  // Clear new patient data when consultation type changes to "Seguimiento"
  useEffect(() => {
    if (currentFormData.consultation_type === 'Seguimiento') {
      setNewPatientData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        birth_date: '',
        gender: '',
        phone_country_code: '+52',
        phone_number: ''
      });
    }
  }, [currentFormData.consultation_type]);

  // Clear new patient data when dialog closes
  useEffect(() => {
    if (!open) {
      setNewPatientData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        birth_date: '',
        gender: '',
        phone_country_code: '+52',
        phone_number: ''
      });
    }
  }, [open]);

  // Handle date change and load available times
  const handleDateChange = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    setSelectedTime('');
    
    if (newDate) {
      const dateOnly = newDate.split('T')[0];
      loadAvailableTimes(dateOnly);
    } else {
      setAvailableTimes([]);
    }
  }, [loadAvailableTimes]);

  // Handle time selection
  const handleTimeChange = useCallback((time: string) => {
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
  }, [selectedDate, currentFormData, onFormDataChange]);

  const handleChange = useCallback((field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;
    
    let newFormData = {
      ...currentFormData,
      [field]: value
    };
    
    // Si se selecciona "Primera vez", automáticamente establecer como paciente nuevo
    if (field === 'consultation_type' && value === 'Primera vez') {
      setIsExistingPatient(false);
    }
    
    // Si se selecciona un consultorio, determinar automáticamente el tipo de cita
    if (field === 'office_id' && value && value !== 0) {
      const selectedOffice = offices.find(office => office.id === parseInt(value));
      if (selectedOffice) {
        const appointmentTypeId = selectedOffice.is_virtual ? 2 : 1;
        newFormData = {
          ...newFormData,
          appointment_type_id: appointmentTypeId
        };
      }
    }
    
    setFormData(newFormData);
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }
  }, [currentFormData, offices, onFormDataChange]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Validar consultorio
      if (!currentFormData.office_id || currentFormData.office_id === 0) {
        setError('Seleccione un consultorio');
        return;
      }

      // Validar motivo
      if (!currentFormData.reason || currentFormData.reason.trim() === '') {
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
        if (!newPatientData.phone_number.trim()) {
          setError('El número telefónico del paciente es requerido');
          return;
        }
        
        // Crear nuevo paciente
        try {
          const fullPhoneNumber = `${newPatientData.phone_country_code}${newPatientData.phone_number.trim()}`;
          
          const patientData: any = {
            first_name: newPatientData.first_name,
            paternal_surname: newPatientData.paternal_surname,
            ...(newPatientData.maternal_surname && { maternal_surname: newPatientData.maternal_surname }),
            primary_phone: fullPhoneNumber,
            person_type: 'patient'
          };
          if (newPatientData.birth_date) {
            patientData.birth_date = newPatientData.birth_date;
          }
          if (newPatientData.gender) {
            patientData.gender = newPatientData.gender;
          }
          
          const newPatient = await apiService.patients.createPatient(patientData);
          finalPatientId = (newPatient as any).data?.id || (newPatient as any).id;
          
          showSuccess('Paciente creado exitosamente');
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
        appointment_type_id: currentFormData.appointment_type_id || 1
      };
      
      onSubmit(formDataToSubmit);
      showSuccess('Cita creada exitosamente');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar cita';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    currentFormData,
    isExistingPatient,
    newPatientData,
    offices,
    onSubmit,
    onClose,
    showSuccess,
    showError
  ]);

  return {
    // Form state
    formData,
    setFormData,
    loading,
    error,
    
    // Patient selection state
    isExistingPatient,
    setIsExistingPatient,
    newPatientData,
    setNewPatientData,
    
    // Catalog data
    appointmentTypes,
    offices,
    patients,
    
    // Time management
    availableTimes,
    setAvailableTimes,
    loadingTimes,
    selectedDate,
    selectedTime,
    
    // Handlers
    handleChange,
    handleDateChange,
    handleTimeChange,
    handleSubmit,
    
    // Computed
    currentFormData,
    currentPatients,
    currentLoading,
    currentError
  };
};

// Export helper functions
export { formatPatientNameWithAge, calculateAge };

