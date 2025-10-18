import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface MedicationInfo {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
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
}

class PDFService {
  private formatDateToDDMMYYYY(dateString: string): string {
    console.log('🔍 Formatting date:', dateString);
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('❌ Invalid date:', dateString);
        return dateString; // Return original if invalid
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      const formatted = `${day}-${month}-${year}`;
      console.log('✅ Formatted date:', formatted);
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
      // Try to load the logo from the public folder (using PNG favicon)
      const response = await fetch('/favicon-32x32.png');
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn('Could not load CORTEX logo:', error);
    }
    return null;
  }

  private async addCortexHeader(doc: jsPDF, title: string): Promise<void> {
    try {
      // Try to load the real CORTEX logo
      const logoDataUrl = await this.loadCortexLogo();
      
      if (logoDataUrl) {
        // Add the real CORTEX logo (PNG)
        doc.addImage(logoDataUrl, 'PNG', 20, 15, 15, 15);
        
        // Add CORTEX text next to logo
        doc.setFontSize(20);
        doc.setTextColor(0, 102, 204); // Blue color
        doc.setFont('helvetica', 'bold');
        doc.text('CORTEX', 40, 25);
      } else {
        // Fallback to placeholder logo
        doc.setFillColor(0, 102, 204); // Blue color matching CORTEX branding
        doc.rect(20, 15, 15, 15, 'F'); // Logo placeholder
        
        // Add "C" inside the logo
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('C', 27, 24);
        
        // Add CORTEX text next to logo
        doc.setFontSize(20);
        doc.setTextColor(0, 102, 204); // Blue color
        doc.setFont('helvetica', 'bold');
        doc.text('CORTEX', 40, 25);
      }
      
      // Add subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('La IA que devuelve el tiempo a la salud', 40, 32);
      
      // Add title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, 45);
      
      // Add line separator
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.line(20, 50, 190, 50);
    } catch (error) {
      console.error('Error adding CORTEX header:', error);
      // Fallback to simple text header
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.setFont('helvetica', 'bold');
      doc.text('CORTEX', 20, 25);
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(title, 20, 40);
    }
  }

  private addCortexFooter(doc: jsPDF, pageNumber: number): void {
    const pageHeight = doc.internal.pageSize.height;
    
    // Add footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 30, 190, pageHeight - 30);
    
    // Add footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('CORTEX - La IA que devuelve el tiempo a la salud', 20, pageHeight - 20);
    doc.text(`Página ${pageNumber}`, 190, pageHeight - 20, { align: 'right' });
    
    // Add generation date
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX');
    const timeStr = now.toLocaleTimeString('es-MX');
    doc.text(`Generado el ${dateStr} a las ${timeStr}`, 20, pageHeight - 15);
  }

  private addDoctorInfo(doc: jsPDF, doctor: DoctorInfo, startY: number): number {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL MÉDICO', 20, startY);
    
    let currentY = startY + 8;
    
    // Get full doctor name
    const fullDoctorName = this.getFullName(doctor.firstName, doctor.lastName, doctor.maternalSurname);
    
    // Doctor details table - more compact
    const doctorData = [
      ['Médico:', `Dr. ${fullDoctorName}`],
      ['Especialidad:', doctor.specialty || 'No especificada'],
      ['Cédula:', doctor.license || 'No especificada'],
      ['Universidad:', doctor.university || 'No especificada'],
      ['Teléfono:', doctor.phone || 'No especificado'],
      ['Consultorio:', `${doctor.address || 'No especificado'}, ${doctor.city || 'No especificado'}, ${doctor.state || 'No especificado'}, ${doctor.country || 'No especificado'}`]
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
    
    // Calculate approximate height: 6 rows * 10px per row + margins
    return currentY + (doctorData.length * 10) + 10;
  }

  private addPatientInfo(doc: jsPDF, patient: PatientInfo, startY: number): number {
    console.log('🔍 PDF Service - Patient data received:', {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      maternalSurname: patient.maternalSurname,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone
    });
    
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
    
    // Calculate approximate height: 3 rows * 10px per row + margins
    return currentY + (patientData.length * 10) + 10;
  }

  private addConsultationInfo(doc: jsPDF, consultation: ConsultationInfo, patient: PatientInfo, startY: number): number {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA CONSULTA', 20, startY);
    
    let currentY = startY + 8;
    
    // Format date to dd-mm-yyyy format
    const formattedDate = consultation.date ? this.formatDateToDDMMYYYY(consultation.date) : 'No especificada';
    
    // Get full patient name
    const fullPatientName = this.getFullName(patient.firstName, patient.lastName, patient.maternalSurname);
    
    const consultationData = [
      ['Fecha:', formattedDate],
      ['Paciente:', fullPatientName],
      ['Diagnóstico:', consultation.diagnosis || 'No especificado'],
      ['Medicamentos Prescritos:', consultation.prescribed_medications || 'No especificados']
    ];
    
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
    
    // Calculate approximate height: 4 rows * 10px per row + margins
    return currentY + (consultationData.length * 10) + 10;
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
    
    try {
      const doc = new jsPDF();
      let currentY = 60;
    
      // Add header
      await this.addCortexHeader(doc, 'RECETA MÉDICA');
      
      // Add doctor info first
      currentY = this.addDoctorInfo(doc, doctor, currentY);
      
      // Add patient info (includes birth date and gender)
      currentY = this.addPatientInfo(doc, patient, currentY);
      
      // Add consultation info (includes patient name)
      currentY = this.addConsultationInfo(doc, consultation, patient, currentY);
      
      // Add medications
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('MEDICAMENTOS PRESCRITOS', 20, currentY);
      currentY += 8;
      
      const medicationData = medications.map((med, index) => [
        index + 1,
        med.name,
        med.dosage,
        med.frequency,
        med.duration,
        med.instructions || 'Según indicación médica'
      ]);
      
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
        margin: { left: 20, right: 20 },
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200]
      });
      
      // Add footer
      this.addCortexFooter(doc, 1);
      
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
    const doc = new jsPDF();
    let currentY = 60;
    
    // Add header
    await this.addCortexHeader(doc, 'ORDEN DE ESTUDIOS MÉDICOS');
    
    // Add doctor info first
    currentY = this.addDoctorInfo(doc, doctor, currentY);
    
    // Add patient info (includes birth date and gender)
    currentY = this.addPatientInfo(doc, patient, currentY);
    
    // Add consultation info (includes patient name)
    currentY = this.addConsultationInfo(doc, consultation, patient, currentY);
    
    // Add studies
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTUDIOS SOLICITADOS', 20, currentY);
    currentY += 8;
    
    const studyData = studies.map((study, index) => [
      index + 1,
      study.name,
      study.type,
      study.category || 'General',
      study.urgency || 'Rutina',
      study.description || 'Sin descripción específica',
      study.instructions || 'Seguir indicaciones del laboratorio'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Estudio', 'Tipo', 'Categoría', 'Urgencia', 'Descripción', 'Instrucciones']],
      body: studyData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 32 }
      },
      margin: { left: 20, right: 20 },
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200]
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
    
    // Add footer
    this.addCortexFooter(doc, 1);
    
    // Save the PDF
    const fileName = `OrdenEstudios_${patient.firstName}_${patient.lastName}_${consultation.date.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  }
}

export const pdfService = new PDFService();