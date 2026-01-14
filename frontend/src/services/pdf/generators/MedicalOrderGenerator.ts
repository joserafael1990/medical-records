import autoTable from 'jspdf-autotable';
import { BasePDFGenerator } from './BaseGenerator';
import {
    PatientInfo,
    DoctorInfo,
    ConsultationInfo,
    StudyInfo,
    OfficeInfo
} from '../../../types/pdf';
import { PDF_CONSTANTS } from '../constants';

export class MedicalOrderGenerator extends BasePDFGenerator {
    async generate(
        patient: PatientInfo,
        doctor: DoctorInfo,
        consultation: ConsultationInfo,
        studies: StudyInfo[],
        officeInfo?: OfficeInfo
    ): Promise<void> {
        const pageWidth = this.doc.internal.pageSize.width;

        // Add header
        let currentY = await this.addHeader(patient, doctor, consultation, officeInfo);

        // Add document title
        this.doc.setFontSize(14);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text('ORDEN DE ESTUDIOS MÉDICOS', pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;

        // Add studies section
        this.doc.setFontSize(10);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text('ESTUDIOS SOLICITADOS', 20, currentY);
        currentY += 6;

        const studyData = studies.map((study, index) => [
            index + 1,
            study.name,
            study.type,
            study.urgency || 'Normal',
            study.instructions || 'Ninguna'
        ]);

        autoTable(this.doc, {
            startY: currentY,
            head: [['#', 'Estudio', 'Tipo', 'Urgencia', 'Instrucciones']],
            body: studyData,
            theme: 'grid',
            headStyles: {
                fillColor: PDF_CONSTANTS.COLORS.PRIMARY,
                textColor: PDF_CONSTANTS.COLORS.WHITE,
                fontSize: 8
            },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 60 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25 },
                4: { cellWidth: 45 }
            },
            margin: { left: 20, right: 20, bottom: 35 },
            tableLineWidth: 0.1,
            tableLineColor: [200, 200, 200],
            didDrawPage: (data: any) => {
                // Add footer on each page
                this.addPageFooter(data.pageNumber);
            }
        });

        const finalY = (this.doc as any).lastAutoTable.finalY || currentY + (studies.length * 10) + 20;
        currentY = finalY + 6;

        // Add notes if any
        if (consultation.notes && consultation.notes.trim()) {
            this.doc.setFontSize(10);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
            this.doc.text('NOTAS ADICIONALES', 20, currentY);
            currentY += 6;

            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');

            const maxWidth = pageWidth - 40;
            const notesLines = this.doc.splitTextToSize(consultation.notes, maxWidth);
            notesLines.forEach((line: string) => {
                this.doc.text(line, 20, currentY);
                currentY += 5;
            });
        }

        this.addFooter(doctor, consultation, currentY, {
            includeTreatmentPlan: false,
            drawBottomLine: false,
            includeGenerationInfo: false
        });

        // Save the PDF
        const patientNameForOrderFile = patient.name ? patient.name.replace(/\s+/g, '_') : 'Paciente';
        const fileName = `Orden-Medica_${patientNameForOrderFile}_${consultation.date.replace(/\//g, '-')}.pdf`;
        this.save(fileName);
    }

    private addPageFooter(pageNumber: number): void {
        const pageHeight = this.doc.internal.pageSize.height;

        // Add footer line
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setLineWidth(0.5);
        this.doc.line(20, pageHeight - 30, 190, pageHeight - 30);

        // Add footer text
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');

        const footerTextY = pageHeight - 20;
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-MX');
        const timeStr = now.toLocaleTimeString('es-MX');

        this.doc.text(`Generado el ${dateStr} a las ${timeStr}`, 20, footerTextY);
        this.doc.text(`Página ${pageNumber}`, 190, footerTextY, { align: 'right' });
    }
}
