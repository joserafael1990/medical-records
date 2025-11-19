import { useState, useCallback } from 'react';
import { pdfService, PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo, CertificateInfo } from '../services/pdfService';
import { apiService } from '../services';
import type { DocumentFolio } from '../types';

export const usePDFGenerator = () => {
  const [folioCache, setFolioCache] = useState<Record<string, Partial<DocumentFolio>>>({});

  const getCachedKey = (consultationId: number | string | undefined, documentType: 'prescription' | 'study_order') =>
    `${documentType}-${consultationId ?? 'unknown'}`;

  const fetchDocumentFolio = useCallback(async (
    consultationId: number | string | undefined,
    documentType: 'prescription' | 'study_order'
  ): Promise<Partial<DocumentFolio> | null> => {
    if (!consultationId) {
      return null;
    }

    const cacheKey = getCachedKey(consultationId, documentType);
    if (folioCache[cacheKey]) {
      return folioCache[cacheKey];
    }

    try {
      const folio = await apiService.consultations.getDocumentFolio(String(consultationId), documentType);
      setFolioCache(prev => ({ ...prev, [cacheKey]: folio }));
      return folio;
    } catch (error) {
      console.error('Error fetching document folio:', {
        error,
        consultationId,
        documentType
      });
      return null;
    }
  }, [folioCache]);

  const generatePrescriptionPDF = useCallback(async (
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    medications: MedicationInfo[],
    nextAppointmentDate?: string | null
  ) => {
    try {
      const folio = await fetchDocumentFolio(consultation?.id, 'prescription');
      const consultationWithFolio = {
        ...consultation,
        folio: folio?.formatted_folio,
        folioNumber: folio?.folio_number,
        folioCreatedAt: folio?.created_at,
        nextAppointmentDate: nextAppointmentDate || consultation?.nextAppointmentDate || null
      };

      await pdfService.generatePrescription(patient, doctor, consultationWithFolio, medications);
      return { success: true, message: 'Receta generada exitosamente' };
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      return { success: false, message: 'Error al generar la receta' };
    }
  }, [fetchDocumentFolio]);

  const generateMedicalOrderPDF = useCallback(async (
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    studies: StudyInfo[],
    nextAppointmentDate?: string | null
  ) => {
    try {
      const folio = await fetchDocumentFolio(consultation?.id, 'study_order');
      const consultationWithFolio = {
        ...consultation,
        folio: folio?.formatted_folio,
        folioNumber: folio?.folio_number,
        folioCreatedAt: folio?.created_at,
        nextAppointmentDate: nextAppointmentDate || consultation?.nextAppointmentDate || null
      };

      await pdfService.generateMedicalOrder(patient, doctor, consultationWithFolio, studies);
      return { success: true, message: 'Orden de estudios generada exitosamente' };
    } catch (error) {
      console.error('Error generating medical order PDF:', error);
      return { success: false, message: 'Error al generar la orden de estudios' };
    }
  }, [fetchDocumentFolio]);

  const generateCertificatePDF = useCallback(async (
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    certificate: CertificateInfo
  ) => {
    try {
      await pdfService.generateMedicalCertificate(patient, doctor, consultation, certificate);
      return { success: true, message: 'Constancia generada exitosamente' };
    } catch (error: any) {
      console.error('Error generating certificate PDF:', {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      return { success: false, message: error?.message || 'Error al generar la constancia' };
    }
  }, []);

  return {
    generatePrescriptionPDF,
    generateMedicalOrderPDF,
    generateCertificatePDF
  };
};
