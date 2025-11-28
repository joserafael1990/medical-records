import { useState, useCallback, useRef, useEffect } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { apiService } from '../services';
import { formatDateTimeForInput, getCurrentCDMXDateTime } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

// Helper to get date string for API calls (YYYY-MM-DD)
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to fetch appointments based on view
const fetchAppointmentsForView = async (
  view: 'daily' | 'weekly' | 'monthly',
  date: Date,
  api: typeof apiService.appointments
) => {
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  if (view === 'daily') {
    return await api.getDailyAgenda(getDateString(date));
  } else if (view === 'weekly') {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day; // Adjust to Sunday (or Monday if preferred, but keeping consistent with original)
    // Note: Original code seemed to assume Sunday start or handled it loosely. 
    // Let's stick to the logic: start.getDate() - day
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return await api.getWeeklyAgenda(getDateString(start), getDateString(end));
  } else {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return await api.getMonthlyAgenda(getDateString(start), getDateString(end));
  }
};

export interface UseAppointmentManagerReturn {
  // Appointment state
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  selectedDate: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  agendaView: 'daily' | 'weekly' | 'monthly';
  setAgendaView: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'monthly'>>;
  selectedAppointment: Appointment | null;
  setSelectedAppointment: React.Dispatch<React.SetStateAction<Appointment | null>>;
  isLoading: boolean;

  // Dialog state
  appointmentDialogOpen: boolean;
  setAppointmentDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingAppointment: boolean;
  setIsEditingAppointment: React.Dispatch<React.SetStateAction<boolean>>;
  appointmentFormData: AppointmentFormData;
  setAppointmentFormData: React.Dispatch<React.SetStateAction<AppointmentFormData>>;

  // Actions
  handleNewAppointment: () => void;
  handleEditAppointment: (appointment: Appointment) => void;
  handleAppointmentSubmit: (submittedFormData?: any) => Promise<void>;
  createAppointmentDirect: (appointmentData: any) => Promise<any>;
  handleCancelAppointment: () => void;
  cancelAppointment: (appointmentId: number) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  forceRefresh: () => void;

  // Form state
  fieldErrors: { [key: string]: string };
  formErrorMessage: string;
  isSubmitting: boolean;
  successMessage: string;

  // Doctor profile
  doctorProfile: any;
}

