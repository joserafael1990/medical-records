import { useState, useMemo, useEffect } from 'react';

export const useFollowUpAppointments = (open: boolean) => {
    const [followUpAppointments, setFollowUpAppointments] = useState<any[]>([]);

    const nextAppointmentDate = useMemo(() => {
        if (!followUpAppointments || followUpAppointments.length === 0) {
            return null;
        }
        const withDates = followUpAppointments.filter((appointment) => appointment?.appointment_date);
        if (withDates.length === 0) {
            return null;
        }
        withDates.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
        return withDates[0].appointment_date;
    }, [followUpAppointments]);

    // Clear appointments when dialog closes
    useEffect(() => {
        if (!open) {
            setFollowUpAppointments([]);
        }
    }, [open]);

    return {
        followUpAppointments,
        setFollowUpAppointments,
        nextAppointmentDate
    };
};
