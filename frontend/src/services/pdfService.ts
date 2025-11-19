import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_CONFIG } from '../constants';
import { apiService } from './api';

export interface PatientInfo {
  id: number;
  name: string;
  title?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  height?: string;
  weight?: string;
  temperature?: string;
  heartRate?: string;
  respiratoryRate?: string;
  bmi?: string;
  identificationType?: string;
  identificationValue?: string;
}

export interface DoctorInfo {
  id: number;
  name: string;
  title?: string;
  specialty?: string;
  license?: string;
  university?: string;
  phone?: string;
  email?: string;
  onlineConsultationUrl?: string;
  offices?: OfficeInfo[];
  avatarType?: 'initials' | 'preloaded' | 'custom';
  avatarTemplateKey?: string | null;
  avatarFilePath?: string | null;
  avatarUrl?: string;
  avatar_url?: string;
  avatar?: {
    type?: 'initials' | 'preloaded' | 'custom';
    templateKey?: string | null;
    filePath?: string | null;
    url?: string;
    avatar_url?: string;
  };
}

export interface OfficeInfo {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  state_name?: string;
  country?: string;
  country_name?: string;
  phone?: string;
  mapsUrl?: string;
  is_virtual?: boolean;
}

export interface MedicationInfo {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  via_administracion?: string;
}

export interface StudyInfo {
  name: string;
  type: string;
  category?: string;
  description?: string;
  instructions?: string;
  urgency?: string;
}

export interface ConsultationInfo {
  id: number;
  date: string;
  time?: string;
  type?: string;
  reason?: string;
  diagnosis?: string;
  prescribed_medications?: string;
  notes?: string;
  treatment_plan?: string;
  folio?: string;
  folioNumber?: number;
  folioCreatedAt?: string | null;
  nextAppointmentDate?: string | null;
  patient_document_id?: number | null;
  patient_document_value?: string;
  patient_document_name?: string;
}

export interface CertificateInfo {
  content: string;
  title?: string;
}

class PDFService {
  private avatarCache = new Map<string, string>();

