import { useState, useCallback, useEffect, useMemo } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export interface UseAppointmentManagerReturn {
  // State
  appointments: Appointment[];
  selectedDate: Date;
  agendaView: 'daily' | 'weekly' | 'monthly';
  selectedAppointment: Appointment | null;
  isLoading: boolean;
  
  // Dialog state
  appointmentDialogOpen: boolean;
  isEditingAppointment: boolean;
  appointmentFormData: AppointmentFormData;
  
  // Actions
  setSelectedDate: (date: Date) => void;
  setAgendaView: (view: 'daily' | 'weekly' | 'monthly') => void;
  handleNewAppointment: () => void;
  handleEditAppointment: (appointment: Appointment) => void;
  handleAppointmentSubmit: (formData: AppointmentFormData) => Promise<void>;
  handleCancelAppointment: (appointmentId: number) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  closeDialog: () => void;
  
  // Form state
  fieldErrors: { [key: string]: string };
  formErrorMessage: string;
  isSubmitting: boolean;
  successMessage: string;
}

const initialFormData: AppointmentFormData = {
  patient_id: 0,
  appointment_date: '',
  appointment_time: '',
  appointment_type: 'primera-vez',
  priority: 'normal',
  status: 'confirmed',
  preparation_instructions: '',
  additional_notes: '',
  duration_minutes: 30
};

export const useAppointmentManager = (): UseAppointmentManagerReturn => {
  // Basic state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date());
  const [agendaView, setAgendaViewState] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog state
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState<AppointmentFormData>(initialFormData);
  
  // Form state
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { user } = useAuth();
  
  // Memoized date string for API calls
  const dateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);
  
  // Load appointments
  const loadAppointments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      let data: Appointment[] = [];
      
      if (agendaView === 'daily') {
        const response = await apiService.getDailyAgenda(dateStr);
        data = response.appointments || [];
      } else if (agendaView === 'weekly') {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const startStr = startOfWeek.toISOString().split('T')[0];
        const endStr = endOfWeek.toISOString().split('T')[0];
        
        const response = await apiService.getWeeklyAgenda(startStr, endStr);
        data = response.appointments || [];
      }
      
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, agendaView, dateStr]);
  
  // Load appointments when dependencies change
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);
  
  // Actions
  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date);
  }, []);
  
  const setAgendaView = useCallback((view: 'daily' | 'weekly' | 'monthly') => {
    setAgendaViewState(view);
  }, []);
  
  const handleNewAppointment = useCallback(() => {
    setSelectedAppointment(null);
    setIsEditingAppointment(false);
    setAppointmentFormData(initialFormData);
    setFieldErrors({});
    setFormErrorMessage('');
    setSuccessMessage('');
    setAppointmentDialogOpen(true);
  }, []);
  
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsEditingAppointment(true);
    setAppointmentFormData({
      patient_id: appointment.patient_id,
      appointment_date: appointment.appointment_date.split('T')[0],
      appointment_time: appointment.appointment_time,
      appointment_type: appointment.appointment_type,
      priority: appointment.priority,
      status: appointment.status,
      preparation_instructions: appointment.preparation_instructions || '',
      additional_notes: appointment.additional_notes || '',
      duration_minutes: appointment.duration_minutes || 30
    });
    setFieldErrors({});
    setFormErrorMessage('');
    setSuccessMessage('');
    setAppointmentDialogOpen(true);
  }, []);
  
  const handleAppointmentSubmit = useCallback(async (formData: AppointmentFormData) => {
    if (!user?.id) return;
    
    try {
      setIsSubmitting(true);
      setFieldErrors({});
      setFormErrorMessage('');
      
      const appointmentData = {
        ...formData,
        doctor_id: user.id,
        appointment_date: `${formData.appointment_date}T${formData.appointment_time}:00`,
      };
      
      if (isEditingAppointment && selectedAppointment) {
        await apiService.updateAppointment(selectedAppointment.id, appointmentData);
        setSuccessMessage('Cita actualizada exitosamente');
      } else {
        await apiService.createAppointment(appointmentData);
        setSuccessMessage('Cita creada exitosamente');
      }
      
      await loadAppointments();
      
      setTimeout(() => {
        setAppointmentDialogOpen(false);
        setSuccessMessage('');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error submitting appointment:', error);
      setFormErrorMessage(error.response?.data?.detail || 'Error al procesar la cita');
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, isEditingAppointment, selectedAppointment, loadAppointments]);
  
  const handleCancelAppointment = useCallback(async (appointmentId: number) => {
    try {
      await apiService.cancelAppointment(appointmentId);
      await loadAppointments();
    } catch (error) {
      console.error('Error canceling appointment:', error);
    }
  }, [loadAppointments]);
  
  const refreshAppointments = useCallback(async () => {
    await loadAppointments();
  }, [loadAppointments]);
  
  const closeDialog = useCallback(() => {
    setAppointmentDialogOpen(false);
    setSelectedAppointment(null);
    setIsEditingAppointment(false);
    setAppointmentFormData(initialFormData);
    setFieldErrors({});
    setFormErrorMessage('');
    setSuccessMessage('');
  }, []);
  
  return {
    // State
    appointments,
    selectedDate,
    agendaView,
    selectedAppointment,
    isLoading,
    
    // Dialog state
    appointmentDialogOpen,
    isEditingAppointment,
    appointmentFormData,
    
    // Actions
    setSelectedDate,
    setAgendaView,
    handleNewAppointment,
    handleEditAppointment,
    handleAppointmentSubmit,
    handleCancelAppointment,
    refreshAppointments,
    closeDialog,
    
    // Form state
    fieldErrors,
    formErrorMessage,
    isSubmitting,
    successMessage,
  };
};
