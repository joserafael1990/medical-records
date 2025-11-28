import { useState, useCallback, useRef } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { getCurrentCDMXDateTime } from '../constants';
import { apiService } from '../services';
import { transformAppointmentToFormData } from '../utils/appointmentTransformers';

interface UseAppointmentFormDataReturn {
    // Dialog state
    appointmentDialogOpen: boolean;
    setAppointmentDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isEditingAppointment: boolean;
    setIsEditingAppointment: React.Dispatch<React.SetStateAction<boolean>>;

    // Form data
    appointmentFormData: AppointmentFormData;
    setAppointmentFormData: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
    selectedAppointment: Appointment | null;
    setSelectedAppointment: React.Dispatch<React.SetStateAction<Appointment | null>>;

    // Form status
    fieldErrors: { [key: string]: string };
    setFieldErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    formErrorMessage: string;
    setFormErrorMessage: React.Dispatch<React.SetStateAction<string>>;
    isSubmitting: boolean;
    setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
    successMessage: string;
    setSuccessMessage: React.Dispatch<React.SetStateAction<string>>;

    // Actions
    resetForm: () => void;
    prepareNewAppointment: () => Promise<void>;
    prepareEditAppointment: (appointment: Appointment) => Promise<void>;
    showSuccessMessage: (message: string) => void;
}

export const useAppointmentFormData = (doctorProfile: any): UseAppointmentFormDataReturn => {
    // Dialog state
    const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
    const [isEditingAppointment, setIsEditingAppointment] = useState(false);

    // Form data
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [appointmentFormData, setAppointmentFormData] = useState<AppointmentFormData>({
        patient_id: 0,
        doctor_id: doctorProfile?.id || 0,
        appointment_date: '',
        appointment_type_id: 1,
        status: 'por_confirmar',
        preparation_instructions: '',
        confirmation_required: false,
        estimated_cost: undefined,
        insurance_covered: false,
        cancelled_reason: ''
    });

    // Form status
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

    // Reset form to default state
    const resetForm = useCallback(() => {
        setAppointmentFormData({
            patient_id: 0,
            doctor_id: doctorProfile?.id || 0,
            appointment_date: '',
            appointment_type_id: 1,
            status: 'por_confirmar',
            preparation_instructions: '',
            confirmation_required: false,
            estimated_cost: undefined,
            insurance_covered: false,
            cancelled_reason: ''
        });
        setFieldErrors({});
        setFormErrorMessage('');
        setIsEditingAppointment(false);
        setSelectedAppointment(null);
    }, [doctorProfile]);

    // Prepare form for new appointment
    const prepareNewAppointment = useCallback(async () => {
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
    }, []);

    // Prepare form for editing appointment
    const prepareEditAppointment = useCallback(async (appointment: Appointment) => {
        try {
            setIsEditingAppointment(true);

            // Always load fresh data from backend to avoid stale state
            const latest = await apiService.appointments.getAppointment(String(appointment.id));
            setSelectedAppointment(latest as unknown as Appointment);

            const formData = transformAppointmentToFormData(latest);
            setAppointmentFormData(formData);

            setFieldErrors({});
            setFormErrorMessage('');
            setAppointmentDialogOpen(true);
        } catch (e) {
            console.error('❌ Error loading latest appointment data:', e);

            // Fallback to existing appointment object if request fails
            setSelectedAppointment(appointment);
            const formData = transformAppointmentToFormData(appointment);

            setAppointmentFormData(formData);
            setAppointmentDialogOpen(true);
        }
    }, []);

    return {
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
        setSuccessMessage,
        resetForm,
        prepareNewAppointment,
        prepareEditAppointment,
        showSuccessMessage
    };
};