  private formatDateToDDMMYYYY(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      const formatted = `${day}-${month}-${year}`;
      return formatted;
    } catch (error) {
      console.warn('Error formatting date:', error);
      return dateString;
    }
  }

  private calculateAge(dateOfBirth: string): string {
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return `${age} años`;
    } catch (error) {
      return 'No especificada';
    }
  }

  private formatDateToLongFormat(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }

      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting long date:', error);
      return '';
    }
  }

  private selectBestOfficeForPDF(offices: OfficeInfo[]): OfficeInfo | null {
    if (!offices || offices.length === 0) return null;
    
    // Prefer non-virtual offices
    const presentialOffices = offices.filter(office => !office.is_virtual);
    
    if (presentialOffices.length > 0) {
      return presentialOffices[0];
    }
    
    // If all offices are virtual, return the first one
    return offices[0];
  }

  private getDoctorInitialsForPdf(doctor: DoctorInfo): string {
    const nameSource = doctor?.name?.trim();
    if (!nameSource) {
      return 'DR';
    }

    const initials = nameSource
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();

    return initials || 'DR';
  }

  private resolveDoctorAvatarUrl(doctor: DoctorInfo): string | undefined {
    // If avatar type is 'initials', don't try to load an image
    const avatarType = doctor.avatarType || doctor.avatar?.type || 'initials';
    if (avatarType === 'initials') {
      return undefined;
    }

    // Try to get URL from various possible locations
    const url =
      doctor.avatar?.url ||
      doctor.avatar?.avatar_url ||
      doctor.avatarUrl ||
      doctor.avatar_url;
    
    if (!url) {
      return undefined;
    }
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    
    // Convert static file URLs to API endpoints for CORS support
    // Preloaded avatars: /static/doctor_avatars/preloaded/{filename} -> /api/avatars/preloaded/{filename}
    if (normalizedPath.startsWith('/static/doctor_avatars/preloaded/')) {
      const filename = normalizedPath.replace('/static/doctor_avatars/preloaded/', '');
      return `${API_CONFIG.BASE_URL}/api/avatars/preloaded/${filename}`;
    }
    
    // Custom avatars: /uploads/doctor_avatars/{doctor_id}/{filename} -> /api/avatars/custom/{doctor_id}/{filename}
    if (normalizedPath.startsWith('/uploads/doctor_avatars/')) {
      const pathAfterUploads = normalizedPath.replace('/uploads/doctor_avatars/', '');
      // pathAfterUploads should be like "123/filename.png"
      return `${API_CONFIG.BASE_URL}/api/avatars/custom/${pathAfterUploads}`;
    }
    
    return `${API_CONFIG.BASE_URL}${normalizedPath}`;
  }

  private async loadDoctorAvatarDataUrl(doctor: DoctorInfo): Promise<string | null> {
    const resolvedUrl = this.resolveDoctorAvatarUrl(doctor);
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
      const dataUrl = await this.convertBlobToDataUrl(blob);
      this.avatarCache.set(resolvedUrl, dataUrl);
      return dataUrl;
    } catch (error) {
      console.warn('Error cargando avatar para PDF:', error);
      return null;
    }
  }

  private convertBlobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }


  /**
   * Add minimalist modern header inspired by the provided design
   */
  private async addModernPrescriptionHeader(
    doc: jsPDF, 
    patient: PatientInfo, 
    doctor: DoctorInfo, 
    consultation: ConsultationInfo,
    officeInfo?: OfficeInfo
  ): Promise<number> {
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 15;

    // === HEADER TOP SECTION ===
    // Doctor avatar (left) - same style as UI avatar
    const avatarRadius = 7.5;
    const avatarCenterX = 22.5;
    const avatarCenterY = currentY + avatarRadius;
    const doctorInitials = this.getDoctorInitialsForPdf(doctor);
    const avatarDiameter = avatarRadius * 2;
    const avatarTopLeftX = avatarCenterX - avatarRadius;
    const avatarTopLeftY = avatarCenterY - avatarRadius;
    const avatarDataUrl = await this.loadDoctorAvatarDataUrl(doctor);

    if (avatarDataUrl) {
      try {
        doc.addImage(
          avatarDataUrl,
          'PNG',
          avatarTopLeftX,
          avatarTopLeftY,
          avatarDiameter,
          avatarDiameter,
          undefined,
          'FAST'
        );
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.6);
        doc.circle(avatarCenterX, avatarCenterY, avatarRadius, 'S');
      } catch (error) {
        console.warn('Fallo al dibujar avatar en PDF, usando iniciales.', error);
        doc.setFillColor(37, 99, 235); // Blue-600
        doc.circle(avatarCenterX, avatarCenterY, avatarRadius, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(doctorInitials.length > 2 ? 8 : 9);
        doc.text(doctorInitials, avatarCenterX, avatarCenterY + 0.5, {
          align: 'center',
          baseline: 'middle'
        } as any);
      }
    } else {
      doc.setFillColor(37, 99, 235); // Blue-600
      doc.circle(avatarCenterX, avatarCenterY, avatarRadius, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(doctorInitials.length > 2 ? 8 : 9);
      doc.text(doctorInitials, avatarCenterX, avatarCenterY + 0.5, {
        align: 'center',
        baseline: 'middle'
      } as any);
    }
    
    // Doctor information (center-left)
    const doctorInfoStartX = 35;
    let doctorY = currentY + 3;
    
    // Doctor title and name
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const doctorFullName = doctor.name || 'Médico';
    doc.text(`${doctor.title || 'Dr.'} ${doctorFullName}`, doctorInfoStartX, doctorY);
    
    doctorY += 5;
    
    // Specialty
    if (doctor.specialty) {
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99); // Gray-600
      doc.setFont('helvetica', 'normal');
      doc.text(doctor.specialty, doctorInfoStartX, doctorY);
      doctorY += 4;
    }
    
    // Professional license
    if (doctor.license) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.setFont('helvetica', 'normal');
      doc.text(`Cédula Profesional: ${doctor.license}`, doctorInfoStartX, doctorY);
      doctorY += 4;
    }

    // University
    if (doctor.university) {
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // Gray-500
      doc.setFont('helvetica', 'normal');
      const maxUniversityWidth = pageWidth - doctorInfoStartX - 40;
      const universityLines = doc.splitTextToSize(`Universidad: ${doctor.university}`, maxUniversityWidth);
      universityLines.forEach((line, index) => {
        doc.text(line, doctorInfoStartX, doctorY + (index * 3.5));
      });
      doctorY += universityLines.length * 3.5;
    }

    // === CONTACT INFORMATION (Right side of header) ===
    const contactIconX = pageWidth - 60;
    const contactTextX = contactIconX + 5;
    let headerContactY = currentY + 3;
    
    doc.setDrawColor(156, 163, 175); // Gray-400

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.setFont('helvetica', 'normal');
    
    // Phone
    const phoneNumber = officeInfo?.phone || doctor.phone;
    if (phoneNumber) {
      // Phone icon
      doc.setLineWidth(0.4);
      doc.circle(contactIconX + 1, headerContactY - 1, 1.2, 'S');
      doc.line(contactIconX + 0.3, headerContactY - 1.5, contactIconX + 0.8, headerContactY - 0.8);
      doc.line(contactIconX + 1.2, headerContactY - 0.2, contactIconX + 1.7, headerContactY - 0.5);
      
      doc.text(phoneNumber, contactTextX, headerContactY);
      headerContactY += 4;
    }
    
    // Email
    if (doctor.email) {
      // Email icon
      doc.setLineWidth(0.4);
      doc.rect(contactIconX - 0.2, headerContactY - 2.5, 3, 2);
      doc.line(contactIconX - 0.2, headerContactY - 2.5, contactIconX + 1.3, headerContactY - 1);
      doc.line(contactIconX + 2.8, headerContactY - 2.5, contactIconX + 1.3, headerContactY - 1);
      
      const maxEmailWidth = 45;
      const emailLines = doc.splitTextToSize(doctor.email, maxEmailWidth);
      doc.text(emailLines[0], contactTextX, headerContactY);
      if (emailLines.length > 1) {
        headerContactY += 3.5;
        doc.text(emailLines[1], contactTextX, headerContactY);
      }
      headerContactY += 4;
    }
    
    // Address
    if (officeInfo) {
      const addressParts: string[] = [];
      if (officeInfo.address) addressParts.push(officeInfo.address);
      if (officeInfo.city) addressParts.push(officeInfo.city);
      if (officeInfo.state || officeInfo.state_name) addressParts.push(officeInfo.state || officeInfo.state_name);
      
      if (addressParts.length > 0) {
        // Location icon
        doc.setLineWidth(0.4);
        doc.circle(contactIconX + 1.3, headerContactY - 1.2, 1.3, 'S');
        doc.circle(contactIconX + 1.3, headerContactY - 1.2, 0.5, 'F');
        
        const addressText = addressParts.join(', ');
        const maxAddressWidth = 45;
        const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);
        doc.text(addressLines[0], contactTextX, headerContactY);
        if (addressLines.length > 1) {
          headerContactY += 3.5;
          doc.text(addressLines[1], contactTextX, headerContactY);
        }
        headerContactY += 4;
      }
    }

    currentY = Math.max(currentY + 25, headerContactY + 5);

    // === PATIENT INFORMATION SECTION ===
    const labelColor: [number, number, number] = [37, 99, 235]; // Blue-600
    const valueColor: [number, number, number] = [0, 0, 0]; // Black

    // Add separator line
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setLineWidth(0.5);
    doc.line(15, currentY, pageWidth - 15, currentY);
    currentY += 8;

    // Patient Name
    doc.setFontSize(9);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Nombre del Paciente', 15, currentY);
    
    currentY += 5;
    
    // Patient name value
    doc.setFontSize(10);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.setFont('helvetica', 'normal');
    const patientFullName = patient.name || 'Paciente';
    doc.text(patientFullName, 15, currentY);
    
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
      doc.setFontSize(9);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Identificación', 15, currentY);
      
      currentY += 5;

      doc.setFontSize(10);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      doc.setFont('helvetica', 'normal');
      const identificationLine = identificationType
        ? `${identificationType}: ${identificationValue}`
        : identificationValue;
      const maxIdentificationWidth = pageWidth - 30;
      const identificationLines = doc.splitTextToSize(identificationLine, maxIdentificationWidth);
      identificationLines.forEach((line: string, index: number) => {
        doc.text(line, 15, currentY + (index * 4.5));
      });
      currentY += identificationLines.length * 4.5;
    }

    currentY += 3;

    // Second row: Fecha y Edad
    const edadX = pageWidth / 2 + 20;
    
    // Fecha (left side)
    doc.setFontSize(9);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('Fecha', 15, currentY);
    
    // Edad (right side)
    doc.text('Edad', edadX, currentY);
    
    currentY += 5;
    
    // Date value (left side)
    doc.setFontSize(10);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    const formattedDate = this.formatDateToDDMMYYYY(consultation.date);
    doc.text(formattedDate, 15, currentY);
    
    // Age value (right side)
    const ageText = patient.dateOfBirth ? this.calculateAge(patient.dateOfBirth) : '';
    if (ageText) {
      doc.text(ageText, edadX, currentY);
    }
    
    // Folio next to date if available
    if (consultation.folio) {
      const folioX = pageWidth - 60;
      doc.setFontSize(9);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.text('Folio', folioX, currentY - 5);
      doc.setFontSize(10);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      doc.text(consultation.folio, folioX, currentY);
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
      doc.setFontSize(9);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.text('Signos vitales', 15, currentY);

      currentY += 5;

      doc.setFontSize(10);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      doc.setFont('helvetica', 'normal');

      const leftColumnX = 15;
      const rightColumnX = pageWidth / 2 + 20;
      const rowHeight = 5;

      vitalSignsEntries.forEach((entry, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const textX = column === 0 ? leftColumnX : rightColumnX;
        const textY = currentY + row * rowHeight;
        doc.text(`${entry.label}: ${entry.value}`, textX, textY);
      });

      const totalRows = Math.ceil(vitalSignsEntries.length / 2);
      currentY += totalRows * rowHeight + 5;
    }

    // === DIAGNOSIS SECTION ===
    doc.setFontSize(9);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('Diagnóstico', 15, currentY);
    
    currentY += 5;
    
    // Diagnosis box
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setFillColor(249, 250, 251); // Gray-50
    const diagnosisBoxHeight = 12;
    doc.roundedRect(15, currentY, pageWidth - 30, diagnosisBoxHeight, 2, 2, 'FD');
    
    // Diagnosis text
    doc.setFontSize(10);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    const diagnosis = consultation.diagnosis || 'No especificado';
    const maxDiagnosisWidth = pageWidth - 50;
    const diagnosisLines = doc.splitTextToSize(diagnosis, maxDiagnosisWidth);
    doc.text(diagnosisLines[0], 18, currentY + 7);
    
    currentY += diagnosisBoxHeight + 10;

    return currentY;
  }

  /**
   * Add prescription medications section with Rx icon
   */
  private addModernMedicationsSection(
    doc: jsPDF,
    medications: MedicationInfo[],
    startY: number
  ): number {
    const pageWidth = doc.internal.pageSize.width;
    let currentY = startY;

    // === PRESCRIPTION HEADER ===
    // Rx icon background
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.circle(20, currentY + 3, 4, 'F');
    
    // Rx text
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Rx', 17.5, currentY + 5);
    
    // Section title
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.setFont('helvetica', 'bold');
    doc.text('PRESCRIPCIÓN MÉDICA', 30, currentY + 5);
    
    currentY += 15;

    // === MEDICATIONS LIST ===
    if (medications && medications.length > 0) {
      medications.forEach((med, index) => {
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        // Medication card
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.setFillColor(255, 255, 255);
        const cardHeight = 25;
        doc.roundedRect(15, currentY, pageWidth - 30, cardHeight, 2, 2, 'FD');
        
        // Medication number badge
        doc.setFillColor(239, 246, 255); // Blue-50
        doc.setDrawColor(191, 219, 254); // Blue-200
        doc.circle(20, currentY + 5, 2.5, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235); // Blue-600
        doc.setFont('helvetica', 'bold');
        doc.text((index + 1).toString(), 20, currentY + 6, { align: 'center' });
        
        // Medication name (bold)
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(med.name, 27, currentY + 6);
        
        // Dosage, frequency, duration
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99); // Gray-600
        doc.setFont('helvetica', 'normal');
        const medInfo = `${med.dosage} - ${med.frequency} - ${med.duration}`;
        doc.text(medInfo, 27, currentY + 11);
        
        // Instructions
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128); // Gray-500
        let instructions = med.instructions || 'Según indicación médica';
        if (med.via_administracion) {
          instructions += ` | Vía: ${med.via_administracion}`;
        }
        if (med.quantity) {
          instructions += ` | Cantidad: ${med.quantity}`;
        }
        const maxInstructionsWidth = pageWidth - 55;
        const instructionsLines = doc.splitTextToSize(instructions, maxInstructionsWidth);
        doc.text(instructionsLines[0], 27, currentY + 16);
        if (instructionsLines.length > 1) {
          doc.text(instructionsLines[1], 27, currentY + 20);
        }
        
        currentY += cardHeight + 5;
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175); // Gray-400
      doc.setFont('helvetica', 'italic');
      doc.text('No se prescribieron medicamentos', 15, currentY);
      currentY += 10;
    }

    return currentY;
  }

  /**
   * Add footer with doctor signature and seal
   */
  private addModernPrescriptionFooter(
    doc: jsPDF,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    startY: number,
    options: { includeTreatmentPlan?: boolean; drawBottomLine?: boolean; includeGenerationInfo?: boolean } = {}
  ): void {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const includeTreatmentPlan = options.includeTreatmentPlan ?? true;
    const drawBottomLine = options.drawBottomLine ?? true;
    const includeGenerationInfo = options.includeGenerationInfo ?? true;
    
    // Start position: if there's content above (medications), start immediately after with minimal spacing
    // Otherwise, position at bottom of page
    let footerY = startY + 5; // Minimal spacing (5 points) after medications
    
    // === OBSERVATIONS SECTION ===
    if (consultation.notes) {
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones', 15, footerY);
      
      footerY += 5;
      
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99); // Gray-600
      doc.setFont('helvetica', 'normal');
      const maxWidth = pageWidth - 30;
      const notesLines = doc.splitTextToSize(consultation.notes, maxWidth);
      notesLines.slice(0, 3).forEach((line: string) => {
        doc.text(line, 15, footerY);
        footerY += 4;
      });
      
      footerY += 5; // Reduced spacing after observations
    }

    if (includeTreatmentPlan) {
    // === TREATMENT PLAN SECTION ===
    // Start immediately after medications/observations with minimal spacing
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.setFont('helvetica', 'bold');
    doc.text('Plan de tratamiento', 15, footerY);

    footerY += 5;

    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.setFont('helvetica', 'normal');
    const treatmentPlanText = (consultation.treatment_plan || '').trim();
    const treatmentPlanLines = doc.splitTextToSize(
      treatmentPlanText !== '' ? treatmentPlanText : '—',
      pageWidth - 30
    );
    treatmentPlanLines.forEach((line: string) => {
      doc.text(line, 15, footerY);
      footerY += 4;
    });

    footerY += 5; // Reduced spacing after treatment plan
    }

    // === DOCTOR SIGNATURE SECTION ===
    footerY = pageHeight - 80;
    
    // Signature line
    const signatureLineY = footerY + 18;
    doc.setDrawColor(156, 163, 175); // Gray-400
    doc.setLineWidth(0.5);
    doc.line(15, signatureLineY, 100, signatureLineY);
    
    // Doctor info below signature
    footerY = signatureLineY + 5;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const doctorNameForFooter = doctor.name || 'Médico';
    doc.text(`${doctor.title || 'Dr.'} ${doctorNameForFooter}`, 15, footerY);
    
    footerY += 4;
    
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.setFont('helvetica', 'normal');
    if (doctor.specialty) {
      doc.text(doctor.specialty, 15, footerY);
      footerY += 3.5;
    }
    if (doctor.license) {
      doc.text(`Cédula Profesional: ${doctor.license}`, 15, footerY);
    }

    // Professional seal (right side)
    const sealX = pageWidth - 60;
    const sealY = signatureLineY - 15;
    
    doc.setDrawColor(37, 99, 235); // Blue-600
    doc.setLineWidth(1);
    doc.circle(sealX + 15, sealY + 10, 12, 'S');
    
    doc.setFontSize(7);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text('Sello', sealX + 15, sealY + 9, { align: 'center' });
    doc.text('Profesional', sealX + 15, sealY + 13, { align: 'center' });

    if (drawBottomLine) {
      const bottomMargin = 28;
      const bottomLineY = pageHeight - bottomMargin;
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setLineWidth(0.5);
      doc.line(15, bottomLineY, pageWidth - 15, bottomLineY);
    
      if (includeGenerationInfo) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
        const infoY = bottomLineY + 4;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX');
    const timeStr = now.toLocaleTimeString('es-MX');
        doc.text(`Generado el ${dateStr} a las ${timeStr}`, 15, infoY);
        doc.text('Página 1', pageWidth - 15, infoY, { align: 'right' });
      }
    }
  }

  async generatePrescription(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    medications: MedicationInfo[]
  ): Promise<void> {
    console.log('PDFService.generatePrescription (Modern Design) called with:', {
      patient: patient?.name,
      doctor: doctor?.name,
      consultation: consultation?.id,
      medicationsCount: medications?.length
    });
    
    // Get office information
    let officeInfo = null;
    if (!doctor.offices || doctor.offices.length === 0) {
      try {
        const offices = await apiService.getOffices();
        if (offices && offices.length > 0) {
          officeInfo = this.selectBestOfficeForPDF(offices);
        }
      } catch (error) {
        console.warn('Could not fetch office information:', error);
      }
    } else {
      officeInfo = this.selectBestOfficeForPDF(doctor.offices);
    }
    
    try {
      const doc = new jsPDF();
      
      // Add modern header with patient info
      let currentY = await this.addModernPrescriptionHeader(doc, patient, doctor, consultation, officeInfo);
      
      // Add medications section
      currentY = this.addModernMedicationsSection(doc, medications, currentY);
      
      // Add footer with signature
      this.addModernPrescriptionFooter(doc, doctor, consultation, currentY);
      
      // Save the PDF
      const patientNameForFile = patient.name ? patient.name.replace(/\s+/g, '_') : 'Paciente';
      const fileName = `Receta_${patientNameForFile}_${consultation.date.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      console.log('PDF saved successfully:', fileName);
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      throw error;
    }
  }

  private async addCortexHeader(doc: jsPDF, title: string, doctor: DoctorInfo, officeInfo?: OfficeInfo): Promise<void> {
    try {
      let currentY = 20;
      
      // Get full doctor name
      // Build doctor title: Título + Nombre completo + Especialidad
      const doctorNameForHeader = doctor.name || 'Médico';
      const doctorTitle = `${doctor.title || 'Dr.'} ${doctorNameForHeader}`;
      const specialtyText = doctor.specialty || 'No especificada';
      
      // Add doctor title and name (centered)
      const pageWidth = doc.internal.pageSize.width;
      const centerX = pageWidth / 2;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
      doc.text(doctorTitle, centerX, currentY, { align: 'center' });
      currentY += 6;
      
      // Add specialty and license on the same line
        doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      
      let specialtyLine = specialtyText;
      if (doctor.license) {
        specialtyLine += ` | Cédula Profesional: ${doctor.license}`;
      }
      
      // Split if too long to fit page width
      const maxWidth = pageWidth - 40; // 20px margin on each side
      const specialtyLines = doc.splitTextToSize(specialtyLine, maxWidth);
      specialtyLines.forEach((line: string) => {
        doc.text(line, centerX, currentY, { align: 'center' });
        currentY += 5;
      });
      
      currentY += 3;
      
      // Second line: Teléfono, Email. Dirección (all in one line)
      const contactParts: string[] = [];
      
      // Use office phone if available, otherwise use doctor phone
      const phoneNumber = officeInfo?.phone || doctor.phone;
      if (phoneNumber) {
        contactParts.push(`Teléfono: ${phoneNumber}`);
      }
      
      if (doctor.email) {
        contactParts.push(`Email: ${doctor.email}`);
      }
      
      // Office address
      if (officeInfo) {
        const addressParts: string[] = [];
        if (officeInfo.address) addressParts.push(officeInfo.address);
        if (officeInfo.city) addressParts.push(officeInfo.city);
        if (officeInfo.state || officeInfo.state_name) addressParts.push(officeInfo.state || officeInfo.state_name);
        if (officeInfo.country || officeInfo.country_name) addressParts.push(officeInfo.country || officeInfo.country_name || 'México');
        
        if (addressParts.length > 0) {
          contactParts.push(`Dirección: ${addressParts.join(', ')}`);
        }
      }
      
      // Join all contact parts with commas and add period after email
      if (contactParts.length > 0) {
        let contactLine = contactParts.join(', ');
        // Replace comma before "Dirección:" with period
        contactLine = contactLine.replace(/, Dirección:/, '. Dirección:');
        
        // Add contact line (may wrap if too long)
        doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
        const maxWidth = pageWidth - 40; // 20px margin on each side
        const lines = doc.splitTextToSize(contactLine, maxWidth);
        lines.forEach((line: string) => {
          doc.text(line, centerX, currentY, { align: 'center' });
          currentY += 5;
        });
      }
      
      currentY += 5;
      
      // Add document title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, currentY);
      currentY += 5;
      
      // Add line separator
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.line(20, currentY, 190, currentY);
    } catch (error) {
      console.error('Error adding header:', error);
      // Fallback to simple text header
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, 25);
    }
  }

  private addCortexFooter(doc: jsPDF, pageNumber: number): void {
    const pageHeight = doc.internal.pageSize.height;
    
    // Add footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 30, 190, pageHeight - 30);
    
    // Add footer text (removed CORTEX branding)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    const footerTextY = pageHeight - 20;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX');
    const timeStr = now.toLocaleTimeString('es-MX');
    
    doc.text(`Generado el ${dateStr} a las ${timeStr}`, 20, footerTextY);
    doc.text(`Página ${pageNumber}`, 190, footerTextY, { align: 'right' });
  }

  private addDoctorInfo(doc: jsPDF, doctor: DoctorInfo, startY: number, officeInfo?: any): number {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL MÉDICO', 20, startY);
    
    let currentY = startY + 8;
    
    // Doctor details table - more compact
    const doctorNameForTable = doctor.name || 'Médico';
    const doctorData = [
      ['Médico:', `${doctor.title || 'Dr.'} ${doctorNameForTable}`],
      ['Especialidad:', doctor.specialty || 'No especificada'],
      ['Cédula:', doctor.license || 'No especificada'],
      ['Universidad:', doctor.university || 'No especificada'],
      ['Teléfono:', doctor.phone || 'No especificado'],
      ['Consultorio:', officeInfo 
        ? `${officeInfo.name} - ${officeInfo.address || 'No especificado'}, ${officeInfo.city || 'No especificado'}, ${officeInfo.state || officeInfo.state_name || 'No especificado'}, ${officeInfo.country || officeInfo.country_name || 'México'}`
        : 'No especificado']
    ];
    
    autoTable(doc, {
      startY: currentY,
      body: doctorData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 140 }
      },
      margin: { left: 20 }
    });
    
    return (doc as any).lastAutoTable.finalY + 5;
  }

  private addConsultationInfo(doc: jsPDF, consultation: ConsultationInfo, patient: PatientInfo, startY: number, includeDiagnosis: boolean = false, includePatientBirthDate: boolean = false): number {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA CONSULTA', 20, startY);
    
    let currentY = startY + 8;
    
    // Get full patient name
    // Format date for display
    const formattedDate = this.formatDateToDDMMYYYY(consultation.date);
    
    // Consultation details - simplified
    const patientNameForTable = patient.name || 'Paciente';
    const consultationData = [
      ['Fecha:', formattedDate],
      ['Paciente:', patientNameForTable]
    ];

    if (consultation.patient_document_value) {
      const documentLabel = consultation.patient_document_name || patient.identificationType || 'Documento oficial';
      consultationData.push([
        `${documentLabel}:`,
        consultation.patient_document_value
      ]);
    }
    
    // Only add birth date if explicitly requested (for medical orders)
    if (includePatientBirthDate && patient.dateOfBirth) {
      const formattedBirthDate = this.formatDateToDDMMYYYY(patient.dateOfBirth);
      consultationData.push(['Fecha de Nacimiento:', formattedBirthDate]);
    }
    
    consultationData.push(
      ['Tipo de Consulta:', consultation.type || 'No especificado'],
      ['Motivo:', consultation.reason || 'No especificado']
    );
    
    // Add diagnosis only if includeDiagnosis is true (for medical orders and certificates)
    if (includeDiagnosis && consultation.diagnosis) {
        consultationData.push(['Diagnóstico:', consultation.diagnosis || 'No especificado']);
    }
    
    autoTable(doc, {
      startY: currentY,
      body: consultationData,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 130 }
      },
      margin: { left: 20 }
    });
    
    return (doc as any).lastAutoTable.finalY + 5; // Reduced spacing from 8 to 5
  }

  async generateMedicalOrder(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    studies: StudyInfo[]
  ): Promise<void> {
    // Get office information - prefer presential office
    let officeInfo = null;
    if (!doctor.offices || doctor.offices.length === 0) {
      try {
        const offices = await apiService.getOffices();
        if (offices && offices.length > 0) {
          officeInfo = this.selectBestOfficeForPDF(offices);
        }
      } catch (error) {
        console.warn('Could not fetch office information:', error);
      }
    } else {
      officeInfo = this.selectBestOfficeForPDF(doctor.offices);
    }
    
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add modern header with patient info
    let currentY = await this.addModernPrescriptionHeader(doc, patient, doctor, consultation, officeInfo);
    
    // Add document title
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEN DE ESTUDIOS MÉDICOS', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // Add studies section
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTUDIOS SOLICITADOS', 20, currentY);
      currentY += 6; // Reduced from 8 to 6
      
    const studyData = studies.map((study, index) => [
          index + 1,
      study.name,
      study.type,
      study.urgency || 'Normal',
      study.instructions || 'Ninguna'
    ]);
      
      autoTable(doc, {
        startY: currentY,
      head: [['#', 'Estudio', 'Tipo', 'Urgencia', 'Instrucciones']],
      body: studyData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
        columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30 },
          3: { cellWidth: 25 },
        4: { cellWidth: 45 }
        },
        margin: { left: 20, right: 20, bottom: 35 }, // Add bottom margin to prevent footer overlap
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200],
        didDrawPage: (data: any) => {
          // Add footer on each page
            this.addCortexFooter(doc, data.pageNumber);
          }
        });
        
    const finalY = (doc as any).lastAutoTable.finalY || currentY + (studies.length * 10) + 20;
    currentY = finalY + 6; // Reduced from 8 to 6
    
    // Add notes if any
    if (consultation.notes && consultation.notes.trim()) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
      doc.text('NOTAS ADICIONALES', 20, currentY);
        currentY += 6;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        // Split text to fit page width
        const pageWidth = doc.internal.pageSize.width;
        const maxWidth = pageWidth - 40; // 20px margin on each side
      const notesLines = doc.splitTextToSize(consultation.notes, maxWidth);
      notesLines.forEach((line: string) => {
          doc.text(line, 20, currentY);
          currentY += 5;
        });
      }

      this.addModernPrescriptionFooter(doc, doctor, consultation, currentY, { includeTreatmentPlan: false, drawBottomLine: false, includeGenerationInfo: false });
      
      // Save the PDF
      const patientNameForOrderFile = patient.name ? patient.name.replace(/\s+/g, '_') : 'Paciente';
      const fileName = `Orden-Medica_${patientNameForOrderFile}_${consultation.date.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
  }

  async generateMedicalCertificate(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    certificate: CertificateInfo
  ): Promise<void> {
    // Get office information - prefer presential office
    let officeInfo = null;
    if (!doctor.offices || doctor.offices.length === 0) {
      try {
        const offices = await apiService.getOffices();
        if (offices && offices.length > 0) {
          officeInfo = this.selectBestOfficeForPDF(offices);
        }
      } catch (error) {
        console.warn('Could not fetch office information:', error);
      }
    } else {
      officeInfo = this.selectBestOfficeForPDF(doctor.offices);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add modern header with patient info
    let currentY = await this.addModernPrescriptionHeader(doc, patient, doctor, consultation, officeInfo);
    
    // Add document title
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.setFont('helvetica', 'bold');
    doc.text(certificate.title || 'CONSTANCIA MÉDICA', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // Add certificate content
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    // Split certificate content text to fit page width
    const maxWidth = pageWidth - 40; // 20px margin on each side
    const certificateLines = doc.splitTextToSize(certificate.content, maxWidth);
    certificateLines.forEach((line: string) => {
      doc.text(line, 20, currentY);
      currentY += 6;
    });
    
    // Add signature section using modern footer
      this.addModernPrescriptionFooter(doc, doctor, consultation, currentY, { includeTreatmentPlan: false });
      
    // Save the PDF
    const patientNameForCertFile = patient.name ? patient.name.replace(/\s+/g, '_') : 'Paciente';
    const fileName = `Constancia_${patientNameForCertFile}_${consultation.date.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
  }
}

export const pdfService = new PDFService();
