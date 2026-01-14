import { useState, useCallback, useEffect } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAppointmentFormData } from './useAppointmentFormData';
import { useAppointmentActions } from './useAppointmentActions';
import { useAppointmentRefresh } from './useAppointmentRefresh';

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

  // View State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaView, setAgendaView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Use extracted hooks
  const {
    appointments,
    setAppointments,
    isLoading,
    refreshAppointments
  } = useAppointmentRefresh({
    agendaView,
    selectedDate,
    userId: user?.doctor?.id
  });

  const {
    appointmentDialogOpen,
    setAppointmentDialogOpen,
    isEditingAppointment,
    setIsEditingAppointment,
    appointmentFormData,
    setAppointmentFormData,
    selectedAppointment,
    setSelectedAppointment,
    fieldErrors,
    setFieldErrors,
    formErrorMessage,
    setFormErrorMessage,
    isSubmitting,
    setIsSubmitting,
    successMessage,
    prepareNewAppointment,
    prepareEditAppointment,
    showSuccessMessage
  } = useAppointmentFormData(doctorProfile);

  const {
    createAppointmentDirect,
    handleAppointmentSubmit,
    cancelAppointment,
    handleCancelAppointment
  } = useAppointmentActions({
    user,
    doctorProfile,
    selectedDate,
    agendaView,
    setSelectedDate,
    refreshAppointments,
    setIsLoading: (loading: boolean) => { /* isLoading is managed by useAppointmentRefresh, but actions might need to set it manually if needed, or we can ignore */ },
    setIsSubmitting,
    setFieldErrors,
    setFormErrorMessage,
    setAppointmentDialogOpen,
    showSuccessMessage,
    appointmentFormData,
    selectedAppointment,
    onNavigate
  });

  // Handle new appointment wrapper
  const handleNewAppointment = useCallback(() => {
    prepareNewAppointment();
  }, [prepareNewAppointment]);

  // Handle edit appointment wrapper
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    prepareEditAppointment(appointment);
  }, [prepareEditAppointment]);

  // Force refresh wrapper
  const forceRefresh = useCallback(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  // Update form data when doctor profile changes
  useEffect(() => {
    if (doctorProfile) {
      setAppointmentFormData((prev: AppointmentFormData) => ({
        ...prev,
        doctor_id: doctorProfile.id || '',
      }));
    }
  }, [doctorProfile, setAppointmentFormData]);

  return {
    // Appointment state
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
    cancelAppointment,
    refreshAppointments,
    forceRefresh,

    // Form state
    fieldErrors,
    formErrorMessage,
    isSubmitting,
    successMessage,

    // Doctor profile
    doctorProfile
  };
};