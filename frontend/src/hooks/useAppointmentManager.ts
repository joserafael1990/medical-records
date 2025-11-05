import { useState, useCallback, useRef, useEffect } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { apiService } from '../services/api';
import { formatDateTimeForInput, getCurrentCDMXDateTime } from '../constants';
import { useAuth } from '../contexts/AuthContext';

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
        const appointmentsData = await apiService.getAppointments();
        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error('❌ Error loading appointments (doctorProfile effect):', error);
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
    patient_id: '',
    doctor_id: currentDoctorProfile?.id || '',
    date_time: '',
    appointment_type: 'consultation',
    reason: '',
    notes: '',
    status: 'confirmed',
    priority: 'normal',
    preparation_instructions: '',
    confirmation_required: false,
    estimated_cost: '',
    insurance_covered: false,
    room_number: '',
    equipment_needed: '',
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
        
        let data: any[] = [];
        let dateStr = '';

        if (agendaView === 'daily') {
          // Fix timezone issue - use local date string instead of ISO
          // Validate date is still valid before using
          if (isNaN(dateToFetch.getTime())) {
            dateToFetch = new Date();
          }
          const year = dateToFetch.getFullYear();
          const month = String(dateToFetch.getMonth() + 1).padStart(2, '0');
          const day = String(dateToFetch.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
          // console.log('📡 Calling getDailyAgenda for:', dateStr, 'selectedDate was:', selectedDate.toDateString());
          data = await apiService.getDailyAgenda(dateStr);
        } else if (agendaView === 'weekly') {
          const start = new Date(dateToFetch);
          const day = start.getDay();
          const diff = start.getDate() - day;
          start.setDate(diff);
          
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          
          // Fix timezone issue for weekly view
          const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
          const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
          data = await apiService.getWeeklyAgenda(startStr, endStr);
        } else if (agendaView === 'monthly') {
          const start = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth(), 1);
          const end = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth() + 1, 0);
          
          // Fix timezone issue for monthly view
          const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
          const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
          data = await apiService.getMonthlyAgenda(startStr, endStr);
        }

        // Only update if not aborted
        if (!abortController.signal.aborted) {
          // console.log('📋 Setting appointments:', { 
          //   count: data.length, 
          //   dateRequested: dateStr || 'N/A',
          //   data: data.map(apt => ({
          //     id: apt.id,
          //     patient_name: apt.patient_name,
          //     date_time: apt.date_time,
          //     appointment_date: apt.appointment_date,
          //     status: apt.status
          //   }))
          // });
          setAppointments(data);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error fetching appointments:', error);
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
  const handleNewAppointment = useCallback(() => {
    setIsEditingAppointment(false);
    const currentDateTime = getCurrentCDMXDateTime();
    setAppointmentFormData({
      patient_id: 0,
      doctor_id: 0,
      appointment_date: currentDateTime, // Current CDMX time
      appointment_type_id: 1, // Default to "Presencial"
      office_id: undefined,
      consultation_type: '', // No default value
      reason: '',
      notes: '',
      status: 'confirmed',
      priority: 'normal',
      preparation_instructions: '',
      confirmation_required: false,
      estimated_cost: '',
      insurance_covered: false,
      room_number: '',
      equipment_needed: '',
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
      const latest = await apiService.getAppointment(String(appointment.id));
      console.log('🟦 Editar cita - datos más recientes del backend:', {
        id: (latest as any)?.id,
        appointment_date: (latest as any)?.appointment_date,
        auto_reminder_enabled: (latest as any)?.auto_reminder_enabled,
        auto_reminder_offset_minutes: (latest as any)?.auto_reminder_offset_minutes
      });
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
        reason: (latest as any).reason,
        notes: (latest as any).notes || '',
        status: (latest as any).status,
        priority: (latest as any).priority || 'normal',
        preparation_instructions: (latest as any).preparation_instructions || '',
        confirmation_required: (latest as any).confirmation_required || false,
        estimated_cost: (latest as any).estimated_cost || '',
        insurance_covered: (latest as any).insurance_covered || false,
        room_number: (latest as any).room_number || '',
        equipment_needed: (latest as any).equipment_needed || '',
        cancelled_reason: (latest as any).cancelled_reason || '',
        auto_reminder_enabled: (latest as any).auto_reminder_enabled ?? false,
        auto_reminder_offset_minutes: (latest as any).auto_reminder_offset_minutes ?? 360
      } as any;
      console.log('🟦 FormData al abrir edición (calculado):', {
        id: formData.id,
        appointment_date: formData.appointment_date,
        auto_reminder_enabled: formData.auto_reminder_enabled,
        auto_reminder_offset_minutes: formData.auto_reminder_offset_minutes
      });
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
        reason: appointment.reason,
        notes: appointment.notes || '',
        status: appointment.status,
        priority: appointment.priority || 'normal',
        preparation_instructions: (appointment as any).preparation_instructions || '',
        confirmation_required: (appointment as any).confirmation_required || false,
        estimated_cost: (appointment as any).estimated_cost || '',
        insurance_covered: (appointment as any).insurance_covered || false,
        room_number: (appointment as any).room_number || '',
        equipment_needed: (appointment as any).equipment_needed || '',
        cancelled_reason: (appointment as any).cancelled_reason || '',
        auto_reminder_enabled: (appointment as any).auto_reminder_enabled ?? false,
        auto_reminder_offset_minutes: (appointment as any).auto_reminder_offset_minutes ?? 360
      } as any;
      console.log('🟨 Fallback FormData al abrir edición (sin backend):', {
        id: formData.id,
        appointment_date: formData.appointment_date,
        auto_reminder_enabled: formData.auto_reminder_enabled,
        auto_reminder_offset_minutes: formData.auto_reminder_offset_minutes
      });
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
      const mexicoTimeString = appointmentDate.toLocaleString("sv-SE", {timeZone: "America/Mexico_City"});
      const mexicoEndTimeString = endTime.toLocaleString("sv-SE", {timeZone: "America/Mexico_City"});
      
      // Create ISO strings with CDMX timezone offset
      // Format: YYYY-MM-DDTHH:mm:ss-06:00
      const cdmxDateISO = mexicoTimeString.replace(' ', 'T') + '-06:00';
      const cdmxEndDateISO = mexicoEndTimeString.replace(' ', 'T') + '-06:00';
      
      console.log('🔍 Frontend Debug - Appointment Creation:');
      console.log('📅 Original appointmentData.date_time:', appointmentData.date_time);
      console.log('📅 Parsed appointmentDate:', appointmentDate);
      console.log('📅 Mexico time string (sv-SE):', mexicoTimeString);
      console.log('📅 CDMX Date ISO string:', cdmxDateISO);
      
      const backendData = {
        patient_id: appointmentData.patient_id,
        doctor_id: user?.doctor?.id || doctorProfile?.id || 0,
        appointment_date: cdmxDateISO,
        end_time: cdmxEndDateISO,
        reason: appointmentData.reason,
        appointment_type: appointmentData.appointment_type, // Keep the original value without fallback
        status: appointmentData.status || 'confirmed',
        priority: appointmentData.priority || 'normal',
        preparation_instructions: appointmentData.preparation_instructions || '',
        notes: appointmentData.notes || ''
      };
      
      console.log('📤 Backend data being sent:', backendData);

      const response = await apiService.createAgendaAppointment(backendData);
      
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
          
          if (agendaView === 'daily') {
            const dateStr = validTargetDate.toISOString().split('T')[0];
            const refreshData = await apiService.getDailyAgenda(dateStr);
            setAppointments(refreshData || []);
          } else if (agendaView === 'weekly') {
            const start = new Date(validTargetDate);
            const day = start.getDay();
            const mondayOffset = day === 0 ? -6 : 1 - day;
            start.setDate(start.getDate() + mondayOffset);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const refreshData = await apiService.getWeeklyAgenda(
              start.toISOString().split('T')[0],
              end.toISOString().split('T')[0]
            );
            setAppointments(refreshData || []);
          } else if (agendaView === 'monthly') {
            const start = new Date(validTargetDate.getFullYear(), validTargetDate.getMonth(), 1);
            const end = new Date(validTargetDate.getFullYear(), validTargetDate.getMonth() + 1, 0);
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            const refreshData = await apiService.getMonthlyAgenda(startStr, endStr);
            setAppointments(refreshData || []);
          }
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
    // console.log('🔄 useAppointmentManager - handleAppointmentSubmit called');
    // console.log('🔄 useAppointmentManager - submittedFormData:', submittedFormData);
    
    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage('');

    // Use submitted form data if provided, otherwise use hook's state
    const formDataToUse = submittedFormData || appointmentFormData;
    // console.log('🔄 useAppointmentManager - formDataToUse:', formDataToUse);

    try {
      // Forzar modo edición si hay cita seleccionada, aunque el flag no esté seteado
      const isEditFlow = !!(selectedAppointment && selectedAppointment.id);
      if (isEditFlow) {
        // Update existing appointment - now using CDMX native
        // Parse appointment_date in new format
        const appointmentDate = new Date(formDataToUse.appointment_date);
        // Get doctor's appointment duration
        const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;
        const endTime = new Date(appointmentDate.getTime() + doctorDuration * 60000);

        // Enviar fecha/hora en ISO (UTC) para que backend compute correctamente
        const updateData = {
          patient_id: formDataToUse.patient_id,
          appointment_date: appointmentDate.toISOString(),
          end_time: endTime.toISOString(),
          appointment_type_id: formDataToUse.appointment_type_id || 1,
          office_id: formDataToUse.office_id || null,
          consultation_type: formDataToUse.consultation_type || '',
          status: formDataToUse.status || 'confirmed',
          priority: formDataToUse.priority || 'normal',
          reason: formDataToUse.reason || '',
          notes: formDataToUse.notes || '',
          preparation_instructions: formDataToUse.preparation_instructions || undefined,
          follow_up_required: formDataToUse.confirmation_required || false,
          room_number: formDataToUse.room_number || undefined,
          estimated_cost: formDataToUse.estimated_cost ? 
            parseFloat(formDataToUse.estimated_cost) : undefined,
          insurance_covered: formDataToUse.insurance_covered || false,
          // WhatsApp auto reminder fields (enviar siempre lo que el usuario ve)
          auto_reminder_enabled: !!formDataToUse.auto_reminder_enabled,
          auto_reminder_offset_minutes: (formDataToUse.auto_reminder_offset_minutes ?? 360)
        };
        
        console.log('🟧 Enviando actualización de cita:', {
          id: selectedAppointment.id,
          appointment_date_form_value: formDataToUse.appointment_date,
          appointment_date_iso: appointmentDate.toISOString(),
          auto_reminder_enabled: updateData.auto_reminder_enabled,
          auto_reminder_offset_minutes: updateData.auto_reminder_offset_minutes
        });
        const updatedAppointment = await apiService.updateAppointment(String(selectedAppointment.id), updateData);
        console.log('🟩 Respuesta backend actualización:', {
          id: (updatedAppointment as any)?.id,
          appointment_date: (updatedAppointment as any)?.appointment_date,
          auto_reminder_enabled: (updatedAppointment as any)?.auto_reminder_enabled,
          auto_reminder_offset_minutes: (updatedAppointment as any)?.auto_reminder_offset_minutes
        });

        // Mover la vista al día de la cita editada antes de refrescar
        try {
          const moveDate = new Date(formDataToUse.appointment_date);
          if (!isNaN(moveDate.getTime())) {
            setSelectedDate(moveDate);
          }
        } catch {}
        
        // Transform the updated appointment response to match frontend format
        const transformedAppointment = {
          ...selectedAppointment, // Start with original appointment data
          ...updatedAppointment,   // Override with updated data
          date_time: updatedAppointment.appointment_date || updatedAppointment.date_time,
          patient_name: updatedAppointment.patient ? 
            `${updatedAppointment.patient.first_name} ${updatedAppointment.patient.paternal_surname}` : 
            updatedAppointment.patient_name || selectedAppointment.patient_name
        };
        
        // console.log('🔧 Appointment transformation details:', {
        //   original: selectedAppointment,
        //   backendResponse: updatedAppointment,
        //   transformed: transformedAppointment,
        //   dateField: {
        //     original: selectedAppointment.date_time,
        //     backend: updatedAppointment.appointment_date || updatedAppointment.date_time,
        //     final: transformedAppointment.date_time
        //   },
        //   statusField: {
        //     original: selectedAppointment.status,
        //     backend: updatedAppointment.status,
        //     final: transformedAppointment.status,
        //     formData: appointmentFormData.status
        //   }
        // });
        
        // Update the appointment in the current list instead of refetching all
        // console.log('🔄 Updating local appointment in state:', {
        //   originalAppointment: selectedAppointment,
        //   transformedAppointment: transformedAppointment,
        //   appointmentId: selectedAppointment.id
        // });
        
            // Refresh appointments after successful update (stable approach)
            // console.log('🔄 Appointment updated successfully, refreshing data...');

            // Fetch fresh data without clearing state abruptly
            setTimeout(async () => {
              try {
                
                let refreshData: any[] = [];
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
                
                if (agendaView === 'daily') {
                  const y = dateToRefresh.getFullYear();
                  const m = String(dateToRefresh.getMonth() + 1).padStart(2, '0');
                  const d = String(dateToRefresh.getDate()).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  console.log('🔄 Refrescando agenda diaria para:', dateStr);
                  refreshData = await apiService.getDailyAgenda(dateStr);
                } else if (agendaView === 'weekly') {
                  const start = new Date(dateToRefresh);
                  const day = start.getDay();
                  const diff = start.getDate() - day;
                  start.setDate(diff);

                  const end = new Date(start);
                  end.setDate(start.getDate() + 6);

                  const startStr = start.toISOString().split('T')[0];
                  const endStr = end.toISOString().split('T')[0];
                  console.log('🔄 Refrescando agenda semanal:', { startStr, endStr });
                  refreshData = await apiService.getWeeklyAgenda(startStr, endStr);
                } else if (agendaView === 'monthly') {
                  const start = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth(), 1);
                  const end = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth() + 1, 0);
                  
                  const startStr = start.toISOString().split('T')[0];
                  const endStr = end.toISOString().split('T')[0];
                  console.log('🔄 Refrescando agenda mensual:', { startStr, endStr });
                  refreshData = await apiService.getMonthlyAgenda(startStr, endStr);
                }
                
                // Si la cita cambió de día, navegar a ese día
                try {
                  const newDateISO = (updatedAppointment as any).appointment_date || (updatedAppointment as any).date_time;
                  if (newDateISO) {
                    const newDate = new Date(newDateISO);
                    if (!isNaN(newDate.getTime())) {
                      const oldDay = new Date(selectedDate);
                      if (newDate.toDateString() !== oldDay.toDateString()) {
                        console.log('📅 Cambiando a nuevo día de la cita:', newDate.toDateString());
                        setSelectedDate(newDate);
                      }
                    }
                  }
                } catch {}

                // Reemplazar lista siempre para reflejar cambios
                console.log('📋 Citas refrescadas:', Array.isArray(refreshData) ? refreshData.length : 'N/A');
                setAppointments(refreshData || []);
              } catch (error) {
                console.error('❌ Error refreshing appointments:', error);
              }
            }, 300); // Slightly longer delay for stability
        
        showSuccessMessage('Cita actualizada exitosamente');
      } else {
        // Transform form data to backend format - using new format
        
        const appointmentDate = new Date(formDataToUse.appointment_date);
        
        if (isNaN(appointmentDate.getTime())) {
          console.error('🔄 useAppointmentManager - Failed to parse date:', { 
            original: formDataToUse.appointment_date,
            formData: formDataToUse 
          });
          throw new Error(`Invalid date format: ${formDataToUse.appointment_date}`);
        }
        
        // Get doctor's appointment duration
        const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;
        const endTime = new Date(appointmentDate.getTime() + doctorDuration * 60000);

        const appointmentData = {
          patient_id: formDataToUse.patient_id,
          doctor_id: user?.doctor?.id || doctorProfile?.id || 0, // Use current logged-in doctor
          appointment_date: appointmentDate.toISOString(),
          end_time: endTime.toISOString(),
          appointment_type_id: formDataToUse.appointment_type_id || 1, // Use appointment_type_id instead of appointment_type
          office_id: formDataToUse.office_id || null, // Include office_id
          consultation_type: formDataToUse.consultation_type || '',
          status: formDataToUse.status || 'confirmed',
          priority: formDataToUse.priority || 'normal',
          reason: formDataToUse.reason || '',
          notes: formDataToUse.notes || '',
          preparation_instructions: formDataToUse.preparation_instructions || undefined,
          follow_up_required: formDataToUse.confirmation_required || false,
          room_number: formDataToUse.room_number || undefined,
          estimated_cost: formDataToUse.estimated_cost ? 
            parseFloat(formDataToUse.estimated_cost) : undefined,
          insurance_covered: formDataToUse.insurance_covered || false
        };
        
        await apiService.createAgendaAppointment(appointmentData);
        showSuccessMessage('Cita creada exitosamente');
        
        // Navigate to appointments view after successful creation
        if (onNavigate) {
          setTimeout(() => {
            onNavigate('agenda');
          }, 1000); // Small delay to show success message
        }
      }
      
      setAppointmentDialogOpen(false);
      
      // Refresh appointments after creating new appointment
      if (!isEditFlow) {
        // console.log('🔄 New appointment created, refreshing data...');
        
        // If the appointment was created for a different date, navigate to that date FIRST
        // This ensures refreshAppointments uses the correct date
        if (appointmentFormData.date_time) {
          const appointmentDate = new Date(appointmentFormData.date_time);
          // Validate appointment date before using it
          if (!isNaN(appointmentDate.getTime())) {
            const currentDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();
            
            // Compare just the date parts (ignore time)
            if (appointmentDate.toDateString() !== currentDate.toDateString()) {
              // console.log('🔄 Appointment created for different date, navigating to:', appointmentDate.toDateString());
              setSelectedDate(appointmentDate);
              // Wait a bit for state to update before refreshing
              setTimeout(async () => {
                try {
                  await refreshAppointments();
                } catch (error) {
                  // Silent error handling
                }
              }, 100);
            } else {
              // Same date, refresh immediately
              try {
                await refreshAppointments();
              } catch (error) {
                // Silent error handling
              }
            }
          } else {
            // Invalid date, refresh with current (valid) date
            try {
              await refreshAppointments();
            } catch (error) {
              // Silent error handling
            }
          }
        } else {
          // No date in form data, refresh with current date
          try {
            await refreshAppointments();
          } catch (error) {
            // Silent error handling
          }
        }
        
        // Also refresh with a delay to ensure backend has processed the new appointment
        setTimeout(async () => {
          try {
            await refreshAppointments();
          } catch (error) {
            // Silent error handling
          }
        }, 1000); // Increased delay for better stability
      }
      
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      setFormErrorMessage('Error al guardar la cita');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingAppointment, appointmentFormData, showSuccessMessage, selectedDate, setSelectedDate, user, doctorProfile]);

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
      await apiService.cancelAppointment(appointmentId.toString());
      showSuccessMessage('Cita cancelada exitosamente');
      
      // Refresh appointments after cancellation
      setTimeout(async () => {
        try {
          let refreshData: any[] = [];
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
          
          if (agendaView === 'daily') {
            const dateStr = dateToRefresh.toISOString().split('T')[0];
            refreshData = await apiService.getDailyAgenda(dateStr);
          } else if (agendaView === 'weekly') {
            const start = new Date(dateToRefresh);
            const day = start.getDay();
            const diff = start.getDate() - day;
            start.setDate(diff);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            refreshData = await apiService.getWeeklyAgenda(startStr, endStr);
          } else if (agendaView === 'monthly') {
            const start = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth(), 1);
            const end = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth() + 1, 0);
            
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            refreshData = await apiService.getMonthlyAgenda(startStr, endStr);
          }
          
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
      
      // Double-check date is still valid before using
      if (isNaN(dateToRefresh.getTime())) {
        dateToRefresh = new Date();
      }
      
      let data: any[] = [];

      if (agendaView === 'daily') {
        // Fix timezone issue - use local date string instead of ISO
        const year = dateToRefresh.getFullYear();
        const month = String(dateToRefresh.getMonth() + 1).padStart(2, '0');
        const day = String(dateToRefresh.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        data = await apiService.getDailyAgenda(dateStr);
      } else if (agendaView === 'weekly') {
        const start = new Date(dateToRefresh);
        const day = start.getDay();
        const diff = start.getDate() - day;
        start.setDate(diff);
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        // Fix timezone issue for weekly view
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        data = await apiService.getWeeklyAgenda(startStr, endStr);
      } else if (agendaView === 'monthly') {
        const start = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth(), 1);
        const end = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth() + 1, 0);
        
        // Fix timezone issue for monthly view
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        data = await apiService.getMonthlyAgenda(startStr, endStr);
      }

      
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

  // This useEffect is removed to prevent duplication with the one above

  // Auto-refresh disabled to prevent infinite loops
  // TODO: Re-enable auto-refresh with proper dependency management

  // Refrescar al cerrar el diálogo para asegurar que la vista del día muestre la info actual
  useEffect(() => {
    if (!appointmentDialogOpen) {
      setTimeout(() => {
        refreshAppointments().catch(() => {});
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