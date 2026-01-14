import { apiService } from './api';
import {
  PatientInfo,
  DoctorInfo,
  ConsultationInfo,
  MedicationInfo,
  StudyInfo,
  CertificateInfo,
  OfficeInfo
} from '../types/pdf';
import { selectBestOfficeForPDF } from './pdf/utils';
import { PrescriptionGenerator } from './pdf/generators/PrescriptionGenerator';
import { MedicalOrderGenerator } from './pdf/generators/MedicalOrderGenerator';
import { CertificateGenerator } from './pdf/generators/CertificateGenerator';

// Re-export types for backward compatibility
export type {
  PatientInfo,
  DoctorInfo,
  OfficeInfo,
  MedicationInfo,
  StudyInfo,
  ConsultationInfo,
  CertificateInfo
} from '../types/pdf';

class PDFService {
  private prescriptionGenerator: PrescriptionGenerator;
  private medicalOrderGenerator: MedicalOrderGenerator;
  private certificateGenerator: CertificateGenerator;

  constructor() {
    this.prescriptionGenerator = new PrescriptionGenerator();
    this.medicalOrderGenerator = new MedicalOrderGenerator();
    this.certificateGenerator = new CertificateGenerator();
  }

  private async getOfficeInfo(doctor: DoctorInfo): Promise<OfficeInfo | null> {
    let officeInfo: OfficeInfo | null = null;

    if (!doctor.offices || doctor.offices.length === 0) {
      try {
        const offices = await apiService.getOffices();
        console.log('📋 Fetched offices for PDF:', offices);
        if (offices && offices.length > 0) {
          officeInfo = selectBestOfficeForPDF(offices);
          console.log('📋 Selected office for PDF:', officeInfo);
        }
      } catch (error) {
        console.warn('Could not fetch office information:', error);
      }
    } else {
      officeInfo = selectBestOfficeForPDF(doctor.offices);
      console.log('📋 Using doctor.offices for PDF:', officeInfo);
    }

    return officeInfo;
  }

  async generatePrescription(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    medications: MedicationInfo[]
  ): Promise<void> {
    console.log('PDFService.generatePrescription (Refactored) called with:', {
      patient: patient?.name,
      doctor: doctor?.name,
      consultation: consultation?.id,
      medicationsCount: medications?.length
    });

    try {
      const officeInfo = await this.getOfficeInfo(doctor);

      // Use the generator
      // Note: We create a new instance or reuse? The generators maintain state (doc). 
      // The BaseGenerator constructor creates a new jsPDF instance.
      // So we should instantiate a new generator for each request to avoid state pollution.
      const generator = new PrescriptionGenerator();
      await generator.generate(patient, doctor, consultation, medications, officeInfo || undefined);

      // Track PDF download in Amplitude
      try {
        const { AmplitudeService } = await import('./analytics/AmplitudeService');
        AmplitudeService.track('pdf_downloaded', {
          pdf_type: 'prescription',
          has_medications: medications && medications.length > 0,
          medication_count: medications?.length || 0
        });
      } catch (e) {
        // Silently fail if Amplitude is not available
      }

      console.log('PDF saved successfully');
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      throw error;
    }
  }

  async generateMedicalOrder(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    studies: StudyInfo[]
  ): Promise<void> {
    try {
      const officeInfo = await this.getOfficeInfo(doctor);

      const generator = new MedicalOrderGenerator();
      await generator.generate(patient, doctor, consultation, studies, officeInfo || undefined);

      // Track PDF download in Amplitude
      try {
        const { AmplitudeService } = await import('./analytics/AmplitudeService');
        AmplitudeService.track('pdf_downloaded', {
          pdf_type: 'study_order',
          has_studies: studies && studies.length > 0,
          study_count: studies?.length || 0
        });
      } catch (e) {
        // Silently fail if Amplitude is not available
      }
    } catch (error) {
      console.error('Error generating medical order PDF:', error);
      throw error;
    }
  }

  async generateMedicalCertificate(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    certificate: CertificateInfo
  ): Promise<void> {
    try {
      const officeInfo = await this.getOfficeInfo(doctor);

      const generator = new CertificateGenerator();
      await generator.generate(patient, doctor, consultation, certificate, officeInfo || undefined);

      // Track PDF download in Amplitude
      try {
        const { AmplitudeService } = await import('./analytics/AmplitudeService');
        AmplitudeService.track('pdf_downloaded', {
          pdf_type: 'certificate',
          certificate_title: certificate.title || 'CONSTANCIA MÉDICA'
        });
      } catch (e) {
        // Silently fail if Amplitude is not available
      }
    } catch (error) {
      console.error('Error generating medical certificate PDF:', error);
      throw error;
    }
  }
}

export const pdfService = new PDFService();
