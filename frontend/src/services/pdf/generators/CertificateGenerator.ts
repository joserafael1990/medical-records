import { BasePDFGenerator } from './BaseGenerator';
import {
    PatientInfo,
    DoctorInfo,
    ConsultationInfo,
    CertificateInfo,
    OfficeInfo
} from '../../../types/pdf';
import { PDF_CONSTANTS } from '../constants';

export class CertificateGenerator extends BasePDFGenerator {
    async generate(
        patient: PatientInfo,
        doctor: DoctorInfo,
        consultation: ConsultationInfo,
        certificate: CertificateInfo,
        officeInfo?: OfficeInfo
    ): Promise<void> {
        const pageWidth = this.doc.internal.pageSize.width;

        // Add header
        let currentY = await this.addHeader(patient, doctor, consultation, officeInfo);

        // Add document title
        this.doc.setFontSize(14);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text(certificate.title || 'CONSTANCIA MÉDICA', pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        // Add certificate content
        this.doc.setFontSize(10);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');

        const maxWidth = pageWidth - 40;
        const certificateLines = this.doc.splitTextToSize(certificate.content, maxWidth);
        certificateLines.forEach((line: string) => {
            this.doc.text(line, 20, currentY);
            currentY += 6;
        });

        // Add signature section
        this.addFooter(doctor, consultation, currentY, { includeTreatmentPlan: false });

        // Save the PDF
        const patientNameForCertFile = patient.name ? patient.name.replace(/\s+/g, '_') : 'Paciente';
        const fileName = `Constancia_${patientNameForCertFile}_${consultation.date.replace(/\//g, '-')}.pdf`;
        this.save(fileName);
    }
}
