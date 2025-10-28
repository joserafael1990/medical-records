import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from './api';

export interface PatientInfo {
  id: number;
  firstName: string;
  lastName: string;
  maternalSurname?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface DoctorInfo {
  id: number;
  firstName: string;
  lastName: string;
  maternalSurname?: string;
  title?: string;
  specialty?: string;
  license?: string;
  university?: string;
  phone?: string;
  email?: string;
  onlineConsultationUrl?: string;
  offices?: OfficeInfo[];
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
  time: string;
  type: string;
  reason?: string;
  diagnosis?: string;
  prescribed_medications?: string;
  notes?: string;
  treatment_plan?: string;
  follow_up_instructions?: string;
}

export interface CertificateInfo {
  content: string;
  title?: string;
}

class PDFService {
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

  private getFullName(firstName: string, lastName: string, maternalSurname?: string): string {
    const parts = [firstName, lastName];
    if (maternalSurname && maternalSurname.trim()) {
      parts.push(maternalSurname);
    }
    return parts.filter(part => part && part.trim()).join(' ');
  }

  private async loadCortexLogo(): Promise<string | null> {
    try {
      // Create SVG logo inline and convert to PNG
      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path>
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path>
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>
          <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path>
          <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path>
          <path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path>
          <path d="M19.938 10.5a4 4 0 0 1 .585.396"></path>
          <path d="M6 18a4 4 0 0 1-1.967-.516"></path>
          <path d="M19.967 17.484A4 4 0 0 1 18 18"></path>
        </svg>
      `;
      
      // Convert SVG to PNG using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = () => {
          canvas.width = 64;
          canvas.height = 64;
          if (ctx) {
            ctx.drawImage(img, 0, 0, 64, 64);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
      });
    } catch (error) {
      console.warn('Could not load CORTEX logo:', error);
      return null;
    }
  }

  private async addCortexHeader(doc: jsPDF, title: string, doctor: DoctorInfo, officeInfo?: OfficeInfo): Promise<void> {
    try {
      let currentY = 20;
      
      // Get full doctor name
      const fullDoctorName = this.getFullName(doctor.firstName, doctor.lastName, doctor.maternalSurname);
      
      // Build doctor title: Título + Nombre completo + Especialidad
      const doctorTitle = `${doctor.title || 'Dr.'} ${fullDoctorName}`;
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
    doc.text(`Página ${pageNumber}`, 190, pageHeight - 20, { align: 'right' });
    
    // Add generation date
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX');
    const timeStr = now.toLocaleTimeString('es-MX');
    doc.text(`Generado el ${dateStr} a las ${timeStr}`, 20, pageHeight - 20);
  }

  private addDoctorInfo(doc: jsPDF, doctor: DoctorInfo, startY: number, officeInfo?: any): number {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL MÉDICO', 20, startY);
    
    let currentY = startY + 8;
    
    // Get full doctor name
    const fullDoctorName = this.getFullName(doctor.firstName, doctor.lastName, doctor.maternalSurname);
    
    
    // Doctor details table - more compact
    const doctorData = [
      ['Médico:', `${doctor.title || 'Dr.'} ${fullDoctorName}`],
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
      head: [],
      body: doctorData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 135 }
      },
      margin: { left: 20, right: 20 },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200]
    });
    
    // Calculate approximate height: 6 rows * 10px per row + reduced margin
    return currentY + (doctorData.length * 10) + 5;
  }

  private addPatientInfo(doc: jsPDF, patient: PatientInfo, startY: number): number {
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PACIENTE', 20, startY);
    
    let currentY = startY + 8;
    
    // Get full patient name
    const fullPatientName = this.getFullName(patient.firstName, patient.lastName, patient.maternalSurname);
    
    // Format date of birth
    const formattedDateOfBirth = patient.dateOfBirth ? this.formatDateToDDMMYYYY(patient.dateOfBirth) : 'No especificada';
    
    // Patient details table - only essential information
    const patientData = [
      ['Nombre:', fullPatientName],
      ['Fecha de Nacimiento:', formattedDateOfBirth],
      ['Género:', patient.gender || 'No especificado']
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [],
      body: patientData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 135 }
      },
      margin: { left: 20, right: 20 },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200]
    });
    
    // Calculate approximate height: 3 rows * 10px per row + reduced margin
    return currentY + (patientData.length * 10) + 5;
  }

  private addConsultationInfo(doc: jsPDF, consultation: ConsultationInfo, patient: PatientInfo, startY: number, includeDiagnosis: boolean = true, forMedicalOrder: boolean = false): number {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA CONSULTA', 20, startY);
    
    let currentY = startY + 8;
    
    // Format date to dd-mm-yyyy format
    const formattedDate = consultation.date ? this.formatDateToDDMMYYYY(consultation.date) : 'No especificada';
    
    // Get full patient name
    const fullPatientName = this.getFullName(patient.firstName, patient.lastName, patient.maternalSurname);
    
    // Format birth date
    const formattedBirthDate = patient.dateOfBirth ? this.formatDateToDDMMYYYY(patient.dateOfBirth) : 'No especificada';
    
    // Build consultation data
    const consultationData: string[][] = [];
    
    if (forMedicalOrder) {
      // For medical orders: Date, Patient Name, Birth Date (no diagnosis)
      consultationData.push(['Fecha de la consulta:', formattedDate]);
      consultationData.push(['Nombre del paciente:', fullPatientName]);
      consultationData.push(['Fecha de nacimiento:', formattedBirthDate]);
    } else {
      // For prescriptions and other documents: Date, Patient Name, optionally Diagnosis
      consultationData.push(['Fecha:', formattedDate]);
      consultationData.push(['Paciente:', fullPatientName]);
      
      // Only include diagnosis if requested (for medical orders, not prescriptions)
      if (includeDiagnosis) {
        consultationData.push(['Diagnóstico:', consultation.diagnosis || 'No especificado']);
      }
    }
    
    autoTable(doc, {
      startY: currentY,
      head: [],
      body: consultationData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 135 }
      },
      margin: { left: 20, right: 20 },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200]
    });
    
    // Calculate approximate height: rows * 10px per row + reduced margin
    return currentY + (consultationData.length * 10) + 5;
  }

  async generatePrescription(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    medications: MedicationInfo[]
  ): Promise<void> {
    console.log('PDFService.generatePrescription called with:', {
      patient: patient?.firstName,
      doctor: doctor?.firstName,
      consultation: consultation?.id,
      medicationsCount: medications?.length
    });
    
    // Get office information if not available
    let officeInfo = null;
    if (!doctor.offices || doctor.offices.length === 0) {
      try {
        const offices = await apiService.getOffices();
        if (offices && offices.length > 0) {
          officeInfo = offices[0];
        }
      } catch (error) {
        console.warn('Could not fetch office information:', error);
      }
    } else {
      officeInfo = doctor.offices[0];
    }
    
    
    try {
      const doc = new jsPDF();
      let currentY = 70; // Increased from 60 to account for new header format
    
      // Add header with doctor info
      await this.addCortexHeader(doc, 'RECETA MÉDICA', doctor, officeInfo);
      
      // Add consultation info (without diagnosis for prescriptions) - patient info removed since it's included in consultation info
      currentY = this.addConsultationInfo(doc, consultation, patient, currentY, false);
      
      // Add medications only if there are any
      if (medications && medications.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDICAMENTOS PRESCRITOS', 20, currentY);
      currentY += 6; // Reduced from 8 to 6
      
      const medicationData = medications.map((med, index) => {
        // Build comprehensive instructions
        let fullInstructions = med.instructions || 'Según indicación médica';
        
        // Add quantity if available
        if (med.quantity) {
          fullInstructions += `. Cantidad: ${med.quantity}`;
        }
        
        // Add via de administración if available
        if (med.via_administracion) {
          fullInstructions += `. Vía: ${med.via_administracion}`;
        }
        
        return [
          index + 1,
          med.name,
          med.dosage,
          med.frequency,
          med.duration,
          fullInstructions
        ];
      });
      
      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Instrucciones']],
        body: medicationData,
        theme: 'grid',
        headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 42 }
        },
        margin: { left: 20, right: 20, bottom: 35 }, // Add bottom margin to prevent footer overlap
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200],
        didDrawPage: (data: any) => {
          // Add footer on each page
            this.addCortexFooter(doc, data.pageNumber);
          }
        });
        
        // Get the final Y position after the medications table
        const finalY = (doc as any).lastAutoTable.finalY || currentY + (medications.length * 10) + 20;
        currentY = finalY + 6;
      } else {
        // If no medications, just add a small margin
        currentY += 5;
      }
      
      // Add Treatment Plan section
      if (consultation.treatment_plan && consultation.treatment_plan.trim()) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('PLAN DE TRATAMIENTO', 20, currentY);
        currentY += 6;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        // Split text to fit page width
        const pageWidth = doc.internal.pageSize.width;
        const maxWidth = pageWidth - 40; // 20px margin on each side
        const treatmentLines = doc.splitTextToSize(consultation.treatment_plan, maxWidth);
        treatmentLines.forEach((line: string) => {
          doc.text(line, 20, currentY);
          currentY += 5;
        });
        
        currentY += 5;
      }
      
      // Add Follow-up Instructions section
      if (consultation.follow_up_instructions && consultation.follow_up_instructions.trim()) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('INSTRUCCIONES DE SEGUIMIENTO', 20, currentY);
        currentY += 6;
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        // Split text to fit page width
        const pageWidth = doc.internal.pageSize.width;
        const maxWidth = pageWidth - 40; // 20px margin on each side
        const followUpLines = doc.splitTextToSize(consultation.follow_up_instructions, maxWidth);
        followUpLines.forEach((line: string) => {
          doc.text(line, 20, currentY);
          currentY += 5;
        });
      }
      
      // Add footer if no medications table was added (footer is added via didDrawPage in autoTable)
      if (!medications || medications.length === 0) {
        this.addCortexFooter(doc, 1);
      }
      
      // Save the PDF
      const fileName = `Receta_${patient.firstName}_${patient.lastName}_${consultation.date.replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      console.log('PDF saved successfully:', fileName);
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
    // Get office information if not available
    let officeInfo = null;
    if (!doctor.offices || doctor.offices.length === 0) {
      try {
        const offices = await apiService.getOffices();
        if (offices && offices.length > 0) {
          officeInfo = offices[0];
        }
      } catch (error) {
        console.warn('Could not fetch office information:', error);
      }
    } else {
      officeInfo = doctor.offices[0];
    }
    

    const doc = new jsPDF();
    let currentY = 70; // Increased from 60 to account for new header format
    
    // Add header with doctor info
    await this.addCortexHeader(doc, 'ORDEN DE ESTUDIOS MÉDICOS', doctor, officeInfo);
    
    // Add consultation info (includes date, patient name, and birth date - patient info removed since it's included here)
    currentY = this.addConsultationInfo(doc, consultation, patient, currentY, false, true);
    
    // Add studies
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTUDIOS SOLICITADOS', 20, currentY);
    currentY += 6; // Reduced from 8 to 6
    
    const studyData = studies.map((study, index) => [
      index + 1,
      study.name,
      study.instructions || 'Seguir indicaciones del laboratorio'
    ]);
    
    // Calculate table width (page width - margins)
    const pageWidth = doc.internal.pageSize.width;
    const tableWidth = pageWidth - 40; // 20px margin on each side
    
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Estudio', 'Instrucciones']],
      body: studyData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: tableWidth * 0.09 },
        1: { cellWidth: tableWidth * 0.45 },
        2: { cellWidth: tableWidth * 0.46 }
      },
      margin: { left: 20, right: 20, bottom: 35 }, // Add bottom margin to prevent footer overlap
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
      didDrawPage: (data: any) => {
        // Add footer on each page
        this.addCortexFooter(doc, data.pageNumber);
      }
    });
    
