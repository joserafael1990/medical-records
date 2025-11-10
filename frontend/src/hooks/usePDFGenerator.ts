import { useCallback } from 'react';
import { pdfService, PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo, CertificateInfo } from '../services/pdfService';

export const usePDFGenerator = () => {
  const generatePrescriptionPDF = useCallback(async (
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    medications: MedicationInfo[]
  ) => {
    try {
      await pdfService.generatePrescription(patient, doctor, consultation, medications);
      return { success: true, message: 'Receta generada exitosamente' };
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      return { success: false, message: 'Error al generar la receta' };
    }
  }, []);

  const generateMedicalOrderPDF = useCallback(async (
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    studies: StudyInfo[]
  ) => {
    try {
      await pdfService.generateMedicalOrder(patient, doctor, consultation, studies);
      return { success: true, message: 'Orden de estudios generada exitosamente' };
    } catch (error) {
      console.error('Error generating medical order PDF:', error);
      return { success: false, message: 'Error al generar la orden de estudios' };
    }
  }, []);

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
