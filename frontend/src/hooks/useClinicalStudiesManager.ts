import { useCallback } from 'react';
import { TEMP_IDS } from '../utils/vitalSignUtils';
import { logger } from '../utils/logger';

interface UseClinicalStudiesManagerProps {
    clinicalStudiesHook: any;
    isEditing: boolean;
    consultationId?: number | null;
    selectedPatientId?: number | null;
    doctorProfile?: any;
    onError?: (message: string) => void;
}

export const useClinicalStudiesManager = ({
    clinicalStudiesHook,
    isEditing,
    consultationId,
    selectedPatientId,
    doctorProfile,
    onError
}: UseClinicalStudiesManagerProps) => {
    const getDoctorName = useCallback(() => {
        return doctorProfile?.full_name || doctorProfile?.name
          ? `${doctorProfile?.title || 'Dr.'} ${doctorProfile?.full_name || doctorProfile?.name}`.trim()
          : 'Dr. Usuario';
    }, [doctorProfile]);

    const handleAddStudy = useCallback(async (studyData: any) => {
        const consultationIdStr = isEditing && consultationId ? String(consultationId) : TEMP_IDS.CONSULTATION;
        const patientId = selectedPatientId?.toString() || TEMP_IDS.PATIENT;
        const doctorName = getDoctorName();

        if (consultationIdStr === TEMP_IDS.CONSULTATION) {
            const tempStudy = {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                consultation_id: consultationIdStr,
                patient_id: patientId,
                study_type: studyData.study_type,
                study_name: studyData.study_name,
                ordered_date: studyData.ordered_date,
                status: studyData.status || 'ordered',
                urgency: studyData.urgency || 'routine',
                ordering_doctor: doctorName,
                clinical_indication: studyData.clinical_indication || '',
                created_by: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            clinicalStudiesHook.addTemporaryStudy(tempStudy);
        } else {
            await clinicalStudiesHook.createStudy({
                ...studyData,
                ordering_doctor: doctorName
            });
            await clinicalStudiesHook.fetchStudies(consultationIdStr);
        }
    }, [isEditing, consultationId, selectedPatientId, getDoctorName, clinicalStudiesHook]);

    const handleDeleteStudy = useCallback(async (studyId: string) => {
        try {
            if (studyId.startsWith('temp_')) {
                clinicalStudiesHook.deleteStudy(studyId);
            } else {
                await clinicalStudiesHook.deleteStudy(studyId);
            }
        } catch (error) {
            if (onError) {
                onError('Error al eliminar el estudio clínico');
            }
        }
    }, [clinicalStudiesHook, onError]);

    const handleAddPreviousStudy = useCallback(async (studyData: any) => {
        const consultationIdStr = isEditing && consultationId ? String(consultationId) : null;
        const patientId = selectedPatientId?.toString() || '';
        const doctorName = getDoctorName();

        // Create study without consultation_id (or with it if editing existing consultation)
        const studyToCreate: any = {
            ...studyData,
            patient_id: patientId,
            ordering_doctor: doctorName
        };

        // Only include consultation_id if it has a valid value
        if (consultationIdStr && consultationIdStr !== 'null' && consultationIdStr !== '') {
            studyToCreate.consultation_id = consultationIdStr;
        }

        return studyToCreate;
    }, [isEditing, consultationId, selectedPatientId, getDoctorName]);

    return {
        handleAddStudy,
        handleDeleteStudy,
        handleAddPreviousStudy,
        getDoctorName
    };
};
