import jsPDF from 'jspdf';
import {
    PatientInfo,
    DoctorInfo,
    ConsultationInfo,
    OfficeInfo
} from '../../../types/pdf';
import { PDF_CONSTANTS } from '../constants';
import {
    getDoctorInitialsForPdf,
    resolveDoctorAvatarUrl,
    convertBlobToDataUrl,
    formatDateToDDMMYYYY,
    calculateAge
} from '../utils';

export class BasePDFGenerator {
    protected doc: jsPDF;
    protected avatarCache = new Map<string, string>();

    constructor() {
        this.doc = new jsPDF();
    }

    protected async loadDoctorAvatarDataUrl(doctor: DoctorInfo): Promise<string | null> {
        const resolvedUrl = resolveDoctorAvatarUrl(doctor);
        if (!resolvedUrl) {
            return null;
        }

        if (this.avatarCache.has(resolvedUrl)) {
            return this.avatarCache.get(resolvedUrl) as string;
        }

        try {
            const headers: Record<string, string> = {};
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(resolvedUrl, {
                headers,
                credentials: 'include'
            });
            if (!response.ok) {
                console.warn('No se pudo cargar el avatar para PDF:', {
                    status: response.status,
                    statusText: response.statusText
                });
                return null;
            }
            const blob = await response.blob();
            const dataUrl = await convertBlobToDataUrl(blob);
            this.avatarCache.set(resolvedUrl, dataUrl);
            return dataUrl;
        } catch (error) {
            console.warn('Error cargando avatar para PDF:', error);
            return null;
        }
    }

    protected async addHeader(
        patient: PatientInfo,
        doctor: DoctorInfo,
        consultation: ConsultationInfo,
        officeInfo?: OfficeInfo
    ): Promise<number> {
        const pageWidth = this.doc.internal.pageSize.width;
        let currentY = PDF_CONSTANTS.LAYOUT.MARGIN_X;

        // === HEADER TOP SECTION ===
        // Doctor avatar (left)
        const avatarRadius = 7.5;
        const avatarCenterX = 22.5;
        const avatarCenterY = currentY + avatarRadius;
        const doctorInitials = getDoctorInitialsForPdf(doctor);
        const avatarDiameter = avatarRadius * 2;
        const avatarTopLeftX = avatarCenterX - avatarRadius;
        const avatarTopLeftY = avatarCenterY - avatarRadius;
        const avatarDataUrl = await this.loadDoctorAvatarDataUrl(doctor);

        if (avatarDataUrl) {
            try {
                this.doc.addImage(
                    avatarDataUrl,
                    'PNG',
                    avatarTopLeftX,
                    avatarTopLeftY,
                    avatarDiameter,
                    avatarDiameter,
                    undefined,
                    'FAST'
                );
                this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.PRIMARY);
                this.doc.setLineWidth(0.6);
                this.doc.circle(avatarCenterX, avatarCenterY, avatarRadius, 'S');
            } catch (error) {
                this.drawInitialsAvatar(avatarCenterX, avatarCenterY, avatarRadius, doctorInitials);
            }
        } else {
            this.drawInitialsAvatar(avatarCenterX, avatarCenterY, avatarRadius, doctorInitials);
        }

        // Doctor information (center-left)
        const doctorInfoStartX = 35;
        let doctorY = currentY + 3;

        // Doctor title and name
        this.doc.setFontSize(11);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        const doctorFullName = doctor.name || 'Médico';
        this.doc.text(`${doctor.title || 'Dr.'} ${doctorFullName}`, doctorInfoStartX, doctorY);

        doctorY += 5;

        // Specialty
        if (doctor.specialty) {
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            this.doc.text(doctor.specialty, doctorInfoStartX, doctorY);
            doctorY += 4;
        }

        // Professional license
        if (doctor.license) {
            this.doc.setFontSize(8);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            this.doc.text(`Cédula Profesional: ${doctor.license}`, doctorInfoStartX, doctorY);
            doctorY += 4;
        }

