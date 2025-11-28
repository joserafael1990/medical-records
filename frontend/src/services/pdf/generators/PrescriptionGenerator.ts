import { BasePDFGenerator } from './BaseGenerator';
import {
    PatientInfo,
    DoctorInfo,
    ConsultationInfo,
    MedicationInfo,
    OfficeInfo
} from '../../../types/pdf';
import { PDF_CONSTANTS } from '../constants';

export class PrescriptionGenerator extends BasePDFGenerator {
    async generate(
        patient: PatientInfo,
        doctor: DoctorInfo,
        consultation: ConsultationInfo,
        medications: MedicationInfo[],
        officeInfo?: OfficeInfo
    ): Promise<void> {
        // Add header
        let currentY = await this.addHeader(patient, doctor, consultation, officeInfo);

        // Add medications section
        currentY = this.addMedicationsSection(medications, currentY);

        // Add footer
        this.addFooter(doctor, consultation, currentY);

        // Save the PDF
        const patientNameForFile = patient.name ? patient.name.replace(/\s+/g, '_') : 'Paciente';
        const fileName = `Receta_${patientNameForFile}_${consultation.date.replace(/\//g, '-')}.pdf`;
        this.save(fileName);
    }

    private addMedicationsSection(
        medications: MedicationInfo[],
        startY: number
    ): number {
        const pageWidth = this.doc.internal.pageSize.width;
        let currentY = startY;

        // === PRESCRIPTION HEADER ===
        // Rx icon background
        this.doc.setFillColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.circle(20, currentY + 3, 4, 'F');

        // Rx text
        this.doc.setFontSize(12);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.WHITE);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text('Rx', 17.5, currentY + 5);

        // Section title
        this.doc.setFontSize(11);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text('PRESCRIPCIÓN MÉDICA', 30, currentY + 5);

        currentY += 15;

        // === MEDICATIONS LIST ===
        if (medications && medications.length > 0) {
            medications.forEach((med, index) => {
                // Check if we need a new page
                if (currentY > 250) {
                    this.doc.addPage();
                    currentY = 20;
                }

                // Medication card
                this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.BORDER);
                this.doc.setFillColor(...PDF_CONSTANTS.COLORS.WHITE);
                const cardHeight = 25;
                this.doc.roundedRect(15, currentY, pageWidth - 30, cardHeight, 2, 2, 'FD');

                // Medication number badge
                this.doc.setFillColor(...PDF_CONSTANTS.COLORS.BLUE_LIGHT);
                this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.BLUE_BORDER);
                this.doc.circle(20, currentY + 5, 2.5, 'FD');
                this.doc.setFontSize(8);
                this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
                this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
                this.doc.text((index + 1).toString(), 20, currentY + 6, { align: 'center' });

                // Medication name (bold)
                this.doc.setFontSize(10);
                this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
                this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
                this.doc.text(med.name, 27, currentY + 6);

                // Dosage, frequency, duration
                this.doc.setFontSize(9);
                this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
                this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
                const medInfo = `${med.dosage} - ${med.frequency} - ${med.duration}`;
                this.doc.text(medInfo, 27, currentY + 11);

                // Instructions
                this.doc.setFontSize(8);
                this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
                let instructions = med.instructions || 'Según indicación médica';
                if (med.via_administracion) {
                    instructions += ` | Vía: ${med.via_administracion}`;
                }
                if (med.quantity) {
                    instructions += ` | Cantidad: ${med.quantity}`;
                }
                const maxInstructionsWidth = pageWidth - 55;
                const instructionsLines = this.doc.splitTextToSize(instructions, maxInstructionsWidth);
                this.doc.text(instructionsLines[0], 27, currentY + 16);
                if (instructionsLines.length > 1) {
                    this.doc.text(instructionsLines[1], 27, currentY + 20);
                }

                currentY += cardHeight + 5;
            });
        } else {
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHTER);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'italic');
            this.doc.text('No se prescribieron medicamentos', 15, currentY);
            currentY += 10;
        }

        return currentY;
    }
}
