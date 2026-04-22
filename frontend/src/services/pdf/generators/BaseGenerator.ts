import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import {
    PatientInfo,
    DoctorInfo,
    ConsultationInfo,
    OfficeInfo,
    SignatureInfo
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
    protected signatureInfo: SignatureInfo | null = null;
    protected signatureQrDataUrl: string | null = null;

    constructor() {
        this.doc = new jsPDF();
    }

    /**
     * Attach electronic signature metadata so addFooter() can render the
     * verification block. Call before generate().
     */
    public setSignatureInfo(info: SignatureInfo | null | undefined): void {
        this.signatureInfo = info ?? null;
        this.signatureQrDataUrl = null; // reset; will be (re)generated on demand
    }

    /**
     * Pre-generates the QR code PNG data URL for the current signatureInfo.
     * Must be awaited before addFooter() since jsPDF.addImage is sync.
     * Concrete generators (PrescriptionGenerator, MedicalOrderGenerator) call
     * this inside their async generate() pipeline.
     */
    protected async prepareSignatureQr(): Promise<void> {
        if (!this.signatureInfo) {
            this.signatureQrDataUrl = null;
            return;
        }
        const url =
            this.signatureInfo.verification_url ||
            `https://cortex-backend-246017659362.us-central1.run.app/api/verify/${this.signatureInfo.verification_uuid}`;
        try {
            // High error correction + 400px bitmap keeps the QR scannable even
            // after print → scan → low-end phone cameras.
            this.signatureQrDataUrl = await QRCode.toDataURL(url, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: 400,
                color: { dark: '#000000', light: '#FFFFFF' },
            });
        } catch (err) {
            console.warn('QR generation failed, rendering signature block without QR', err);
            this.signatureQrDataUrl = null;
        }
    }

    /**
     * Draws the electronic signature verification block: hash, folio, and
     * public verification URL. Used in prescriptions and clinical study orders
     * per LGS Art. 240 / NOM-004. Called from addFooter when signatureInfo is set.
     */
    protected drawSignatureVerificationBlock(info: SignatureInfo, startY: number): void {
        const pageWidth = this.doc.internal.pageSize.width;
        const pageHeight = this.doc.internal.pageSize.height;
        // Vertical budget: professional seal ends around pageHeight - 55
        // (sealY + radius*2). Bottom line with "Generado el…" sits at
        // pageHeight - 28. Clamp so the legal notice (at y+19) lands at
        // pageHeight - 33 — leaves 5mm gap before the bottom line, and
        // 3mm above the seal.
        const y = Math.min(startY, pageHeight - 52);

        this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.BORDER);
        this.doc.setLineWidth(0.3);
        this.doc.line(15, y, pageWidth - 15, y);

        this.doc.setFontSize(8);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
        this.doc.text('Firmado electrónicamente', 15, y + 4);

        this.doc.setFontSize(7);
        this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
        const hashShort = (info.signature_hash || '').slice(0, 32);
        const signedAt = info.signed_at
            ? new Date(info.signed_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
            : '';
        this.doc.text(`Folio: ${info.verification_uuid}`, 15, y + 8);
        this.doc.text(`Hash SHA-256: ${hashShort}…`, 15, y + 11.5);
        if (signedAt) {
            this.doc.text(`Fecha: ${signedAt} (CDMX)`, 15, y + 15);
        }
        // Print verification URL textually only when we couldn't render a QR
        // (avoids redundancy and keeps the block tidy).
        if (info.verification_url && !this.signatureQrDataUrl) {
            this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
            this.doc.text(
                `Verificar: ${info.verification_url}`,
                pageWidth - 15,
                y + 4,
                { align: 'right' }
            );
        }

        // QR of the verification URL (if pre-generated via prepareSignatureQr()).
        // Size 20×20 mm at 400px bitmap → ~20 px/mm, enough for reliable phone-
        // camera scans of a 36-char UUID path with H-level error correction.
        // Anchored top-right so it doesn't overlap the professional seal on
        // its left, and ends ~2mm above the bottom line.
        if (this.signatureQrDataUrl) {
            try {
                const qrSize = 20;
                const qrX = pageWidth - 15 - qrSize;
                const qrY = y + 2;
                this.doc.addImage(
                    this.signatureQrDataUrl,
                    'PNG',
                    qrX,
                    qrY,
                    qrSize,
                    qrSize,
                    undefined,
                    'FAST'
                );
            } catch (err) {
                console.warn('Could not render QR in PDF', err);
            }
        }

        // Legal notice — firma electrónica simple según Art. 89-bis C. de Com.
        // Necesaria para que el receptor (farmacia, laboratorio, paciente)
        // sepa que no es firma electrónica avanzada (e.firma SAT) ni lleva
        // Constancia NOM-151-SCFI-2016. Fase 2 agregará FEA vía PSC.
        this.doc.setFontSize(6);
        this.doc.setTextColor(120, 120, 120);
        this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'italic');
        this.doc.text(
            'Firma electrónica simple conforme al Art. 89-bis del Código de Comercio. No constituye firma electrónica avanzada ni conservación NOM-151-SCFI-2016.',
            15,
            y + 19,
            { maxWidth: pageWidth - 30 }
        );
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
        const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
        if (age !== null) {
            this.doc.text(String(age), edadX, currentY);
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

        // Electronic signature verification block (below footer, above bottom line)
        if (this.signatureInfo) {
            this.drawSignatureVerificationBlock(this.signatureInfo, footerY + 6);
        }

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