        // University
        if (doctor.university) {
            this.doc.setFontSize(8);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            const maxUniversityWidth = pageWidth - doctorInfoStartX - 40;
            const universityLines = this.doc.splitTextToSize(`Universidad: ${doctor.university}`, maxUniversityWidth);
            universityLines.forEach((line: string, index: number) => {
                this.doc.text(line, doctorInfoStartX, doctorY + (index * 3.5));
            });
            doctorY += universityLines.length * 3.5;
        }

        // === CONTACT INFORMATION (Right side of header) ===
        const contactIconX = pageWidth - 60;
        const contactTextX = contactIconX + 5;
        let headerContactY = currentY + 3;

        this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHTER);

        this.doc.setFontSize(8);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');

        // Address
        if (officeInfo && !officeInfo.is_virtual) {
            const addressParts: string[] = [];

            if (officeInfo.address) addressParts.push(officeInfo.address);
            if (officeInfo.city) addressParts.push(officeInfo.city);
            if (officeInfo.state || officeInfo.state_name) {
                addressParts.push(officeInfo.state || officeInfo.state_name || '');
            }
            if (officeInfo.country_name && officeInfo.country_name !== 'México') {
                addressParts.push(officeInfo.country_name);
            }

            if (addressParts.length === 0 && officeInfo.name) {
                addressParts.push(officeInfo.name);
            }

            if (addressParts.length > 0) {
                // Location icon
                this.doc.setLineWidth(0.4);
                this.doc.circle(contactIconX + 1.3, headerContactY - 1.2, 1.3, 'S');
                this.doc.circle(contactIconX + 1.3, headerContactY - 1.2, 0.5, 'F');

                const addressText = addressParts.join(', ');
                const maxAddressWidth = 45;
                const addressLines = this.doc.splitTextToSize(addressText, maxAddressWidth);
                this.doc.text(addressLines[0], contactTextX, headerContactY);
                if (addressLines.length > 1) {
                    headerContactY += 3.5;
                    this.doc.text(addressLines[1], contactTextX, headerContactY);
                }
                headerContactY += 4;
            }
        }

        // Phone
        const phoneNumber = officeInfo?.phone || doctor.phone;
        if (phoneNumber) {
            // Phone icon
            this.doc.setLineWidth(0.4);
            this.doc.circle(contactIconX + 1, headerContactY - 1, 1.2, 'S');
            this.doc.line(contactIconX + 0.3, headerContactY - 1.5, contactIconX + 0.8, headerContactY - 0.8);
            this.doc.line(contactIconX + 1.2, headerContactY - 0.2, contactIconX + 1.7, headerContactY - 0.5);

            this.doc.text(phoneNumber, contactTextX, headerContactY);
            headerContactY += 4;
        }

        // Email
        if (doctor.email) {
            // Email icon
            this.doc.setLineWidth(0.4);
            this.doc.rect(contactIconX - 0.2, headerContactY - 2.5, 3, 2);
            this.doc.line(contactIconX - 0.2, headerContactY - 2.5, contactIconX + 1.3, headerContactY - 1);
            this.doc.line(contactIconX + 2.8, headerContactY - 2.5, contactIconX + 1.3, headerContactY - 1);

            const maxEmailWidth = 45;
            const emailLines = this.doc.splitTextToSize(doctor.email, maxEmailWidth);
            this.doc.text(emailLines[0], contactTextX, headerContactY);
            if (emailLines.length > 1) {
                headerContactY += 3.5;
                this.doc.text(emailLines[1], contactTextX, headerContactY);
            }
            headerContactY += 4;
        }

        currentY = Math.max(currentY + 25, headerContactY + 5);

        // === PATIENT INFORMATION SECTION ===
        // Add separator line
        this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.BORDER);
        this.doc.setLineWidth(0.5);
        this.doc.line(15, currentY, pageWidth - 15, currentY);
        currentY += 8;

        // Patient Name
        this.doc.setFontSize(9);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
        this.doc.text('Nombre del Paciente', 15, currentY);

        currentY += 5;

        // Patient name value
        this.doc.setFontSize(10);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
        const patientFullName = patient.name || 'Paciente';
        this.doc.text(patientFullName, 15, currentY);

        currentY += 5;

        const identificationType =
            patient.identificationType ||
            consultation.patient_document_name ||
            '';
        const identificationValue =
            patient.identificationValue ||
            consultation.patient_document_value ||
            '';

        if (identificationValue) {
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            this.doc.text('Identificación', 15, currentY);

            currentY += 5;

            this.doc.setFontSize(10);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            const identificationLine = identificationType
                ? `${identificationType}: ${identificationValue}`
                : identificationValue;
            const maxIdentificationWidth = pageWidth - 30;
            const identificationLines = this.doc.splitTextToSize(identificationLine, maxIdentificationWidth);
            identificationLines.forEach((line: string, index: number) => {
                this.doc.text(line, 15, currentY + (index * 4.5));
            });
            currentY += identificationLines.length * 4.5;
        }

        currentY += 3;

        // Second row: Fecha y Edad
        const edadX = pageWidth / 2 + 20;

        // Fecha (left side)
        this.doc.setFontSize(9);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.text('Fecha', 15, currentY);

        // Edad (right side)
        this.doc.text('Edad', edadX, currentY);

        currentY += 5;

        // Date value (left side)
        this.doc.setFontSize(10);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        const formattedDate = formatDateToDDMMYYYY(consultation.date);
        this.doc.text(formattedDate, 15, currentY);

        // Age value (right side)
        const ageText = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : '';
        if (ageText) {
            this.doc.text(ageText, edadX, currentY);
        }

        // Folio next to date if available
        if (consultation.folio) {
            const folioX = pageWidth - 60;
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
            this.doc.text('Folio', folioX, currentY - 5);
            this.doc.setFontSize(10);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
            this.doc.text(consultation.folio, folioX, currentY);
        }

        currentY += 5;

        const vitalSignsEntries = [
            { label: 'Estatura', value: patient.height },
            { label: 'Peso', value: patient.weight },
            { label: 'Temperatura', value: patient.temperature },
            { label: 'F.C.', value: patient.heartRate },
            { label: 'F.R.', value: patient.respiratoryRate },
            { label: 'IMC', value: patient.bmi }
        ].filter(entry => entry.value && entry.value.trim() !== '');

        if (vitalSignsEntries.length > 0) {
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            this.doc.text('Signos vitales', 15, currentY);

            currentY += 5;

            this.doc.setFontSize(10);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');

            const leftColumnX = 15;
            const rightColumnX = pageWidth / 2 + 20;
            const rowHeight = 5;

            vitalSignsEntries.forEach((entry, index) => {
                const column = index % 2;
                const row = Math.floor(index / 2);
                const textX = column === 0 ? leftColumnX : rightColumnX;
                const textY = currentY + row * rowHeight;
                this.doc.text(`${entry.label}: ${entry.value}`, textX, textY);
            });

            const totalRows = Math.ceil(vitalSignsEntries.length / 2);
            currentY += totalRows * rowHeight + 5;
        }

        // === DIAGNOSIS SECTION ===
        this.doc.setFontSize(9);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.text('Diagnóstico', 15, currentY);

        currentY += 5;

        // Diagnosis box
        this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.BORDER);
        this.doc.setFillColor(...PDF_CONSTANTS.COLORS.BACKGROUND_LIGHT);
        const diagnosisBoxHeight = 12;
        this.doc.roundedRect(15, currentY, pageWidth - 30, diagnosisBoxHeight, 2, 2, 'FD');

        // Diagnosis text
        this.doc.setFontSize(10);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        const diagnosis = consultation.diagnosis || 'No especificado';
        const maxDiagnosisWidth = pageWidth - 50;
        const diagnosisLines = this.doc.splitTextToSize(diagnosis, maxDiagnosisWidth);
        this.doc.text(diagnosisLines[0], 18, currentY + 7);

        currentY += diagnosisBoxHeight + 10;

        return currentY;
    }

    protected addFooter(
        doctor: DoctorInfo,
        consultation: ConsultationInfo,
        startY: number,
        options: { includeTreatmentPlan?: boolean; drawBottomLine?: boolean; includeGenerationInfo?: boolean } = {}
    ): void {
        const pageHeight = this.doc.internal.pageSize.height;
        const pageWidth = this.doc.internal.pageSize.width;
        const includeTreatmentPlan = options.includeTreatmentPlan ?? true;
        const drawBottomLine = options.drawBottomLine ?? true;
        const includeGenerationInfo = options.includeGenerationInfo ?? true;

        let footerY = startY + 5;

        // === OBSERVATIONS SECTION ===
        if (consultation.notes) {
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
            this.doc.text('Observaciones', 15, footerY);

            footerY += 5;

            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            const maxWidth = pageWidth - 30;
            const notesLines = this.doc.splitTextToSize(consultation.notes, maxWidth);
            notesLines.slice(0, 3).forEach((line: string) => {
                this.doc.text(line, 15, footerY);
                footerY += 4;
            });

            footerY += 5;
        }

        if (includeTreatmentPlan) {
            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
            this.doc.text('Plan de tratamiento', 15, footerY);

            footerY += 5;

            this.doc.setFontSize(9);
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
            this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
            const treatmentPlanText = (consultation.treatment_plan || '').trim();
            const treatmentPlanLines = this.doc.splitTextToSize(
                treatmentPlanText !== '' ? treatmentPlanText : '—',
                pageWidth - 30
            );
            treatmentPlanLines.forEach((line: string) => {
                this.doc.text(line, 15, footerY);
                footerY += 4;
            });

            footerY += 5;
        }

        // === DOCTOR SIGNATURE SECTION ===
        footerY = pageHeight - 80;

        // Signature line
        const signatureLineY = footerY + 18;
        this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHTER);
        this.doc.setLineWidth(0.5);
        this.doc.line(15, signatureLineY, 100, signatureLineY);

        // Doctor info below signature
        footerY = signatureLineY + 5;

        this.doc.setFontSize(9);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        const doctorNameForFooter = doctor.name || 'Médico';
        this.doc.text(`${doctor.title || 'Dr.'} ${doctorNameForFooter}`, 15, footerY);

        footerY += 4;

        this.doc.setFontSize(8);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
        if (doctor.specialty) {
            this.doc.text(doctor.specialty, 15, footerY);
            footerY += 3.5;
        }
        if (doctor.license) {
            this.doc.text(`Cédula Profesional: ${doctor.license}`, 15, footerY);
        }

        // Professional seal (right side)
        const sealX = pageWidth - 60;
        const sealY = signatureLineY - 15;

        this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.setLineWidth(1);
        this.doc.circle(sealX + 15, sealY + 10, 12, 'S');

        this.doc.setFontSize(7);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text('Sello', sealX + 15, sealY + 9, { align: 'center' });
        this.doc.text('Profesional', sealX + 15, sealY + 13, { align: 'center' });

        if (drawBottomLine) {
            const bottomMargin = 28;
            const bottomLineY = pageHeight - bottomMargin;
            this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.BORDER);
            this.doc.setLineWidth(0.5);
            this.doc.line(15, bottomLineY, pageWidth - 15, bottomLineY);

            if (includeGenerationInfo) {
                this.doc.setFontSize(8);
                this.doc.setTextColor(100, 100, 100);
                this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
                const infoY = bottomLineY + 4;
                const now = new Date();
                const dateStr = now.toLocaleDateString('es-MX');
                const timeStr = now.toLocaleTimeString('es-MX');
                this.doc.text(`Generado el ${dateStr} a las ${timeStr}`, 15, infoY);
                this.doc.text('Página 1', pageWidth - 15, infoY, { align: 'right' });
            }
        }
    }

    private drawInitialsAvatar(x: number, y: number, radius: number, initials: string) {
        this.doc.setFillColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.circle(x, y, radius, 'F');
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.WHITE);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.setFontSize(initials.length > 2 ? 8 : 9);
        this.doc.text(initials, x, y + 0.5, {
            align: 'center',
            baseline: 'middle'
        } as any);
    }

    public save(filename: string) {
        this.doc.save(filename);
    }
}
