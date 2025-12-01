import { useCallback } from 'react';
import { Appointment, AppointmentFormData } from '../types';
import { apiService } from '../services';
import { transformFormDataToCreatePayload, transformFormDataToUpdatePayload } from '../utils/appointmentTransformers';
import { logger } from '../utils/logger';
import { safeConsoleError } from '../utils/errorHandling';

interface UseAppointmentActionsProps {
    user: any;
    doctorProfile: any;
    selectedDate: Date;
    agendaView: 'daily' | 'weekly' | 'monthly';
    setSelectedDate: (date: Date) => void;
    refreshAppointments: () => Promise<void>;
    setIsLoading: (loading: boolean) => void;
    setIsSubmitting: (submitting: boolean) => void;
    setFieldErrors: (errors: any) => void;
    setFormErrorMessage: (message: string) => void;
    setAppointmentDialogOpen: (open: boolean) => void;
    showSuccessMessage: (message: string) => void;
    appointmentFormData: AppointmentFormData;
    selectedAppointment: Appointment | null;
    onNavigate?: (view: string) => void;
}

export const useAppointmentActions = ({
    user,
    doctorProfile,
    selectedDate,
    agendaView,
    setSelectedDate,
    refreshAppointments,
    setIsLoading,
    setIsSubmitting,
    setFieldErrors,
    setFormErrorMessage,
    setAppointmentDialogOpen,
    showSuccessMessage,
    appointmentFormData,
    selectedAppointment
}: UseAppointmentActionsProps) => {

    // Function to create appointment directly without using form state
    const createAppointmentDirect = useCallback(async (appointmentData: any) => {
        setIsLoading(true);

        try {
            // Get doctor's appointment duration
            const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;

            const backendData = transformFormDataToCreatePayload(
                appointmentData,
                user?.doctor?.id || doctorProfile?.id || 0,
                doctorDuration
            );

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
            const appointmentDate = new Date(backendData.appointment_date);
            const currentDate = (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) ? selectedDate : new Date();

            if (appointmentDate.toDateString() !== currentDate.toDateString()) {
                setSelectedDate(appointmentDate);
            }

            // Refresh appointments after successful creation
            // We use a timeout to allow the backend to process the transaction and for the UI to update if date changed
            setTimeout(async () => {
                await refreshAppointments();
            }, 300);

            return response;
        } catch (error: any) {
            logger.error('Error creating appointment directly', error, 'api');
            safeConsoleError('Error creating appointment directly:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [user, doctorProfile, selectedDate, refreshAppointments, setSelectedDate, setIsLoading]);

    // Handle appointment submit
    const handleAppointmentSubmit = useCallback(async (submittedFormData?: any) => {
        setIsSubmitting(true);
        setFieldErrors({});
        setFormErrorMessage('');

        // Use submitted form data if provided, otherwise use hook's state
        const formDataToUse = submittedFormData || appointmentFormData;

        try {
            // Force edit mode if there is a selected appointment
            const isEditFlow = !!(selectedAppointment && selectedAppointment.id);
            const doctorDuration = user?.doctor?.appointment_duration || doctorProfile?.appointment_duration || 30;

            if (isEditFlow && selectedAppointment) {
                // Update existing appointment
                const updateData = transformFormDataToUpdatePayload(formDataToUse, doctorDuration);

                await apiService.appointments.updateAppointment(String(selectedAppointment.id), updateData);

                // Track appointment update in Amplitude
                const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
                AmplitudeService.track('appointment_updated', {
                    appointment_id: selectedAppointment.id,
                    has_reminders: !!(formDataToUse.reminders && formDataToUse.reminders.length > 0),
                    reminder_count: formDataToUse.reminders?.length || 0,
                    status: formDataToUse.status || 'por_confirmar'
                });

                showSuccessMessage('Cita actualizada correctamente');
            } else {
                // Create new appointment
                const createData = transformFormDataToCreatePayload(
                    formDataToUse,
                    user?.doctor?.id || doctorProfile?.id || 0,
                    doctorDuration
                );

                await apiService.appointments.createAgendaAppointment(createData);

                // Track appointment creation in Amplitude
                const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
                AmplitudeService.track('appointment_created', {
                    appointment_type: formDataToUse.appointment_type || 'presencial',
                    has_reminders: !!(formDataToUse.reminders && formDataToUse.reminders.length > 0),
                    reminder_count: formDataToUse.reminders?.length || 0,
                    status: formDataToUse.status || 'por_confirmar'
                });

                showSuccessMessage('Cita agendada correctamente');
            }

            setAppointmentDialogOpen(false);

            // Refresh appointments to show the new/updated one
            await refreshAppointments();

        } catch (error: any) {
            // Log error with full details using safe error logging
            logger.error('Error submitting appointment', error, 'api');
            safeConsoleError('Error submitting appointment:', error);

            // Handle validation errors
            if (error.response?.data?.detail) {
                // If detail is an object (field errors)
                if (typeof error.response.data.detail === 'object') {
                    setFieldErrors(error.response.data.detail);
                } else {
                    // If detail is a string (general error)
                    setFormErrorMessage(error.response.data.detail);
                }
            } else if (error.message) {
                // Use error message if available
                setFormErrorMessage(error.message);
            } else {
                setFormErrorMessage('Ocurrió un error al guardar la cita. Por favor intente nuevamente.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [
        user,
        doctorProfile,
        selectedAppointment,
        appointmentFormData,
        setIsSubmitting,
        setFieldErrors,
        setFormErrorMessage,
        showSuccessMessage,
        setAppointmentDialogOpen,
        refreshAppointments
    ]);

    // Handle cancel appointment
    const cancelAppointment = useCallback(async (appointmentId: number) => {
        try {
            await apiService.appointments.updateAppointmentStatus(String(appointmentId), 'cancelada');

            // Track cancellation
            const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
            AmplitudeService.track('appointment_cancelled', {
                appointment_id: appointmentId,
                source: 'calendar_view'
            });

            showSuccessMessage('Cita cancelada correctamente');
            await refreshAppointments();
        } catch (error: any) {
            logger.error('Error cancelling appointment', error, 'api');
            safeConsoleError('Error cancelling appointment:', error);
            setFormErrorMessage('Error al cancelar la cita');
        }
    }, [refreshAppointments, showSuccessMessage, setFormErrorMessage]);

    // Wrapper for handleCancelAppointment to use with selectedAppointment
    const handleCancelAppointment = useCallback(() => {
        if (selectedAppointment) {
            cancelAppointment(selectedAppointment.id);
            setAppointmentDialogOpen(false);
        }
    }, [selectedAppointment, cancelAppointment, setAppointmentDialogOpen]);

    return {
        createAppointmentDirect,
        handleAppointmentSubmit,
        cancelAppointment,
        handleCancelAppointment
    };
};
