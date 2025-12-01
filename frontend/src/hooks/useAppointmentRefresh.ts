import { useEffect, useCallback, useState } from 'react';
import { Appointment } from '../types';
import { apiService } from '../services';
import { logger } from '../utils/logger';
import { getDateString } from '../utils/appointmentTransformers';

// Helper to fetch appointments based on view
const fetchAppointmentsForView = async (
    view: 'daily' | 'weekly' | 'monthly',
    date: Date,
    api: typeof apiService.appointments
) => {
    if (isNaN(date.getTime())) {
        date = new Date();
    }

    if (view === 'daily') {
        return await api.getDailyAgenda(getDateString(date));
    } else if (view === 'weekly') {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        start.setDate(diff);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        return await api.getWeeklyAgenda(getDateString(start), getDateString(end));
    } else {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        return await api.getMonthlyAgenda(getDateString(start), getDateString(end));
    }
};

interface UseAppointmentRefreshProps {
    agendaView: 'daily' | 'weekly' | 'monthly';
    selectedDate: Date;
    userId?: number;
    debounceMs?: number;
}

export const useAppointmentRefresh = ({
    agendaView,
    selectedDate,
    userId,
    debounceMs = 300
}: UseAppointmentRefreshProps) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Serialize selectedDate to avoid infinite loops from Date object reference changes
    const selectedDateKey = selectedDate instanceof Date && !isNaN(selectedDate.getTime())
        ? selectedDate.getTime()
        : new Date().getTime();

    // Refresh appointments function - can be called from child components
    const refreshAppointments = useCallback(async () => {
        try {
            // Validate selectedDate - if invalid, use today's date
            let dateToRefresh: Date;
            if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
                dateToRefresh = new Date(selectedDate);
            } else {
                dateToRefresh = new Date();
            }

            const data = await fetchAppointmentsForView(agendaView, dateToRefresh, apiService.appointments);

            // Update state once with the fetched data
            setAppointments(data || []);
        } catch (error) {
            console.error('❌ Error refreshing appointments:', error);
            // Don't clear the view if refresh fails
        }
    }, [selectedDateKey, agendaView]);

    // Auto-refresh appointments when view or date changes - only if authenticated
    useEffect(() => {
        if (!userId) {
            return;
        }

        // Use a longer timeout to prevent rapid successive calls and add abort controller
        let abortController = new AbortController();
        const timeoutId = setTimeout(async () => {
            try {
                // Validate selectedDate - if invalid, use today's date
                let dateToFetch: Date;
                if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
                    dateToFetch = new Date(selectedDate);
                } else {
                    dateToFetch = new Date();
                }

                // Only update if not aborted
                if (!abortController.signal.aborted) {
                    const data = await fetchAppointmentsForView(agendaView, dateToFetch, apiService.appointments);
                    console.log('📅 Fetched appointments:', {
                        count: data?.length || 0,
                        agendaView,
                        date: dateToFetch.toISOString(),
                        sample: data?.[0]
                    });
                    setAppointments(data || []);
                }
            } catch (error) {
                if (!abortController.signal.aborted) {
                    logger.error('Error fetching appointments', error, 'api');
                    setAppointments([]);
                }
            }
        }, debounceMs);

        // Cleanup timeout and abort controller on unmount or dependency change
        return () => {
            clearTimeout(timeoutId);
            abortController.abort();
        };
    }, [agendaView, selectedDateKey, userId, debounceMs]);

    return {
        appointments,
        setAppointments,
        isLoading,
        refreshAppointments
    };
};