    // Add notes section if available
    if (consultation.notes) {
      const finalY = currentY + 30; // Approximate position after studies table
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTAS ADICIONALES', 20, finalY);
      
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(consultation.notes, 20, finalY + 10);
    }
    
    // Save the PDF
    const fileName = `OrdenEstudios_${patient.firstName}_${patient.lastName}_${consultation.date.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  }

  async generateCertificate(
    patient: PatientInfo,
    doctor: DoctorInfo,
    consultation: ConsultationInfo,
    certificate: CertificateInfo
  ): Promise<void> {
    try {
      // Get office information if not available
      let officeInfo = null;
      if (!doctor.offices || doctor.offices.length === 0) {
        try {
          const offices = await apiService.getOffices();
          if (offices && offices.length > 0) {
            officeInfo = offices[0];
          }
        } catch (error) {
          console.warn('Could not fetch office information:', error);
        }
      } else {
        officeInfo = doctor.offices[0];
      }
      
      const doc = new jsPDF();
      let currentY = 70; // Increased from 60 to account for new header format
      
      // Add header with doctor info
      await this.addCortexHeader(doc, certificate.title || 'CONSTANCIA MÉDICA', doctor, officeInfo);
      
      // Add certificate content directly (no tables)
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // Split text into lines that fit the page width
      const pageWidth = doc.internal.pageSize.width;
      const maxWidth = pageWidth - 40; // 20px margin on each side
      const lines = doc.splitTextToSize(certificate.content, maxWidth);
      
      // Calculate content height
      const lineHeight = 7;
      const contentHeight = lines.length * lineHeight;
      const pageHeight = doc.internal.pageSize.height;
      
      // Check if content fits on page, if not, add new page
      if (currentY + contentHeight > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }
      
      // Add the text (no border)
      doc.text(lines, 20, currentY);
      
      currentY += contentHeight + 30;
      
      // Add signature line
      if (currentY + 40 > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }
      
      // Signature section
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      const fullDoctorName = this.getFullName(doctor.firstName, doctor.lastName, doctor.maternalSurname);
      
      // Draw signature line
      const centerX = pageWidth / 2;
      doc.line(centerX - 40, currentY, centerX + 40, currentY);
      
      currentY += 6;
      
      // Doctor name
      doc.setFont('helvetica', 'bold');
      doc.text(`${doctor.title || 'Dr.'} ${fullDoctorName}`, centerX, currentY, { align: 'center' });
      
      currentY += 5;
      
      // Specialty and license
      doc.setFont('helvetica', 'normal');
      if (doctor.specialty) {
        doc.text(doctor.specialty, centerX, currentY, { align: 'center' });
        currentY += 5;
      }
      
      if (doctor.license) {
        doc.text(`Cédula Profesional: ${doctor.license}`, centerX, currentY, { align: 'center' });
      }
      
      // Add footer
      this.addCortexFooter(doc, 1);
      
      // Save the PDF
      const fileName = `Constancia_${patient.firstName}_${patient.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      console.log('Certificate PDF saved successfully:', fileName);
    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      throw error;
    }
  }
}

export const pdfService = new PDFService();