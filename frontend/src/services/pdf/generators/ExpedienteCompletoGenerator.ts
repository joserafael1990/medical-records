/**
 * Complete-expediente PDF generator.
 *
 * Unlike the existing generators (prescription, certificate, medical
 * order) that work off a single consultation, this one consumes the
 * full aggregated payload from `/api/patients/{id}/expediente/full`
 * and renders a multi-page document: demographics → consultations (one
 * per "section") → clinical studies.
 *
 * Uses jsPDF + jspdf-autotable. Reuses the avatar loading helper from
 * BasePDFGenerator for a consistent doctor header.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BasePDFGenerator } from './BaseGenerator';
import type { DoctorInfo, OfficeInfo } from '../../../types/pdf';
import { PDF_CONSTANTS } from '../constants';
import { formatDateToDDMMYYYY } from '../utils';
import { formatGenderLabel } from '../../../utils/gender';

export interface ExpedientePatient {
  id: number;
  name: string;
  birth_date?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  civil_status?: string | null;
  address?: string | null;
  address_city?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  insurance_provider?: string | null;
  insurance_number?: string | null;
  curp?: string | null;
  rfc?: string | null;
}

export interface ExpedientePrescription {
  id: number;
  medication: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions?: string | null;
  via_administracion?: string | null;
}

export interface ExpedienteVital {
  id: number;
  name: string | null;
  value: string | null;
  unit: string | null;
}

export interface ExpedienteConsultation {
  id: number;
  consultation_date: string | null;
  consultation_type?: string | null;
  chief_complaint?: string | null;
  history_present_illness?: string | null;
  personal_pathological_history?: string | null;
  physical_examination?: string | null;
  primary_diagnosis?: string | null;
  secondary_diagnoses?: string | null;
  treatment_plan?: string | null;
  follow_up_instructions?: string | null;
  notes?: string | null;
  prescriptions: ExpedientePrescription[];
  vital_signs: ExpedienteVital[];
}

export interface ExpedienteStudy {
  id: number;
  study_type: string | null;
  study_name: string | null;
  status: string | null;
  urgency: string | null;
  ordered_date: string | null;
  performed_date: string | null;
}

export interface ExpedienteCompletoPayload {
  patient: ExpedientePatient;
  consultations: ExpedienteConsultation[];
  clinical_studies: ExpedienteStudy[];
  summary: {
    total_consultations: number;
    total_prescriptions: number;
    total_vitals: number;
    total_studies: number;
  };
}

const MARGIN = 20;

export class ExpedienteCompletoGenerator extends BasePDFGenerator {
  async generate(
    payload: ExpedienteCompletoPayload,
    doctor: DoctorInfo,
    officeInfo?: OfficeInfo
  ): Promise<void> {
    await this.renderCoverHeader(payload, doctor, officeInfo);
    this.renderPatientSection(payload.patient);
    this.renderSummary(payload.summary);

    payload.consultations.forEach((c, idx) => {
      this.doc.addPage();
      this.renderConsultation(c, idx + 1, payload.consultations.length);
    });

    if (payload.clinical_studies.length > 0) {
      this.doc.addPage();
      this.renderStudies(payload.clinical_studies);
    }

    this.addPageNumbers();

    const safeName = (payload.patient.name || 'Paciente').replace(/\s+/g, '_');
    const today = new Date().toISOString().slice(0, 10);
    this.save(`Expediente_${safeName}_${today}.pdf`);
  }

  // Public to match the parent class visibility. The generator exposes
  // `save` for callers that want to trigger the download manually.
  public save(fileName: string): void {
    this.doc.save(fileName);
  }

  // -------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------

  private async renderCoverHeader(
    payload: ExpedienteCompletoPayload,
    doctor: DoctorInfo,
    officeInfo?: OfficeInfo
  ): Promise<void> {
    const pageWidth = this.doc.internal.pageSize.width;
    let y = MARGIN;

    // Doctor avatar (top-left)
    const avatarRadius = 9;
    const avatarCenterX = MARGIN + avatarRadius;
    const avatarCenterY = y + avatarRadius;
    const avatarDataUrl = await this.loadDoctorAvatarDataUrl(doctor);
    if (avatarDataUrl) {
      this.doc.addImage(
        avatarDataUrl,
        'PNG',
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2,
        undefined,
        'FAST'
      );
      this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.PRIMARY);
      this.doc.setLineWidth(0.6);
      this.doc.circle(avatarCenterX, avatarCenterY, avatarRadius, 'S');
    }

    // Doctor block
    const blockX = MARGIN + avatarRadius * 2 + 8;
    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
    this.doc.text(`${doctor.title || 'Dr.'} ${doctor.name || ''}`.trim(), blockX, y + 5);
    if (doctor.specialty) {
      this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...PDF_CONSTANTS.COLORS.SECONDARY);
      this.doc.text(doctor.specialty, blockX, y + 10);
    }
    if (doctor.license) {
      this.doc.setFontSize(8);
      this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
      this.doc.text(`Cédula: ${doctor.license}`, blockX, y + 14);
    }

    // Title (right-aligned)
    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(16);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
    this.doc.text('EXPEDIENTE CLÍNICO', pageWidth - MARGIN, y + 6, { align: 'right' });

    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
    this.doc.text(
      `Generado ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`,
      pageWidth - MARGIN,
      y + 11,
      { align: 'right' }
    );

    // Office address (if present), small line right-aligned below
    if (officeInfo && !officeInfo.is_virtual && officeInfo.address) {
      const parts = [officeInfo.address, officeInfo.city, officeInfo.state_name].filter(Boolean);
      this.doc.text(parts.join(', '), pageWidth - MARGIN, y + 15, { align: 'right' });
    }

    // Divider
    y += avatarRadius * 2 + 4;
    this.doc.setDrawColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHTER);
    this.doc.setLineWidth(0.4);
    this.doc.line(MARGIN, y, pageWidth - MARGIN, y);
    (this.doc as any)._cursorY = y + 6;
  }

  private renderPatientSection(p: ExpedientePatient): void {
    const pageWidth = this.doc.internal.pageSize.width;
    let y = (this.doc as any)._cursorY || 40;

    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
    this.doc.text('Datos del paciente', MARGIN, y);
    y += 5;

    const rows: [string, string][] = [
      ['Nombre', p.name],
      ['Fecha de nacimiento', fmtDate(p.birth_date)],
      ['Género', formatGenderLabel(p.gender)],
      ['CURP', p.curp || '—'],
      ['RFC', p.rfc || '—'],
      ['Teléfono', p.phone || '—'],
      ['Email', p.email || '—'],
      ['Dirección', [p.address, p.address_city].filter(Boolean).join(', ') || '—'],
      ['Estado civil', p.civil_status || '—'],
      ['Contacto de emergencia', [p.emergency_contact_name, p.emergency_contact_phone].filter(Boolean).join(' · ') || '—'],
      ['Seguro', [p.insurance_provider, p.insurance_number].filter(Boolean).join(' · ') || '—'],
    ];
    autoTable(this.doc, {
      startY: y,
      body: rows,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: PDF_CONSTANTS.COLORS.TEXT_LIGHT as any },
        1: { cellWidth: pageWidth - 2 * MARGIN - 55 },
      },
      margin: { left: MARGIN, right: MARGIN },
    });
    (this.doc as any)._cursorY = (this.doc as any).lastAutoTable.finalY + 6;
  }

  private renderSummary(summary: ExpedienteCompletoPayload['summary']): void {
    const pageWidth = this.doc.internal.pageSize.width;
    let y = (this.doc as any)._cursorY || 80;

    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
    this.doc.text('Resumen del expediente', MARGIN, y);
    y += 4;

    autoTable(this.doc, {
      startY: y,
      body: [
        ['Consultas registradas', String(summary.total_consultations)],
        ['Medicamentos prescritos (total)', String(summary.total_prescriptions)],
        ['Signos vitales registrados', String(summary.total_vitals)],
        ['Estudios clínicos', String(summary.total_studies)],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: (pageWidth - 2 * MARGIN) * 0.65 },
        1: { cellWidth: (pageWidth - 2 * MARGIN) * 0.35, halign: 'right' },
      },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  private renderConsultation(
    c: ExpedienteConsultation,
    index: number,
    total: number
  ): void {
    const pageWidth = this.doc.internal.pageSize.width;
    let y = MARGIN;

    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
    this.doc.text(
      `Consulta ${index} de ${total} — ${fmtDate(c.consultation_date)}`,
      MARGIN,
      y
    );
    if (c.consultation_type) {
      this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
      this.doc.text(c.consultation_type, pageWidth - MARGIN, y, { align: 'right' });
    }
    y += 6;

    const fields: Array<[string, string | null | undefined]> = [
      ['Motivo de consulta', c.chief_complaint],
      ['Padecimiento actual', c.history_present_illness],
      ['Antecedentes patológicos personales', c.personal_pathological_history],
      ['Exploración física', c.physical_examination],
      ['Diagnóstico principal', c.primary_diagnosis],
      ['Diagnósticos secundarios', c.secondary_diagnoses],
      ['Plan de tratamiento', c.treatment_plan],
      ['Indicaciones de seguimiento', c.follow_up_instructions],
      ['Notas', c.notes],
    ];
    const body = fields
      .filter(([, v]) => v && String(v).trim().length > 0)
      .map(([k, v]) => [k, String(v)]);

    if (body.length > 0) {
      autoTable(this.doc, {
        startY: y,
        body,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: {
          0: {
            fontStyle: 'bold',
            cellWidth: 60,
            textColor: PDF_CONSTANTS.COLORS.TEXT_LIGHT as any,
          },
          1: { cellWidth: pageWidth - 2 * MARGIN - 60 },
        },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (this.doc as any).lastAutoTable.finalY + 4;
    }

    if (c.vital_signs.length > 0) {
      y = this.sectionLabel('Signos vitales', y);
      autoTable(this.doc, {
        startY: y,
        head: [['Signo', 'Valor', 'Unidad']],
        body: c.vital_signs.map((v) => [v.name || '—', v.value || '—', v.unit || '']),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: PDF_CONSTANTS.COLORS.PRIMARY as any, textColor: 255 },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = (this.doc as any).lastAutoTable.finalY + 4;
    }

    if (c.prescriptions.length > 0) {
      y = this.sectionLabel('Medicamentos prescritos', y);
      autoTable(this.doc, {
        startY: y,
        head: [['Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Vía']],
        body: c.prescriptions.map((rx) => [
          rx.medication || '—',
          rx.dosage || '—',
          rx.frequency || '—',
          rx.duration || '—',
          rx.via_administracion || '—',
        ]),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: PDF_CONSTANTS.COLORS.PRIMARY as any, textColor: 255 },
        margin: { left: MARGIN, right: MARGIN },
      });
    }
  }

  private renderStudies(studies: ExpedienteStudy[]): void {
    let y = MARGIN;
    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.PRIMARY);
    this.doc.text('Estudios clínicos', MARGIN, y);
    y += 6;

    autoTable(this.doc, {
      startY: y,
      head: [['Nombre', 'Tipo', 'Estatus', 'Urgencia', 'Fecha solicitud', 'Realizado']],
      body: studies.map((s) => [
        s.study_name || '—',
        s.study_type || '—',
        s.status || '—',
        s.urgency || '—',
        fmtDate(s.ordered_date),
        fmtDate(s.performed_date),
      ]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: PDF_CONSTANTS.COLORS.PRIMARY as any, textColor: 255 },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  private sectionLabel(label: string, y: number): number {
    this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_DARK);
    this.doc.text(label, MARGIN, y);
    return y + 3;
  }

  private addPageNumbers(): void {
    const total = this.doc.getNumberOfPages();
    const pageWidth = this.doc.internal.pageSize.width;
    const pageHeight = this.doc.internal.pageSize.height;
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFont(PDF_CONSTANTS.FONTS.PRIMARY, 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...PDF_CONSTANTS.COLORS.TEXT_LIGHT);
      this.doc.text(
        `Página ${i} de ${total}`,
        pageWidth - MARGIN,
        pageHeight - 10,
        { align: 'right' }
      );
      this.doc.text(
        'Documento confidencial · NOM-004-SSA3-2012',
        MARGIN,
        pageHeight - 10
      );
    }
  }
}


function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    // The aggregator ISO-formats dates; we accept both date-only and
    // full datetime strings.
    return formatDateToDDMMYYYY(iso.slice(0, 10)) || '—';
  } catch {
    return '—';
  }
}
