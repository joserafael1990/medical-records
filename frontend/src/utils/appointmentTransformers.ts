import { Appointment, AppointmentFormData } from '../types';
import { formatDateTimeForInput } from '../constants';

/**
 * Transform appointment data from API response to form data format
 */
export const transformAppointmentToFormData = (appointment: any): AppointmentFormData => {
    const formattedDateTime = formatDateTimeForInput(
        appointment.appointment_date || appointment.date_time
    );

    // Ensure patient_id is a number
    const patientId = typeof appointment.patient_id === 'number'
        ? appointment.patient_id
        : parseInt(appointment.patient_id, 10) || 0;

    // Debug logging
    console.log('📋 transformAppointmentToFormData:', {
        original_patient_id: appointment.patient_id,
        parsed_patient_id: patientId,
        appointment_date_raw: appointment.appointment_date,
        appointment_date_formatted: formattedDateTime
    });

    return {
        id: appointment.id,
        patient_id: patientId,
        doctor_id: appointment.doctor_id,
        appointment_date: formattedDateTime,
        appointment_type_id: appointment.appointment_type_id || 1,
        appointment_type: (appointment.appointment_type_id || 1) === 1 ? 'primera vez' : 'seguimiento',
        office_id: appointment.office_id,
        consultation_type: appointment.consultation_type,
        status: appointment.status,
        preparation_instructions: appointment.preparation_instructions || '',
        confirmation_required: appointment.confirmation_required || false,
        estimated_cost: appointment.estimated_cost || '',
        insurance_covered: appointment.insurance_covered || false,
        room_number: appointment.room_number || '',
        equipment_needed: appointment.equipment_needed || '',
        cancelled_reason: appointment.cancelled_reason || '',
        auto_reminder_enabled: appointment.auto_reminder_enabled ?? false,
        auto_reminder_offset_minutes: appointment.auto_reminder_offset_minutes ?? 360,
        reminders: appointment.reminders && Array.isArray(appointment.reminders)
            ? appointment.reminders.map((r: any) => ({
                reminder_number: r.reminder_number,
                offset_minutes: r.offset_minutes,
                enabled: r.enabled
            }))
            : undefined
    } as any;
};

/**
 * Transform form data to backend API format for creating appointments
 */
export const transformFormDataToCreatePayload = (
    formData: any,
    doctorId: number,
    appointmentDuration: number
) => {
    // Support both date_time (legacy) and appointment_date (current)
    const dateTimeValue = formData.date_time || formData.appointment_date;

    if (!dateTimeValue) {
        throw new Error('Missing date/time field: appointment_date or date_time is required');
    }

    // Ensure dateTimeValue is a string before calling includes
    const dateTimeStr = typeof dateTimeValue === 'string'
        ? (dateTimeValue.includes(':') && !dateTimeValue.includes(':00')
            ? `${dateTimeValue}:00`
            : dateTimeValue)
        : String(dateTimeValue);

    const appointmentDate = new Date(dateTimeStr);

    if (isNaN(appointmentDate.getTime())) {
        throw new Error(`Invalid date format: ${dateTimeStr || dateTimeValue || 'undefined'}. Expected ISO format (YYYY-MM-DDTHH:mm:ss or similar)`);
    }

    const endTime = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

    // Convert to Mexico City timezone
    const mexicoTimeString = appointmentDate.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
    const mexicoEndTimeString = endTime.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });

    // Create ISO strings with CDMX timezone offset
    const cdmxDateISO = mexicoTimeString.replace(' ', 'T') + '-06:00';
    const cdmxEndDateISO = mexicoEndTimeString.replace(' ', 'T') + '-06:00';

    const payload: any = {
        patient_id: formData.patient_id,
        doctor_id: doctorId,
        appointment_date: cdmxDateISO,
        end_time: cdmxEndDateISO,
        appointment_type_id: formData.appointment_type_id || 1, // Default to 1 (primera vez) if not provided
        office_id: formData.office_id || null,
        consultation_type: formData.consultation_type || 'Seguimiento',
        status: formData.status || 'por_confirmar',
        preparation_instructions: formData.preparation_instructions || '',
        auto_reminder_enabled: !!formData.auto_reminder_enabled,
        auto_reminder_offset_minutes: (formData.auto_reminder_offset_minutes ?? 360)
    };

    // Include reminders if present
    if (formData.reminders && Array.isArray(formData.reminders) && formData.reminders.length > 0) {
        payload.reminders = formData.reminders;
    }

    return payload;
};

/**
 * Transform form data to backend API format for updating appointments
 */
export const transformFormDataToUpdatePayload = (
    formData: AppointmentFormData,
    appointmentDuration: number
) => {
    const appointmentDate = new Date(formData.appointment_date);
    const endTime = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

    // Convert to Mexico City timezone (same as create)
    const mexicoTimeString = appointmentDate.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });
    const mexicoEndTimeString = endTime.toLocaleString("sv-SE", { timeZone: "America/Mexico_City" });

    // Create ISO strings with CDMX timezone offset
    const cdmxDateISO = mexicoTimeString.replace(' ', 'T') + '-06:00';
    const cdmxEndDateISO = mexicoEndTimeString.replace(' ', 'T') + '-06:00';

    const updateData: any = {
        patient_id: formData.patient_id,
        appointment_date: cdmxDateISO,
        end_time: cdmxEndDateISO,
        appointment_type_id: formData.appointment_type_id || 1,
        office_id: formData.office_id || null,
        consultation_type: formData.consultation_type || '',
        status: formData.status || 'por_confirmar',
        preparation_instructions: formData.preparation_instructions || undefined,
        follow_up_required: formData.confirmation_required || false,
        room_number: formData.room_number || undefined,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost as any) : undefined,
        insurance_covered: formData.insurance_covered || false,
        auto_reminder_enabled: !!formData.auto_reminder_enabled,
        auto_reminder_offset_minutes: (formData.auto_reminder_offset_minutes ?? 360)
    };

    // Include reminders if present
    if (formData.reminders && Array.isArray(formData.reminders) && formData.reminders.length > 0) {
        updateData.reminders = formData.reminders;
    }

    return updateData;
};

/**
 * Get date string for API calls (YYYY-MM-DD)
 */
export const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
