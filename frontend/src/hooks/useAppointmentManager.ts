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
  handleAppointmentSubmit: () => Promise<void>;
  createAppointmentDirect: (appointmentData: any) => Promise<any>;
  handleCancelAppointment: () => void;
  
  // Form state
  fieldErrors: { [key: string]: string };
  formErrorMessage: string;
  isSubmitting: boolean;
  successMessage: string;
}

export const useAppointmentManager = (
  patients: any[],
  doctorProfile: any
): UseAppointmentManagerReturn => {
  // Removed initialization log to prevent console spam
  
  // Auth context
  const { user } = useAuth();
  
  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaView, setAgendaView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog state
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState<AppointmentFormData>({
    patient_id: '',
    doctor_id: '',
    date_time: '',
    appointment_type: 'consultation',
    reason: '',
    notes: '',
    duration_minutes: 30,
    status: 'scheduled',
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
    
    // Removed debug logs to prevent console spam
    
    // Simple timeout to prevent rapid successive calls
    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        const dateToFetch = new Date(selectedDate);
        let data: any[] = [];

        if (agendaView === 'daily') {
          const dateStr = dateToFetch.toISOString().split('T')[0];
          data = await apiService.getDailyAgenda(dateStr);
        } else if (agendaView === 'weekly') {
          const start = new Date(dateToFetch);
          const day = start.getDay();
          const diff = start.getDate() - day;
          start.setDate(diff);
          
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          data = await apiService.getWeeklyAgenda(startStr, endStr);
        } else if (agendaView === 'monthly') {
          const start = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth(), 1);
          const end = new Date(dateToFetch.getFullYear(), dateToFetch.getMonth() + 1, 0);
          
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          data = await apiService.getMonthlyAgenda(startStr, endStr);
        }

        // API response received
        setAppointments(data);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    }, 100);
    
    // Cleanup timeout on unmount or dependency change
    return () => clearTimeout(timeoutId);
  }, [agendaView, selectedDate, user?.doctor?.id]); // Only depend on doctor ID to prevent infinite loops

  // Handle new appointment
  const handleNewAppointment = useCallback(() => {
    setIsEditingAppointment(false);
    const currentDateTime = getCurrentCDMXDateTime();
    setAppointmentFormData({
      patient_id: '',
      doctor_id: '',
      date_time: currentDateTime, // Current CDMX time
      appointment_type: 'consultation',
      reason: '',
      notes: '',
      duration_minutes: 30,
      status: 'scheduled',
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
    setIsEditingAppointment(true);
    setSelectedAppointment(appointment);
    setAppointmentFormData({
      patient_id: appointment.patient_id,
      doctor_id: '',
      date_time: formatDateTimeForInput(appointment.date_time), // Direct CDMX format
      appointment_type: appointment.appointment_type,
      reason: appointment.reason,
      notes: appointment.notes || '',
      duration_minutes: appointment.duration_minutes,
      status: appointment.status,
      priority: appointment.priority || 'normal',
      preparation_instructions: appointment.preparation_instructions || '',
      confirmation_required: appointment.confirmation_required || false,
      estimated_cost: appointment.estimated_cost || '',
      insurance_covered: appointment.insurance_covered || false,
      room_number: appointment.room_number || '',
      equipment_needed: appointment.equipment_needed || '',
      cancelled_reason: appointment.cancelled_reason || ''
    });
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
      
      const endTime = new Date(appointmentDate.getTime() + (appointmentData.duration_minutes || 30) * 60000);
      
      const backendData = {
        patient_id: appointmentData.patient_id,
        doctor_id: user?.doctor?.id || doctorProfile?.id || 0,
        appointment_date: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: appointmentData.duration_minutes || 30,
        reason: appointmentData.reason,
        appointment_type: appointmentData.appointment_type || 'consultation',
        status: appointmentData.status || 'scheduled',
        priority: appointmentData.priority || 'normal',
        preparation_instructions: appointmentData.preparation_instructions || '',
        notes: appointmentData.notes || ''
      };

      const response = await apiService.createAgendaAppointment(backendData);
      
      // If the appointment was created for a different date, navigate to that date first
      const currentDate = selectedDate;
      const targetDate = appointmentDate.toDateString() !== currentDate.toDateString() ? appointmentDate : selectedDate;
      
      if (appointmentDate.toDateString() !== currentDate.toDateString()) {
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
  const handleAppointmentSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage('');

    try {
      if (isEditingAppointment && selectedAppointment) {
        // Update existing appointment - now using CDMX native
        // Parse datetime-local input manually to avoid timezone issues
        const appointmentDate = new Date(appointmentFormData.date_time);
        const endTime = new Date(appointmentDate.getTime() + (appointmentFormData.duration_minutes || 30) * 60000);
        
        // Send CDMX datetime directly to backend
        const updateData = {
          appointment_date: appointmentDate.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: appointmentFormData.duration_minutes || 30,
          appointment_type: appointmentFormData.appointment_type || 'consultation',
          status: appointmentFormData.status || 'scheduled',
          priority: appointmentFormData.priority || 'normal',
          reason: appointmentFormData.reason || '',
          notes: appointmentFormData.notes || '',
          preparation_instructions: appointmentFormData.preparation_instructions || undefined,
          follow_up_required: appointmentFormData.confirmation_required || false,
          room_number: appointmentFormData.room_number || undefined,
          estimated_cost: appointmentFormData.estimated_cost ? 
            parseFloat(appointmentFormData.estimated_cost) : undefined,
          insurance_covered: appointmentFormData.insurance_covered || false
        };
        
        console.log('🔄 Updating appointment:', selectedAppointment.id, 'with CDMX native data');
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
        
        console.log('🔧 Appointment transformation details:', {
          original: selectedAppointment,
          backendResponse: updatedAppointment,
          transformed: transformedAppointment,
          dateField: {
            original: selectedAppointment.date_time,
            backend: updatedAppointment.appointment_date || updatedAppointment.date_time,
            final: transformedAppointment.date_time
          },
          statusField: {
            original: selectedAppointment.status,
            backend: updatedAppointment.status,
            final: transformedAppointment.status,
            formData: appointmentFormData.status
          }
        });
        
        // Update the appointment in the current list instead of refetching all
        console.log('🔄 Updating local appointment in state:', {
          originalAppointment: selectedAppointment,
          transformedAppointment: transformedAppointment,
          appointmentId: selectedAppointment.id
        });
        
            // Refresh appointments after successful update (stable approach)
            console.log('🔄 Appointment updated successfully, refreshing data...');

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
        // Transform form data to backend format - now using CDMX native
        console.log('🔄 useAppointmentManager - Current appointmentFormData:', appointmentFormData);
        console.log('🔄 useAppointmentManager - appointmentFormData.date_time:', appointmentFormData.date_time);
        console.log('🔄 useAppointmentManager - typeof date_time:', typeof appointmentFormData.date_time);
        
        const dateTimeStr = appointmentFormData.date_time.includes(':') && !appointmentFormData.date_time.includes(':00') 
          ? `${appointmentFormData.date_time}:00` 
          : appointmentFormData.date_time;
        console.log('🔄 useAppointmentManager - Final dateTimeStr:', dateTimeStr);
        
        const appointmentDate = new Date(dateTimeStr);
        
        if (isNaN(appointmentDate.getTime())) {
          console.error('🔄 useAppointmentManager - Failed to parse date:', { 
            original: appointmentFormData.date_time, 
            processed: dateTimeStr,
            formData: appointmentFormData 
          });
          throw new Error(`Invalid date format: ${appointmentFormData.date_time}`);
        }
        
        const endTime = new Date(appointmentDate.getTime() + (appointmentFormData.duration_minutes || 30) * 60000);
        
        const appointmentData = {
          patient_id: appointmentFormData.patient_id,
          doctor_id: user?.doctor?.id || doctorProfile?.id || 0, // Use current logged-in doctor
          appointment_date: appointmentDate.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: appointmentFormData.duration_minutes || 30,
          appointment_type: appointmentFormData.appointment_type || 'consultation',
          status: appointmentFormData.status || 'scheduled',
          priority: appointmentFormData.priority || 'normal',
          reason: appointmentFormData.reason || '',
          notes: appointmentFormData.notes || '',
          preparation_instructions: appointmentFormData.preparation_instructions || undefined,
          follow_up_required: appointmentFormData.confirmation_required || false,
          room_number: appointmentFormData.room_number || undefined,
          estimated_cost: appointmentFormData.estimated_cost ? 
            parseFloat(appointmentFormData.estimated_cost) : undefined,
          insurance_covered: appointmentFormData.insurance_covered || false
        };
        
        console.log('🔍 Creating appointment with CDMX native data');
        await apiService.createAgendaAppointment(appointmentData);
        showSuccessMessage('Cita creada exitosamente');
      }
      
      setAppointmentDialogOpen(false);
      
      // Refresh appointments after creating new appointment
      if (!isEditingAppointment) {
        console.log('🔄 New appointment created, refreshing data...');
        
        // Refresh appointments after successful creation
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
            } else {
              refreshData = await apiService.getAppointments();
            }
            setAppointments(refreshData);
          } catch (error) {
            console.error('❌ Error refreshing appointments:', error);
          }
        }, 300); // Delay for stability
        
        // If the appointment was created for a different date, navigate to that date
        const appointmentDate = new Date(appointmentFormData.date_time);
        const currentDate = selectedDate;
        
        // Compare just the date parts (ignore time)
        if (appointmentDate.toDateString() !== currentDate.toDateString()) {
          console.log('🔄 Appointment created for different date, navigating to:', appointmentDate.toDateString());
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

  // Removed duplicate useEffect - appointments are already fetched by the main useEffect above

  // Debug: log when appointments state changes
  // Track appointments state for debugging when needed

  return {
    // State
    appointments,
    setAppointments,
    selectedDate,
    setSelectedDate,
    agendaView,
    setAgendaView,
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
    
    // Actions
    handleNewAppointment,
    handleEditAppointment,
    handleAppointmentSubmit,
    createAppointmentDirect,
    handleCancelAppointment,
    
    // Form state
    fieldErrors,
    formErrorMessage,
    isSubmitting,
    successMessage
  };
};
