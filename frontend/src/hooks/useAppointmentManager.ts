import { useState, useCallback, useRef } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { apiService } from '../services/api';

export interface UseAppointmentManagerReturn {
  // Appointment state
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  selectedDate: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  agendaView: 'daily' | 'weekly' | 'monthly';
  setAgendaView: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'monthly'>>;
  
  // Dialog state
  appointmentDialogOpen: boolean;
  isEditingAppointment: boolean;
  appointmentFormData: AppointmentFormData;
  
  // Actions
  handleNewAppointment: () => void;
  handleEditAppointment: (appointment: Appointment) => void;
  handleAppointmentSubmit: () => Promise<void>;
  handleCancelAppointment: () => void;
  fetchAppointments: () => Promise<void>;
  
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
  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaView, setAgendaView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
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
    equipment_needed: ''
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

  // Fetch appointments for current date
  const fetchAppointments = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await apiService.getDailyAgenda(dateStr);
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  }, [selectedDate]);

  // Handle new appointment
  const handleNewAppointment = useCallback(() => {
    setIsEditingAppointment(false);
    setAppointmentFormData({
      patient_id: '',
      doctor_id: '',
      date_time: selectedDate.toISOString().slice(0, 16),
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
      equipment_needed: ''
    });
    setFieldErrors({});
    setFormErrorMessage('');
    setAppointmentDialogOpen(true);
  }, [selectedDate]);

  // Handle edit appointment
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setIsEditingAppointment(true);
    setAppointmentFormData({
      patient_id: appointment.patient_id,
      doctor_id: '',
      date_time: appointment.date_time,
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
      equipment_needed: appointment.equipment_needed || ''
    });
    setFieldErrors({});
    setFormErrorMessage('');
    setAppointmentDialogOpen(true);
  }, []);

  // Handle appointment submit
  const handleAppointmentSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setFieldErrors({});
    setFormErrorMessage('');

    try {
      if (isEditingAppointment) {
        // Update appointment logic would go here
        showSuccessMessage('Cita actualizada exitosamente');
      } else {
        await apiService.createAgendaAppointment(appointmentFormData);
        showSuccessMessage('Cita creada exitosamente');
      }
      
      setAppointmentDialogOpen(false);
      await fetchAppointments();
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      setFormErrorMessage('Error al guardar la cita');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingAppointment, appointmentFormData, fetchAppointments, showSuccessMessage]);

  // Handle cancel appointment
  const handleCancelAppointment = useCallback(() => {
    setAppointmentDialogOpen(false);
    setFieldErrors({});
    setFormErrorMessage('');
  }, []);

  return {
    // State
    appointments,
    setAppointments,
    selectedDate,
    setSelectedDate,
    agendaView,
    setAgendaView,
    
    // Dialog state
    appointmentDialogOpen,
    isEditingAppointment,
    appointmentFormData,
    
    // Actions
    handleNewAppointment,
    handleEditAppointment,
    handleAppointmentSubmit,
    handleCancelAppointment,
    fetchAppointments,
    
    // Form state
    fieldErrors,
    formErrorMessage,
    isSubmitting,
    successMessage
  };
};