export const useAppointmentManager = (
  patients: any[],
  doctorProfile: any,
  onNavigate?: (view: string) => void
): UseAppointmentManagerReturn => {

  // Auth context
  const { user } = useAuth();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [agendaView, setAgendaView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Doctor profile for appointment duration
  const [currentDoctorProfile, setCurrentDoctorProfile] = useState<any>(doctorProfile);

  // Load appointments initially and when doctor profile changes
  useEffect(() => {
    setCurrentDoctorProfile(doctorProfile);
    // Update appointment form data when doctor profile changes
    if (doctorProfile) {
      setAppointmentFormData((prev: AppointmentFormData) => ({
        ...prev,
        doctor_id: doctorProfile.id || '',
      }));
    }

    // Load appointments regardless of doctor profile (they are global)
    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        const appointmentsData = await apiService.appointments.getAppointments();
        setAppointments(appointmentsData || []);
      } catch (error) {
        logger.error('Error loading appointments (doctorProfile effect)', error, 'api');
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [doctorProfile]);


  // This useEffect is removed to prevent duplication with the doctorProfile effect above

  // Dialog state
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState<AppointmentFormData>({
    patient_id: 0,
    doctor_id: currentDoctorProfile?.id || 0,
    appointment_date: '',
    appointment_type_id: 1,
    status: 'por_confirmar',
    preparation_instructions: '',
    confirmation_required: false,
    estimated_cost: undefined,
    insurance_covered: false,
    cancelled_reason: ''
  });

  // Form state
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show success message with auto-clear
  const showSuccessMessage = useCallback((message: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }

    setSuccessMessage(message);

    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
      successTimeoutRef.current = null;
    }, 5000);
  }, []);

  // Refresh appointments function - can be called from child components
  const refreshAppointments = useCallback(async () => {
    try {
      // Validate selectedDate - if invalid, use today's date
      let dateToRefresh: Date;
      if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
        dateToRefresh = new Date(selectedDate);
      } else {
        dateToRefresh = new Date();
      }

      const data = await fetchAppointmentsForView(agendaView, dateToRefresh, apiService.appointments);

      // Force state update to ensure UI refreshes
      setAppointments(data || []);

      // Additional state update to ensure the change is reflected
      setTimeout(() => {
        setAppointments(prev => {
          return data || [];
        });
      }, 100);
    } catch (error) {
      console.error('❌ Error refreshing appointments:', error);
      // No limpiar la vista si falla el refresco
    }
  }, [selectedDate, agendaView]);

  // NOTE: fetchAppointments function removed - logic now inline in useEffect to prevent stale closures

  // Auto-refresh appointments when view or date changes - only if authenticated
  useEffect(() => {
    if (!user?.doctor?.id) {
      return;
    }


    // Use a longer timeout to prevent rapid successive calls and add abort controller
    let abortController = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        // Don't show loading for quick refreshes to prevent flickering
        // Validate selectedDate - if invalid, use today's date
        let dateToFetch: Date;
        if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
          dateToFetch = new Date(selectedDate);
        } else {
          dateToFetch = new Date();
        }

        // Only update if not aborted
        if (!abortController.signal.aborted) {
          const data = await fetchAppointmentsForView(agendaView, dateToFetch, apiService.appointments);
          setAppointments(data || []);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          logger.error('Error fetching appointments', error, 'api');
          setAppointments([]);
        }
      }
    }, 300); // Increased timeout to reduce rapid calls

    // Cleanup timeout and abort controller on unmount or dependency change
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [agendaView, selectedDate, user?.doctor?.id]); // Only depend on doctor ID to prevent infinite loops

  // Handle new appointment
  const handleNewAppointment = useCallback(async () => {
    // Track appointment create button clicked in Amplitude
    const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
    AmplitudeService.track('appointment_create_button_clicked');
    setIsEditingAppointment(false);
    const currentDateTime = getCurrentCDMXDateTime();
    setAppointmentFormData({
      patient_id: 0,
      doctor_id: 0,
      appointment_date: currentDateTime, // Current CDMX time
      appointment_type_id: 1, // Default to "Presencial"
      office_id: undefined,
      consultation_type: '', // No default value
      status: 'por_confirmar',
      preparation_instructions: '',
      confirmation_required: false,
      estimated_cost: undefined,
      insurance_covered: false,
      cancelled_reason: ''
    });
    setFieldErrors({});
    setFormErrorMessage('');
    setAppointmentDialogOpen(true);
  }, [selectedDate]);

  // Handle edit appointment
  const handleEditAppointment = useCallback(async (appointment: Appointment) => {
    try {
      setIsEditingAppointment(true);
      // Always load fresh data from backend to avoid stale state
      const latest = await apiService.appointments.getAppointment(String(appointment.id));
      setSelectedAppointment(latest as unknown as Appointment);
      const formattedDateTime = formatDateTimeForInput((latest as any).appointment_date || (latest as any).date_time);
      const formData = {
        id: (latest as any).id,
        patient_id: (latest as any).patient_id,
        doctor_id: (latest as any).doctor_id,
        appointment_date: formattedDateTime,
        appointment_type_id: (latest as any).appointment_type_id || 1,
        // Map to legacy string used by dialogs
        appointment_type: ((latest as any).appointment_type_id || 1) === 1 ? 'primera vez' : 'seguimiento',
        office_id: (latest as any).office_id,
        consultation_type: (latest as any).consultation_type,
        status: (latest as any).status,
        preparation_instructions: (latest as any).preparation_instructions || '',
        confirmation_required: (latest as any).confirmation_required || false,
        estimated_cost: (latest as any).estimated_cost || '',
        insurance_covered: (latest as any).insurance_covered || false,
        room_number: (latest as any).room_number || '',
        equipment_needed: (latest as any).equipment_needed || '',
        cancelled_reason: (latest as any).cancelled_reason || '',
        auto_reminder_enabled: (latest as any).auto_reminder_enabled ?? false,
        auto_reminder_offset_minutes: (latest as any).auto_reminder_offset_minutes ?? 360,
        // Include reminders if they exist
        reminders: (latest as any).reminders && Array.isArray((latest as any).reminders)
          ? (latest as any).reminders.map((r: any) => ({
            reminder_number: r.reminder_number,
            offset_minutes: r.offset_minutes,
            enabled: r.enabled
          }))
          : undefined
      } as any;
      setAppointmentFormData(formData);
      setFieldErrors({});
      setFormErrorMessage('');
      setAppointmentDialogOpen(true);
    } catch (e) {
      console.error('❌ Error loading latest appointment data:', e);
      // Fallback to existing appointment object if request fails
      setSelectedAppointment(appointment);
      const formattedDateTime = formatDateTimeForInput(appointment.appointment_date || (appointment as any).date_time);
      const formData = {
        id: (appointment as any).id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_date: formattedDateTime,
        appointment_type_id: appointment.appointment_type_id || 1,
        appointment_type: (appointment.appointment_type_id || 1) === 1 ? 'primera vez' : 'seguimiento',
        office_id: appointment.office_id,
        consultation_type: (appointment as any).consultation_type,
        status: appointment.status,
        preparation_instructions: (appointment as any).preparation_instructions || '',
        confirmation_required: (appointment as any).confirmation_required || false,
        estimated_cost: (appointment as any).estimated_cost || '',
        insurance_covered: (appointment as any).insurance_covered || false,
        room_number: (appointment as any).room_number || '',
        equipment_needed: (appointment as any).equipment_needed || '',
        cancelled_reason: (appointment as any).cancelled_reason || '',
        auto_reminder_enabled: (appointment as any).auto_reminder_enabled ?? false,
        auto_reminder_offset_minutes: (appointment as any).auto_reminder_offset_minutes ?? 360,
        // Include reminders if they exist
        reminders: (appointment as any).reminders && Array.isArray((appointment as any).reminders)
          ? (appointment as any).reminders.map((r: any) => ({
            reminder_number: r.reminder_number,
            offset_minutes: r.offset_minutes,
            enabled: r.enabled
          }))
          : undefined
      } as any;
      setAppointmentFormData(formData);
      setAppointmentDialogOpen(true);
    }
  }, [apiService]);

  // Function to create appointment directly without using form state
  const createAppointmentDirect = useCallback(async (appointmentData: any) => {
    setIsLoading(true);

    try {
      // Transform the data to backend format
      const dateTimeStr = appointmentData.date_time.includes(':') && !appointmentData.date_time.includes(':00')
        ? `${appointmentData.date_time}:00`
        : appointmentData.date_time;
      const appointmentDate = new Date(dateTimeStr);

      if (isNaN(appointmentDate.getTime())) {
        throw new Error(`Invalid date format: ${appointmentData.date_time}`);
      }

      // Get doctor's appointment duration
      const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;
      const endTime = new Date(appointmentDate.getTime() + doctorDuration * 60000);

      // Convert to Mexico City timezone before sending to backend
      // Create a proper ISO string with timezone information
      const mexicoTimeString = appointmentDate.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
      const mexicoEndTimeString = endTime.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });

      // Create ISO strings with CDMX timezone offset
      // Format: YYYY-MM-DDTHH:mm:ss-06:00
      const cdmxDateISO = mexicoTimeString.replace(' ', 'T') + '-06:00';
      const cdmxEndDateISO = mexicoEndTimeString.replace(' ', 'T') + '-06:00';

      const backendData = {
        patient_id: appointmentData.patient_id,
        doctor_id: user?.doctor?.id || doctorProfile?.id || 0,
        appointment_date: cdmxDateISO,
        end_time: cdmxEndDateISO,
        appointment_type: appointmentData.appointment_type, // Keep the original value without fallback
        status: appointmentData.status || 'por_confirmar',
        preparation_instructions: appointmentData.preparation_instructions || '',
        // WhatsApp auto reminder fields (send what user sees)
        auto_reminder_enabled: !!appointmentData.auto_reminder_enabled,
        auto_reminder_offset_minutes: (appointmentData.auto_reminder_offset_minutes ?? 360)
      };

      const response = await apiService.appointments.createAgendaAppointment(backendData);

      // Track appointment creation in Amplitude
      const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
      AmplitudeService.track('appointment_created', {
        appointment_type: appointmentData.appointment_type || 'presencial',
        has_reminders: !!(appointmentData.reminders && appointmentData.reminders.length > 0),
        reminder_count: appointmentData.reminders?.length || 0,
        status: appointmentData.status || 'por_confirmar'
      });

      // Track reminders configuration if present
      if (appointmentData.reminders && appointmentData.reminders.length > 0) {
        const enabledReminders = appointmentData.reminders.filter((r: any) => r.enabled);
        if (enabledReminders.length > 0) {
          AmplitudeService.track('appointment_reminders_configured', {
            total_reminders: enabledReminders.length,
            reminder_numbers: enabledReminders.map((r: any) => r.reminder_number)
          });
        }
      }

      // If the appointment was created for a different date, navigate to that date first
      // Validate selectedDate before using
      const currentDate = (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) ? selectedDate : new Date();
      const targetDate = appointmentDate.toDateString() !== currentDate.toDateString() ? appointmentDate : currentDate;

      if (appointmentDate.toDateString() !== currentDate.toDateString()) {
        // console.log('🔄 Appointment created for different date, navigating to:', appointmentDate.toDateString());
        setSelectedDate(appointmentDate);
      }

      // Refresh appointments after successful creation using the correct date
      setTimeout(async () => {
        try {
          // Validate targetDate before using
          const validTargetDate = (targetDate instanceof Date && !isNaN(targetDate.getTime())) ? targetDate : new Date();

          const refreshData = await fetchAppointmentsForView(agendaView, validTargetDate, apiService.appointments);
          setAppointments(refreshData || []);
        } catch (error) {
          console.error('Error refreshing appointments:', error);
        }
      }, 300);

      return response;
    } catch (error: any) {
      console.error('Error creating appointment directly:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, doctorProfile, selectedDate, agendaView, setAppointments]);

  // Handle appointment submit
  const handleAppointmentSubmit = useCallback(async (submittedFormData?: any) => {
    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage('');

    // Use submitted form data if provided, otherwise use hook's state
    const formDataToUse = submittedFormData || appointmentFormData;

    try {
      // Forzar modo edición si hay cita seleccionada, aunque el flag no esté seteado
      const isEditFlow = !!(selectedAppointment && selectedAppointment.id);

      if (isEditFlow && selectedAppointment) {
        // Update existing appointment
        const appointmentDate = new Date(formDataToUse.appointment_date);
        const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;
        const endTime = new Date(appointmentDate.getTime() + doctorDuration * 60000);

        const updateData: any = {
          patient_id: formDataToUse.patient_id,
          appointment_date: appointmentDate.toISOString(),
          end_time: endTime.toISOString(),
          appointment_type_id: formDataToUse.appointment_type_id || 1,
          office_id: formDataToUse.office_id || null,
          consultation_type: formDataToUse.consultation_type || '',
          status: formDataToUse.status || 'por_confirmar',
          preparation_instructions: formDataToUse.preparation_instructions || undefined,
          follow_up_required: formDataToUse.confirmation_required || false,
          room_number: formDataToUse.room_number || undefined,
          estimated_cost: formDataToUse.estimated_cost ?
            parseFloat(formDataToUse.estimated_cost) : undefined,
          insurance_covered: formDataToUse.insurance_covered || false,
          // WhatsApp auto reminder fields (deprecated)
          auto_reminder_enabled: !!formDataToUse.auto_reminder_enabled,
          auto_reminder_offset_minutes: (formDataToUse.auto_reminder_offset_minutes ?? 360)
        };

        // Include reminders if present
        if (formDataToUse.reminders && Array.isArray(formDataToUse.reminders) && formDataToUse.reminders.length > 0) {
          updateData.reminders = formDataToUse.reminders;
        }

        const updatedAppointment = await apiService.appointments.updateAppointment(String(selectedAppointment.id), updateData);

        // Track appointment update in Amplitude
        const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
        AmplitudeService.track('appointment_updated', {
          appointment_id: selectedAppointment.id,
          has_reminders: !!(formDataToUse.reminders && formDataToUse.reminders.length > 0),
          reminder_count: formDataToUse.reminders?.length || 0,
          status: formDataToUse.status || 'por_confirmar'
        });

        // Move view to edited appointment date
        try {
          const moveDate = new Date(formDataToUse.appointment_date);
          if (!isNaN(moveDate.getTime())) {
            setSelectedDate(moveDate);
          }
        } catch { }

        // Refresh appointments after successful update
        setTimeout(async () => {
          try {
            let dateToRefresh: Date;
            if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
              dateToRefresh = new Date(selectedDate);
            } else {
              dateToRefresh = new Date();
            }

            const refreshData = await fetchAppointmentsForView(agendaView, dateToRefresh, apiService.appointments);

            // If the appointment changed day, navigate to that day
            try {
              const newDateISO = updatedAppointment.appointment_date;
              if (newDateISO) {
                const newDate = new Date(newDateISO);
                if (!isNaN(newDate.getTime())) {
                  const oldDay = new Date(selectedDate);
                  if (newDate.toDateString() !== oldDay.toDateString()) {
                    setSelectedDate(newDate);
                  }
                }
              }
            } catch { }

            setAppointments(refreshData || []);
          } catch (error) {
            console.error('❌ Error refreshing appointments:', error);
          }
        }, 300);

        showSuccessMessage('Cita actualizada exitosamente');
      } else {
        // Create new appointment
        const appointmentDate = new Date(formDataToUse.appointment_date);

        if (isNaN(appointmentDate.getTime())) {
          throw new Error(`Invalid date format: ${formDataToUse.appointment_date}`);
        }

        const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;
        const endTime = new Date(appointmentDate.getTime() + doctorDuration * 60000);

        const appointmentData: any = {
          patient_id: formDataToUse.patient_id,
          doctor_id: user?.doctor?.id || doctorProfile?.id || 0,
          appointment_date: appointmentDate.toISOString(),
          end_time: endTime.toISOString(),
          appointment_type_id: formDataToUse.appointment_type_id || 1,
          office_id: formDataToUse.office_id || null,
          consultation_type: formDataToUse.consultation_type || '',
          status: formDataToUse.status || 'por_confirmar',
          preparation_instructions: formDataToUse.preparation_instructions || undefined,
          follow_up_required: formDataToUse.confirmation_required || false,
          room_number: formDataToUse.room_number || undefined,
          estimated_cost: formDataToUse.estimated_cost ?
            parseFloat(formDataToUse.estimated_cost) : undefined,
          insurance_covered: formDataToUse.insurance_covered || false,
          auto_reminder_enabled: !!formDataToUse.auto_reminder_enabled,
          auto_reminder_offset_minutes: (formDataToUse.auto_reminder_offset_minutes ?? 360)
        };

        if (formDataToUse.reminders && Array.isArray(formDataToUse.reminders) && formDataToUse.reminders.length > 0) {
          appointmentData.reminders = formDataToUse.reminders;
        }

        await apiService.appointments.createAgendaAppointment(appointmentData);

        // Track appointment creation in Amplitude
        const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
        AmplitudeService.track('appointment_created', {
          appointment_type_id: appointmentData.appointment_type_id || 1,
          has_reminders: !!(appointmentData.reminders && appointmentData.reminders.length > 0),
          reminder_count: appointmentData.reminders?.length || 0,
          status: appointmentData.status || 'por_confirmar',
          has_office: !!appointmentData.office_id
        });

        // Track reminders configuration if present
        if (appointmentData.reminders && appointmentData.reminders.length > 0) {
          const enabledReminders = appointmentData.reminders.filter((r: any) => r.enabled);
          if (enabledReminders.length > 0) {
            AmplitudeService.track('appointment_reminders_configured', {
              total_reminders: enabledReminders.length,
              reminder_numbers: enabledReminders.map((r: any) => r.reminder_number)
            });
          }
        }

        showSuccessMessage('Cita creada exitosamente');

        if (onNavigate) {
          setTimeout(() => {
            onNavigate('agenda');
          }, 1000);
        }
      }

      setAppointmentDialogOpen(false);

      // Refresh appointments after creating new appointment
      if (!isEditFlow) {
        if (formDataToUse.appointment_date) {
          const appointmentDate = new Date(formDataToUse.appointment_date);
          if (!isNaN(appointmentDate.getTime())) {
            const currentDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

            if (appointmentDate.toDateString() !== currentDate.toDateString()) {
              setSelectedDate(appointmentDate);
              setTimeout(async () => {
                try {
                  await refreshAppointments();
                } catch (error) { }
              }, 100);
            } else {
              try {
                await refreshAppointments();
              } catch (error) { }
            }
          } else {
            try {
              await refreshAppointments();
            } catch (error) { }
          }
        } else {
          try {
            await refreshAppointments();
          } catch (error) { }
        }

        setTimeout(async () => {
          try {
            await refreshAppointments();
          } catch (error) { }
        }, 1000);
      }

    } catch (error: any) {
      console.error('Error saving appointment:', error);
      setFormErrorMessage('Error al guardar la cita');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAppointment, appointmentFormData, showSuccessMessage, selectedDate, setSelectedDate, user, doctorProfile, agendaView, refreshAppointments, onNavigate]);

  // Handle cancel appointment
  const handleCancelAppointment = useCallback(() => {
    setAppointmentDialogOpen(false);
    setIsEditingAppointment(false);
    setSelectedAppointment(null);
    setFieldErrors({});
    setFormErrorMessage('');
  }, []);

  // Cancel appointment
  const cancelAppointment = useCallback(async (appointmentId: number) => {
    try {
      await apiService.appointments.cancelAppointment(appointmentId.toString());

      // Track appointment cancellation in Amplitude
      const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
      AmplitudeService.track('appointment_cancelled', {
        appointment_id: appointmentId
      });
      showSuccessMessage('Cita cancelada exitosamente');

      // Refresh appointments after cancellation
      setTimeout(async () => {
        try {
          // Validate selectedDate - if invalid, use today's date
          let dateToRefresh: Date;
          if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
            dateToRefresh = new Date(selectedDate);
          } else {
            dateToRefresh = new Date();
          }

          // Double-check date is still valid before using
          if (isNaN(dateToRefresh.getTime())) {
            dateToRefresh = new Date();
          }

          const refreshData = await fetchAppointmentsForView(agendaView, dateToRefresh, apiService.appointments);
          setAppointments(refreshData);
        } catch (error) {
          console.error('❌ Error refreshing appointments:', error);
        }
      }, 300);

    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      setFormErrorMessage('Error al cancelar la cita');
    }
  }, [selectedDate, agendaView, showSuccessMessage, setAppointments]);



  // This useEffect is removed to prevent duplication with the one above



  // Refresh appointments on mount (polling-based approach for production)
  useEffect(() => {
    refreshAppointments().catch(() => { });
  }, [refreshAppointments]);

  // Refrescar al cerrar el diálogo para asegurar que la vista del día muestre la info actual
  useEffect(() => {
    if (!appointmentDialogOpen) {
      setTimeout(() => {
        refreshAppointments().catch(() => { });
      }, 200);
    }
  }, [appointmentDialogOpen, refreshAppointments]);

  return {
    // State
    appointments,
    setAppointments,
    selectedDate,
    setSelectedDate: setSelectedDate,
    agendaView,
    setAgendaView: setAgendaView,
    selectedAppointment,
    setSelectedAppointment,
    isLoading,

    // Dialog state
    appointmentDialogOpen,
    setAppointmentDialogOpen,
    isEditingAppointment,
    setIsEditingAppointment,
    appointmentFormData,
    setAppointmentFormData,
    doctorProfile: currentDoctorProfile,

    // Actions
    handleNewAppointment,
    handleEditAppointment,
    handleAppointmentSubmit,
    createAppointmentDirect,
    handleCancelAppointment,
    cancelAppointment,
    refreshAppointments,

    // Form state
    fieldErrors,
    formErrorMessage,
    isSubmitting,
    successMessage,

    // Additional utility function for forcing view refresh
    forceRefresh: () => {
      refreshAppointments();
    }
  };
};