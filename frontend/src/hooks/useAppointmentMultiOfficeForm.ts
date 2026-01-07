import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    name: string;
    birth_date: string;
    gender: string;
    phone_country_code: string;
    phone_number: string;
  };
  setNewPatientData: React.Dispatch<React.SetStateAction<{
    name: string;
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
const calculateAge = (birthDate?: string | Date | null): number | null => {
  if (!birthDate) {
    return null;
  }

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

// Function to format patient name with age
const formatPatientNameWithAge = (patient: Patient): string => {
  const baseName = (patient.name && patient.name.trim().length > 0)
    ? patient.name.trim()
    : '';

  const safeName = baseName || 'Paciente sin nombre';
  const age = calculateAge(patient.birth_date);

  return age !== null ? `${safeName} (${age} años)` : safeName;
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
    consultation_type: ''
  });

  // Estados para el flujo de selección de paciente
  const [isExistingPatient, setIsExistingPatient] = useState<boolean | null>(null);
  const [newPatientData, setNewPatientData] = useState({
    name: '',
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
  const [consultations, setConsultations] = useState<any[]>([]);

  // State for available time slots
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasLoadedDefaultTimesRef = useRef(false);
  const lastLoadedDateRef = useRef<string>(''); // Track last loaded date to force reload

  // Use external data if provided, otherwise use internal state
  const currentFormData = externalFormData || formData;

  // Notify parent of form data changes after state update (not during render)
  // This prevents "Cannot update a component while rendering a different component" error
  const onFormDataChangeRef = useRef(onFormDataChange);

  // Update ref when callback changes
  useEffect(() => {
    onFormDataChangeRef.current = onFormDataChange;
  }, [onFormDataChange]);

  // Notify parent of form data changes after state update
  useEffect(() => {
    if (onFormDataChangeRef.current) {
      onFormDataChangeRef.current(formData);
    }
  }, [formData]);
  
  // Load consultations to filter patients without previous consultations
  useEffect(() => {
    const loadConsultations = async () => {
      // Only load consultations when needed: "Primera vez" with existing patient
      if (open && 
          !isEditing && 
          currentFormData.consultation_type === 'Primera vez' && 
          isExistingPatient === true) {
        try {
          const consultationsData = await apiService.consultations.getConsultations();
          setConsultations(consultationsData || []);
        } catch (err) {
          logger.error('Error loading consultations for filtering', err, 'api');
          setConsultations([]);
        }
      }
    };
    loadConsultations();
  }, [open, isEditing, currentFormData.consultation_type, isExistingPatient]);
  
  // Filter patients: for "Primera vez" with existing patient, only show those without consultations
  const filteredPatients = useMemo(() => {
    const basePatients = externalPatients || patients;
    
    // If "Primera vez" with existing patient, filter to show only patients without consultations
    if (!isEditing && 
        currentFormData.consultation_type === 'Primera vez' && 
        isExistingPatient === true) {
      // Get patient IDs that have consultations with this doctor
      const patientIdsWithConsultations = new Set(
        consultations.map((c: any) => Number(c.patient_id))
      );
      
      // Filter to only patients WITHOUT consultations
      return basePatients.filter(patient => 
        !patientIdsWithConsultations.has(Number(patient.id))
      );
    }
    
    // Otherwise, return all patients
    return basePatients;
  }, [externalPatients, patients, consultations, isEditing, currentFormData.consultation_type, isExistingPatient]);
  
  const currentPatients = filteredPatients;
  const currentLoading = loading;
  const currentError = formErrorMessage || error;

  // Function to load available times for a specific date
  const loadAvailableTimes = useCallback(async (date: string) => {
    if (!date) {
      logger.debug('No date provided for loading available times', undefined, 'api');
      setAvailableTimes([]);
      return [];
    }

    // Normalize date to YYYY-MM-DD format
    const dateOnly = date.split('T')[0];

    try {
      setLoadingTimes(true);
      logger.debug('Loading available times for date', { date: dateOnly, originalDate: date }, 'api');

      const response = await apiService.appointments.getAvailableTimesForBooking(dateOnly);
      const times = response?.available_times || [];

      logger.debug('Available times loaded', { date: dateOnly, count: times.length, times: times.slice(0, 3) }, 'api');

      // Always update availableTimes, even if empty
      setAvailableTimes(times);

      // Update lastLoadedDateRef after successful load
      lastLoadedDateRef.current = dateOnly;

      return times;
    } catch (error) {
      logger.error('Error loading available times', error, 'api');
      setAvailableTimes([]);
      // Reset lastLoadedDateRef on error so it can be retried
      if (lastLoadedDateRef.current === date.split('T')[0]) {
        lastLoadedDateRef.current = '';
      }
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
          const appointmentTypesPromise = apiService.appointments.getAppointmentTypes();
          const officesPromise = apiService.offices.getOffices(doctorProfile?.id);

          if (!externalPatients) {
            const [appointmentTypesData, officesData, patientsData] = await Promise.all([
              appointmentTypesPromise,
              officesPromise,
              apiService.patients.getPatients()
            ]);

            console.log('🔄 Patients loaded:', {
              count: patientsData?.length || 0,
              first5: patientsData?.slice(0, 5).map(p => ({ id: p.id, name: p.name })) || []
            });

            setAppointmentTypes(appointmentTypesData || []);
            setOffices(officesData || []);
            setPatients(patientsData || []);
          } else {
            const [appointmentTypesData, officesData] = await Promise.all([
              appointmentTypesPromise,
              officesPromise
            ]);

            console.log('🔄 Using external patients:', {
              count: externalPatients?.length || 0,
              first5: externalPatients?.slice(0, 5).map(p => ({ id: p.id, name: p.name })) || []
            });

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
        console.log('📝 Initializing form for editing:', {
          patient_id: externalFormData.patient_id,
          patient_id_type: typeof externalFormData.patient_id,
          appointment_date: externalFormData.appointment_date,
          currentPatientsCount: patients.length
        });

        setFormData(externalFormData);
        // When editing, the patient is ALWAYS existing (we're editing an existing appointment)
        setIsExistingPatient(true);

        // Extract time from appointment_date for editing
        if (externalFormData.appointment_date) {
          const appointmentDate = new Date(externalFormData.appointment_date);
          // Use CDMX timezone to get correct time string
          const cdmxTimeString = appointmentDate.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
          const timeString = cdmxTimeString.split(' ')[1]?.slice(0, 5) || '00:00';
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
          consultation_type: ''
        };
        setFormData(defaultData);
        setIsExistingPatient(null);
        setSelectedTime('');
        // Don't clear availableTimes here - let the default date useEffect handle it
        // Mark initialization as complete so the default date useEffect can run
        isInitializingRef.current = false;
      }
      setError(null);
    } else if (!open) {
      // Reset initialization flag when dialog closes
      hasInitializedRef.current = false;
      isInitializingRef.current = false;
    }
  }, [open, isEditing, externalFormData, loadAvailableTimes]); // Keep dependencies but use ref to prevent re-execution

  // Load available times for default date when dialog opens
  // This runs after the form is initialized
  useEffect(() => {
    if (!open || isEditing || hasLoadedDefaultTimesRef.current || !hasInitializedRef.current) {
      if (!open) {
        // Reset when dialog closes
        hasLoadedDefaultTimesRef.current = false;
        lastLoadedDateRef.current = '';
      }
      return;
    }

    // Mark as loaded immediately to prevent re-execution
    hasLoadedDefaultTimesRef.current = true;

    const today = new Date();
    const mexicoTimeString = today.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
    const todayString = mexicoTimeString.split(' ')[0];

    logger.debug('Loading times for default date', { date: todayString, hasInitialized: hasInitializedRef.current }, 'ui');

    // Set selected date first
    setSelectedDate(todayString);

    // Reset lastLoadedDateRef to ensure fresh load
    lastLoadedDateRef.current = '';

    const mexicoDate = new Date(mexicoTimeString);

    // Use functional update to avoid stale closure issues
    setFormData((prevFormData) => {
      return {
        ...prevFormData,
        appointment_date: mexicoDate.toISOString()
      };
    });

    // Clear available times first to show loading state
    setAvailableTimes([]);

    // Load available times - use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      setTimeout(() => {
        logger.debug('Executing default date times load', { date: todayString }, 'ui');
        loadAvailableTimes(todayString).then((times) => {
          logger.debug('Default date times loaded successfully', { date: todayString, count: times?.length || 0 }, 'ui');
          isInitializingRef.current = false;
        }).catch((error) => {
          logger.error('Error loading default date times', error, 'api');
          isInitializingRef.current = false;
        });
      }, 100);
    });
  }, [open, isEditing, onFormDataChange, loadAvailableTimes]);

  // Handle consultation type changes
  // For "Seguimiento" -> always existing patient
  // For "Primera vez" -> allow user to choose (null = not yet selected)
  useEffect(() => {
    if (currentFormData.consultation_type === 'Seguimiento') {
      setIsExistingPatient(true);
    } else if (currentFormData.consultation_type === 'Primera vez') {
      // Don't auto-set to false - allow user to choose between new or existing patient
      // This enables rebooking first-time appointments for patients with cancelled appointments
      setIsExistingPatient(null);
    }
  }, [currentFormData.consultation_type]);

  // Clear new patient data when consultation type changes to "Seguimiento"
  useEffect(() => {
    if (currentFormData.consultation_type === 'Seguimiento') {
      setNewPatientData({
        name: '',
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
        name: '',
        birth_date: '',
        gender: '',
        phone_country_code: '+52',
        phone_number: ''
      });
    }
  }, [open]);

  // Handle date change and load available times
  const handleDateChange = useCallback((newDate: string) => {
    if (!newDate) {
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
      lastLoadedDateRef.current = '';
      return;
    }

    // Normalize date to YYYY-MM-DD format (remove time component if present)
    const dateOnly = newDate.includes('T') ? newDate.split('T')[0] : newDate;

    // Check if this is the same date that was last loaded
    const isSameAsLastLoaded = dateOnly === lastLoadedDateRef.current;

    logger.debug('Date change triggered', {
      newDate,
      dateOnly,
      currentSelectedDate: selectedDate,
      lastLoadedDate: lastLoadedDateRef.current,
      isSameAsLastLoaded,
      willReload: true // Always reload
    }, 'ui');

    // Always update selectedDate and clear selectedTime
    setSelectedDate(dateOnly);
    setSelectedTime('');

    // Always clear availableTimes first to force UI update
    // This ensures the loading state is visible even if it's the same date
    setAvailableTimes([]);

    // Always load available times for the selected date, even if it's the same date
    // This ensures times are refreshed when user returns to today after selecting another date
    // Update the last loaded date ref after starting the load
    lastLoadedDateRef.current = dateOnly;

    // Use requestAnimationFrame to ensure state updates are processed before API call
    requestAnimationFrame(() => {
      loadAvailableTimes(dateOnly).then((times) => {
        logger.debug('Times loaded successfully', { date: dateOnly, count: times?.length || 0 }, 'ui');
      }).catch((error) => {
        logger.error('Error loading available times in handleDateChange', error, 'api');
        // Reset last loaded date on error so it can be retried
        if (lastLoadedDateRef.current === dateOnly) {
          lastLoadedDateRef.current = '';
        }
      });
    });
  }, [loadAvailableTimes, selectedDate]);

  // Handle time selection
  const handleTimeChange = useCallback((time: string) => {
    setSelectedTime(time);

    if (selectedDate && time) {
      const newFormData = {
        ...currentFormData,
        appointment_date: `${selectedDate.split('T')[0]}T${time}:00`
      };
      setFormData(newFormData);
    }
  }, [selectedDate, currentFormData]);

  const handleChange = useCallback((field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.value;

    let newFormData = {
      ...currentFormData,
      [field]: value
    };

    // Si se selecciona "Primera vez", permitir elegir entre paciente nuevo o existente
    // Esto permite reagendar citas de primera vez para pacientes con citas canceladas
    if (field === 'consultation_type' && value === 'Primera vez') {
      setIsExistingPatient(null); // null = no seleccionado, permite elegir
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
  }, [currentFormData, offices]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // Validate date and time are selected
      if (!selectedDate || !selectedTime) {
        setError('Debe seleccionar fecha y hora de la cita');
        setLoading(false);
        return;
      }

      // Validar consultorio
      if (!currentFormData.office_id || currentFormData.office_id === 0) {
        setError('Seleccione un consultorio');
        setLoading(false);
        return;
      }

      // Validar datos del paciente
      let finalPatientId = currentFormData.patient_id;

      if (isExistingPatient === false) {
        // Validar datos del nuevo paciente
        if (!newPatientData.name.trim()) {
          setError('El nombre completo del paciente es requerido');
          return;
        }
        // Validar que el nombre tenga al menos dos palabras
        const nameParts = newPatientData.name.trim().split(/\s+/);
        if (nameParts.length < 2) {
          setError('Ingresa al menos nombre y apellido');
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
            name: newPatientData.name.trim(),
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
        // isExistingPatient es null - el usuario no ha seleccionado
        if (currentFormData.consultation_type === 'Seguimiento') {
          // Para consultas de seguimiento, asumir paciente existente
          if (!currentFormData.patient_id) {
            setError('Seleccione un paciente para la consulta de seguimiento');
            return;
          }
          finalPatientId = currentFormData.patient_id;
        } else if (currentFormData.consultation_type === 'Primera vez') {
          // Para primera vez, el usuario debe elegir si es paciente nuevo o existente
          setError('Seleccione si es un paciente nuevo o existente');
          return;
        } else {
          setError('Seleccione el tipo de consulta');
          return;
        }
      }

      // Asegurar que appointment_type_id esté definido y que reminders esté incluido
      // Check both currentFormData and formData for reminders
      // Priority: formData.reminders > currentFormData.reminders
      const remindersToInclude = (formData.reminders && formData.reminders.length > 0)
        ? formData.reminders
        : (currentFormData.reminders && currentFormData.reminders.length > 0)
          ? currentFormData.reminders
          : undefined;

      // Ensure appointment_date is properly constructed from selectedDate and selectedTime
      const dateOnly = selectedDate.split('T')[0]; // Get just the date part
      const appointmentDateTime = `${dateOnly}T${selectedTime}:00`;

      // Validate the constructed date
      const testDate = new Date(appointmentDateTime);
      if (isNaN(testDate.getTime())) {
        setError('Fecha y hora inválidas. Por favor, seleccione nuevamente.');
        setLoading(false);
        return;
      }

      // Build formDataToSubmit - remove reminders from currentFormData first to avoid undefined
      const { reminders: _, ...currentFormDataWithoutReminders } = currentFormData as any;
      const formDataToSubmit: any = {
        ...currentFormDataWithoutReminders,
        patient_id: finalPatientId,
        appointment_type_id: currentFormData.appointment_type_id || 1,
        appointment_date: appointmentDateTime // Ensure appointment_date is properly set
      };

      // Only add reminders property if there are actual reminders
      // This prevents undefined from being serialized to null
      if (remindersToInclude && remindersToInclude.length > 0) {
        formDataToSubmit.reminders = remindersToInclude;
      }
      // If no reminders, don't include the property at all (not even as undefined)

      // Log for debugging
      logger.debug('Submitting appointment', {
        reminders_count: remindersToInclude?.length || 0,
        reminders: remindersToInclude,
        currentFormData_reminders: currentFormData.reminders,
        formData_reminders: formData.reminders,
        formDataToSubmit_reminders: formDataToSubmit.reminders,
        formDataToSubmit_keys: Object.keys(formDataToSubmit),
        has_reminders_property: 'reminders' in formDataToSubmit
      }, 'ui');

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
    showError,
    selectedDate,
    selectedTime
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

