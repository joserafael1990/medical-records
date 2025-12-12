import { useState, useCallback } from 'react';
import { ClinicalStudy } from '../types';
import { apiService } from '../services';
import { useToast } from '../components/common/ToastNotification';
import { logger } from '../utils/logger';
import { API_CONFIG } from '../constants';

/**
 * Hook para manejar estudios clínicos previos del paciente
 */
export interface UsePatientPreviousStudiesReturn {
  patientPreviousStudies: ClinicalStudy[];
  loadingPreviousStudies: boolean;
  patientHasPreviousConsultations: boolean;
  loadPatientPreviousStudies: (patientId: number) => Promise<void>;
  checkPatientPreviousConsultations: (patientId: number) => Promise<void>;
  handleUploadStudyFile: (studyId: string, file: File, patientId: number) => Promise<void>;
  handleUpdateStudyStatus: (studyId: string, newStatus: string, patientId: number) => Promise<void>;
  handleViewStudyFile: (studyId: string) => Promise<void>;
  handleViewPreviousConsultations: (patientId: number, patientName: string) => void;
}

export const usePatientPreviousStudies = (): UsePatientPreviousStudiesReturn => {
  const { showSuccess, showError } = useToast();
  const [patientPreviousStudies, setPatientPreviousStudies] = useState<ClinicalStudy[]>([]);
  const [loadingPreviousStudies, setLoadingPreviousStudies] = useState<boolean>(false);
  const [patientHasPreviousConsultations, setPatientHasPreviousConsultations] = useState<boolean>(false);

  // Function to check if patient has previous consultations
  const checkPatientPreviousConsultations = useCallback(async (patientId: number) => {
    try {
      const allConsultations = await apiService.consultations.getConsultations();
      const patientConsultations = (allConsultations || []).filter((c: any) => c.patient_id === patientId);
      const hasPrevious = patientConsultations.length > 0;
      setPatientHasPreviousConsultations(hasPrevious);
    } catch (error) {
      logger.error('Error checking patient consultations', error, 'api');
      setPatientHasPreviousConsultations(false);
    }
  }, []);

  // Function to load previous clinical studies for patient
  const loadPatientPreviousStudies = useCallback(async (patientId: number) => {
    setLoadingPreviousStudies(true);
    try {
      logger.debug('Loading previous studies for patient', { patientId }, 'api');
      const studies = await apiService.clinicalStudies.getClinicalStudiesByPatient(String(patientId));
      const sortedStudies = (studies || []).sort((a: any, b: any) => {
        const dateA = a.ordered_date ? new Date(a.ordered_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const dateB = b.ordered_date ? new Date(b.ordered_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return dateB - dateA;
      });
      logger.debug(`Loaded ${sortedStudies.length} previous studies, sorted by date`, { count: sortedStudies.length }, 'api');
      setPatientPreviousStudies(sortedStudies);
    } catch (error) {
      logger.error('Error loading patient previous studies', error, 'api');
      setPatientPreviousStudies([]);
    } finally {
      setLoadingPreviousStudies(false);
    }
  }, []);

  // Handle update of previous study status
  const handleUpdateStudyStatus = useCallback(async (studyId: string, newStatus: string, patientId: number) => {
    try {
      await apiService.clinicalStudies.updateClinicalStudy(studyId, { status: newStatus });
      showSuccess('Estado del estudio actualizado correctamente');
      await loadPatientPreviousStudies(patientId);
    } catch (error) {
      logger.error('Error updating study status', error, 'api');
      showError('Error al actualizar el estado del estudio');
    }
  }, [loadPatientPreviousStudies, showSuccess, showError]);

  // Handle upload file for previous study
  const handleUploadStudyFile = useCallback(async (studyId: string, file: File, patientId: number) => {
    try {
      await apiService.clinicalStudies.uploadClinicalStudyFile(studyId, file);
      showSuccess('Archivo cargado correctamente');
      
      try {
        await apiService.clinicalStudies.updateClinicalStudy(studyId, { status: 'completed' });
        setPatientPreviousStudies(prevStudies => {
          return prevStudies.map(study => 
            study.id === studyId 
              ? { ...study, status: 'completed' }
              : study
          );
        });
      } catch (statusError) {
        logger.error('Error updating study status', statusError, 'api');
      }
      
      if (patientId) {
        const updatedStudies = await apiService.clinicalStudies.getClinicalStudiesByPatient(String(patientId));
        setPatientPreviousStudies(prevStudies => {
          const newStudies = updatedStudies.map((apiStudy: any) => {
            const localStudy = prevStudies.find(prev => prev.id === apiStudy.id);
            if (localStudy && localStudy.id === studyId && localStudy.status === 'completed') {
              return { ...apiStudy, status: 'completed' };
            }
            return apiStudy;
          });
          
          setTimeout(() => {
            setPatientPreviousStudies(prev => [...prev]);
          }, 100);
          
          return newStudies;
        });
      }
    } catch (error: any) {
      logger.error('Error uploading study file', {
        error,
        response: error.response,
        responseData: error.response?.data,
        responseDetail: error.response?.data?.detail,
        responseStatus: error.response?.status,
        message: error.message
      }, 'api');
      
      const errorMessage = error.detail || error.message || 'Error al cargar el archivo del estudio';
      showError(errorMessage);
    }
  }, [showSuccess, showError]);

  // Handle view file for previous study with authentication
  const handleViewStudyFile = useCallback(async (studyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('No estás autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/clinical-studies/${studyId}/file`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener el archivo');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'archivo.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      logger.error('Error viewing study file', error, 'api');
      showError('Error al visualizar el archivo del estudio');
    }
  }, [showError]);

  // Function to open consultations view with patient filter
  const handleViewPreviousConsultations = useCallback((patientId: number, patientName: string) => {
    const baseUrl = window.location.origin;
    const consultationsUrl = `${baseUrl}/?view=consultations&patientId=${patientId}&patientName=${encodeURIComponent(patientName)}`;
    window.open(consultationsUrl, '_blank');
  }, []);

  return {
    patientPreviousStudies,
    loadingPreviousStudies,
    patientHasPreviousConsultations,
    loadPatientPreviousStudies,
    checkPatientPreviousConsultations,
    handleUploadStudyFile,
    handleUpdateStudyStatus,
    handleViewStudyFile: handleViewStudyFile,
    handleViewPreviousConsultations
  };
};

