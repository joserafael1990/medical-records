import { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentFormData, AppointmentReminderFormData } from '../types';
import { logger } from '../utils/logger';

interface UseAppointmentRemindersProps {
    open: boolean;
    isEditing: boolean;
    externalFormData?: AppointmentFormData;
    onSubmit: (formData: AppointmentFormData) => void;
    onFormDataChange?: (data: AppointmentFormData) => void;
}

export const useAppointmentReminders = ({
    open,
    isEditing,
    externalFormData,
    onSubmit,
    onFormDataChange
}: UseAppointmentRemindersProps) => {
    // State for reminders
    const [reminders, setReminders] = useState<AppointmentReminderFormData[]>([]);
    // Use ref to always have the latest reminders value
    const remindersRef = useRef<AppointmentReminderFormData[]>([]);

    // Track if we've initialized reminders for this dialog session
    const remindersInitializedRef = useRef(false);
    const previousExternalFormDataRef = useRef<AppointmentFormData | undefined>(undefined);

    // Update ref whenever reminders change - this ensures ref is always in sync
    useEffect(() => {
        remindersRef.current = reminders;
    }, [reminders]);

    // Load reminders when dialog opens or when editing
    useEffect(() => {
        // Only initialize when dialog opens
        if (!open) {
            remindersInitializedRef.current = false;
            previousExternalFormDataRef.current = undefined;
            return;
        }

        // Check if externalFormData has actually changed (by comparing reminders)
        const currentReminders = externalFormData?.reminders;
        const previousReminders = previousExternalFormDataRef.current?.reminders;
        const remindersChanged = JSON.stringify(currentReminders) !== JSON.stringify(previousReminders);

        // Update the ref to track current externalFormData
        previousExternalFormDataRef.current = externalFormData;

        // Initialize reminders based on editing state
        if (isEditing && externalFormData?.reminders && Array.isArray(externalFormData.reminders)) {
            const loadedReminders = externalFormData.reminders.map((r: any) => ({
                reminder_number: r.reminder_number,
                offset_minutes: r.offset_minutes,
                enabled: r.enabled
            }));
            // Only update if reminders actually changed or if not yet initialized
            if (remindersChanged || !remindersInitializedRef.current) {
                setReminders(loadedReminders);
                remindersInitializedRef.current = true;
            }
        } else if (!isEditing) {
            // Only reset if we're creating a new appointment (not editing) and not yet initialized
            if (!remindersInitializedRef.current) {
                setReminders([]);
                remindersInitializedRef.current = true;
            }
        }
    }, [open, isEditing, externalFormData?.reminders]);

    // Create a wrapper for onSubmit that always includes reminders
    const onSubmitWithReminders = useCallback((formData: AppointmentFormData) => {
        // ALWAYS use reminders from ref (which is always up-to-date) instead of formData
        const currentReminders = remindersRef.current;

        // Build formData with reminders
        const { reminders: _, ...formDataWithoutReminders } = formData as any;
        const formDataWithReminders: any = {
            ...formDataWithoutReminders
        };

        // Only add reminders property if there are actual reminders
        if (currentReminders.length > 0) {
            formDataWithReminders.reminders = currentReminders;
            logger.debug('✅ Added reminders to formDataWithReminders', {
                reminders_count: currentReminders.length,
                reminders: currentReminders
            }, 'ui');
        } else {
            logger.debug('⚠️ No reminders to add (currentReminders.length is 0)', {
                currentReminders_length: currentReminders.length,
                ref_length: remindersRef.current.length
            }, 'ui');
        }

        logger.debug('onSubmitWithReminders called', {
            reminders_count: currentReminders.length,
            reminders: currentReminders,
            formData_has_reminders: !!formData.reminders,
            formData_reminders_count: formData.reminders?.length || 0,
            ref_reminders_count: remindersRef.current.length,
            final_reminders_count: formDataWithReminders.reminders?.length || 0
        }, 'ui');

        onSubmit(formDataWithReminders);
    }, [onSubmit]);

    const handleRemindersChange = (newReminders: AppointmentReminderFormData[], currentFormData: AppointmentFormData, setFormData: (data: AppointmentFormData) => void) => {
        setReminders(newReminders);
        // Update formData with reminders
        const updated = {
            ...currentFormData,
            reminders: newReminders.length > 0 ? newReminders : undefined
        };
        setFormData(updated);
        if (onFormDataChange) {
            onFormDataChange(updated);
        }
    };

    return {
        reminders,
        setReminders,
        onSubmitWithReminders,
        handleRemindersChange
    };
};
