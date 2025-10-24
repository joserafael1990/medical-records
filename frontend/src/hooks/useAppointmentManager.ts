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
    console.log('🔄 useAppointmentManager useEffect - doctorProfile:', doctorProfile);
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
        console.log('🔄 Loading appointments (doctorProfile effect)...');
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

  // Load appointments on component mount (independent of doctorProfile)
  useEffect(() => {
    console.log('🚀 useAppointmentManager mounted - loading appointments immediately');
    const loadAppointmentsOnMount = async () => {
      try {
        console.log('🔄 Loading appointments on mount...');
        console.log('🔄 API Service available:', !!apiService);
        console.log('🔄 User context:', user);
        const appointmentsData = await apiService.getAppointments();
        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error('❌ Error loading appointments on mount:', error);
        console.error('❌ Error details:', error);
      }
    };
    
    // Load immediately on mount
    loadAppointmentsOnMount();
  }, []); // Empty dependency array = run on mount
  
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
        const dateToFetch = new Date(selectedDate);
        let data: any[] = [];
        let dateStr = '';

        if (agendaView === 'daily') {
          // Fix timezone issue - use local date string instead of ISO
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
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    console.log('🔍 handleEditAppointment - appointment:', appointment);
    setIsEditingAppointment(true);
    setSelectedAppointment(appointment);
    console.log('🔍 Original appointment.appointment_date:', appointment.appointment_date);
    const formattedDateTime = formatDateTimeForInput(appointment.appointment_date || appointment.date_time);
    console.log('🔍 Formatted appointment_date:', formattedDateTime);
    
    const formData = {
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_date: formattedDateTime, // Direct CDMX format
      appointment_type_id: appointment.appointment_type_id || 1, // Default to "Presencial" if not set
      office_id: appointment.office_id,
      consultation_type: appointment.consultation_type || '', // No default value
      reason: appointment.reason,
      notes: appointment.notes || '',
      status: appointment.status,
      priority: appointment.priority || 'normal',
      preparation_instructions: appointment.preparation_instructions || '',
      confirmation_required: appointment.confirmation_required || false,
      estimated_cost: appointment.estimated_cost || '',
      insurance_covered: appointment.insurance_covered || false,
      room_number: appointment.room_number || '',
      equipment_needed: appointment.equipment_needed || '',
      cancelled_reason: appointment.cancelled_reason || ''
    };
    console.log('🔍 handleEditAppointment - formData:', formData);
    setAppointmentFormData(formData);
    setFieldErrors({});
    setFormErrorMessage('');
    setAppointmentDialogOpen(true);
  }, []);

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

      const backendData = {
        patient_id: appointmentData.patient_id,
        doctor_id: user?.doctor?.id || doctorProfile?.id || 0,
        appointment_date: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        reason: appointmentData.reason,
        appointment_type: appointmentData.appointment_type, // Keep the original value without fallback
        status: appointmentData.status || 'confirmed',
        priority: appointmentData.priority || 'normal',
        preparation_instructions: appointmentData.preparation_instructions || '',
        notes: appointmentData.notes || ''
      };

      const response = await apiService.createAgendaAppointment(backendData);
      
      // If the appointment was created for a different date, navigate to that date first
      const currentDate = selectedDate;
      const targetDate = appointmentDate.toDateString() !== currentDate.toDateString() ? appointmentDate : selectedDate;
      
      if (appointmentDate.toDateString() !== currentDate.toDateString()) {
        // console.log('🔄 Appointment created for different date, navigating to:', appointmentDate.toDateString());
        setSelectedDate(appointmentDate);
      }
      
      // Refresh appointments after successful creation using the correct date
      setTimeout(async () => {
        try {
          if (agendaView === 'daily') {
            const dateStr = targetDate.toISOString().split('T')[0];
            const refreshData = await apiService.getDailyAgenda(dateStr);
            setAppointments(refreshData || []);
          } else if (agendaView === 'weekly') {
            const start = new Date(targetDate);
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
            const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
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
      if (isEditingAppointment && selectedAppointment) {
        // Update existing appointment - now using CDMX native
        // Parse appointment_date in new format
        const appointmentDate = new Date(formDataToUse.appointment_date);
        // Get doctor's appointment duration
        const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;
        const endTime = new Date(appointmentDate.getTime() + doctorDuration * 60000);

        // Send data in new format to backend
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
          insurance_covered: formDataToUse.insurance_covered || false
        };
        
        console.log('🔄 Updating appointment:', selectedAppointment.id, 'with data:', updateData);
        console.log('🔄 Form data being used:', formDataToUse);
        const updatedAppointment = await apiService.updateAppointment(selectedAppointment.id, updateData);
        
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
                const dateToRefresh = new Date(selectedDate);
                
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
            }, 300); // Slightly longer delay for stability
        
        showSuccessMessage('Cita actualizada exitosamente');
      } else {
        // Transform form data to backend format - using new format
        console.log('🔄 useAppointmentManager - Current formDataToUse:', formDataToUse);
        console.log('🔄 useAppointmentManager - formDataToUse.appointment_date:', formDataToUse.appointment_date);
        
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
      if (!isEditingAppointment) {
        // console.log('🔄 New appointment created, refreshing data...');
        
        // Refresh appointments after successful creation
        setTimeout(async () => {
          try {
            console.log('🔄 Starting appointment refresh after creation...');
            console.log('🔄 Current agendaView:', agendaView);
            console.log('🔄 Current selectedDate:', selectedDate.toDateString());
            
            let refreshData: any[] = [];
            const dateToRefresh = new Date(selectedDate);
            
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
            } else {
              refreshData = await apiService.getAppointments();
            }
            console.log('📋 Sample refreshed appointment:', refreshData?.[0]);
            console.log('📋 Total refreshed appointments:', refreshData?.length);
            setAppointments(refreshData);
            console.log('📋 setAppointments called with:', refreshData?.length, 'appointments');
          } catch (error) {
            console.error('❌ Error refreshing appointments:', error);
          }
        }, 300); // Delay for stability
        
        // If the appointment was created for a different date, navigate to that date
        const appointmentDate = new Date(appointmentFormData.date_time);
        const currentDate = selectedDate;
        
        // Compare just the date parts (ignore time)
        if (appointmentDate.toDateString() !== currentDate.toDateString()) {
          // console.log('🔄 Appointment created for different date, navigating to:', appointmentDate.toDateString());
          setSelectedDate(appointmentDate);
        }
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
    console.log('🔄 cancelAppointment called with ID:', appointmentId);
    try {
      console.log('🔄 Calling apiService.cancelAppointment...');
      await apiService.cancelAppointment(appointmentId.toString());
      showSuccessMessage('Cita cancelada exitosamente');
      
      // Refresh appointments after cancellation
      setTimeout(async () => {
        try {
          let refreshData: any[] = [];
          const dateToRefresh = new Date(selectedDate);
          
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
    console.log('🔄 refreshAppointments called');
    console.log('🔄 user?.doctor?.id:', user?.doctor?.id);
    console.log('🔄 agendaView:', agendaView);
    console.log('🔄 selectedDate:', selectedDate);

    try {
      const dateToRefresh = new Date(selectedDate);
      let data: any[] = [];

      if (agendaView === 'daily') {
        // Fix timezone issue - use local date string instead of ISO
        const year = dateToRefresh.getFullYear();
        const month = String(dateToRefresh.getMonth() + 1).padStart(2, '0');
        const day = String(dateToRefresh.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        console.log('🔄 Loading daily agenda for date:', dateStr);
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
        console.log('🔄 Loading weekly agenda from:', startStr, 'to:', endStr);
        data = await apiService.getWeeklyAgenda(startStr, endStr);
      } else if (agendaView === 'monthly') {
        const start = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth(), 1);
        const end = new Date(dateToRefresh.getFullYear(), dateToRefresh.getMonth() + 1, 0);
        
        // Fix timezone issue for monthly view
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        console.log('🔄 Loading monthly agenda from:', startStr, 'to:', endStr);
        data = await apiService.getMonthlyAgenda(startStr, endStr);
      }

      console.log('🔄 Appointments loaded:', data?.length || 0, 'appointments');
      console.log('🔄 Sample appointment:', data?.[0]);
      setAppointments(data || []);
    } catch (error) {
      console.error('❌ Error refreshing appointments:', error);
      setAppointments([]);
    }
  }, [selectedDate, agendaView]);

  // Load appointments when component mounts or when agenda view changes
  useEffect(() => {
    console.log('🔄 useAppointmentManager - useEffect for agenda view change');
    refreshAppointments();
  }, [refreshAppointments]);

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
    successMessage
  };
};