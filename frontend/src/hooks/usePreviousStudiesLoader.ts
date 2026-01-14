import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

interface UsePreviousStudiesLoaderProps {
    open: boolean;
    selectedPatientId?: number | null;
    consultationId?: number | null;
    previousStudiesHook: any;
    debounceMs?: number;
}

export const usePreviousStudiesLoader = ({
    open,
    selectedPatientId,
    consultationId,
    previousStudiesHook,
    debounceMs = 500
}: UsePreviousStudiesLoaderProps) => {
    const lastFetchedPatientRef = useRef<number | null>(null);

    // Reset when dialog closes
    useEffect(() => {
        if (!open) {
            lastFetchedPatientRef.current = null;
            previousStudiesHook.clearTemporaryStudies();
        }
    }, [open, previousStudiesHook]);

    // Load previous studies when patient is selected or when dialog opens for editing
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        if (open && selectedPatientId) {
            const patientId = selectedPatientId.toString();

            // Skip if we already fetched for this patient
            if (lastFetchedPatientRef.current === selectedPatientId) {
                return;
            }

            // Load previous studies for the patient with debounce to avoid rapid successive calls
            timeoutId = setTimeout(() => {
                if (isMounted && selectedPatientId) {
                    lastFetchedPatientRef.current = selectedPatientId;
                    previousStudiesHook.fetchPatientStudies(patientId).catch((error: any) => {
                        // Ignore 429 errors (rate limiting) - will retry later
                        if (error?.response?.status !== 429) {
                            logger.error('Error loading previous studies', error, 'api');
                        }
                    });
                }
            }, debounceMs);

            return () => {
                isMounted = false;
                clearTimeout(timeoutId);
            };
        } else if (!open) {
            previousStudiesHook.clearTemporaryStudies();
            lastFetchedPatientRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedPatientId, consultationId]);

    return {
        lastFetchedPatientRef
    };
};
