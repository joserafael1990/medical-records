/**
 * Patient profile completeness helper.
 *
 * A "quick patient" (created with just name + phone during appointment
 * booking) is missing the NOM-004 mandatory fields. This helper returns
 * which specific fields are still missing, so the UI can show a chip
 * and the consultation-time guard can list what the doctor must fill
 * in before signing the expediente.
 */

import type { Patient } from '../types';

/** Fields NOM-004 considers mandatory for a signed expediente. */
export const REQUIRED_NOM004_FIELDS = ['curp', 'birth_date', 'gender'] as const;

export type RequiredFieldKey = typeof REQUIRED_NOM004_FIELDS[number];

export interface MissingFieldDescriptor {
  key: RequiredFieldKey;
  label: string;
}

const FIELD_LABELS: Record<RequiredFieldKey, string> = {
  curp: 'CURP',
  birth_date: 'Fecha de nacimiento',
  gender: 'Género',
};

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

function patientCurp(patient: Patient | null | undefined): string | undefined {
  if (!patient) return undefined;
  const direct = (patient as any).curp;
  if (!isBlank(direct)) return direct;
  // CURP may live under the documents relationship depending on the API shape.
  const docs: any[] = (patient as any).documents || [];
  const curpDoc = docs.find(
    (d: any) =>
      d &&
      d.is_active !== false &&
      ((d.document_name && String(d.document_name).toUpperCase() === 'CURP') ||
        (d.document?.name && String(d.document.name).toUpperCase() === 'CURP'))
  );
  return curpDoc?.document_value;
}

/** Return the missing NOM-004 fields for a patient (empty → complete). */
export function missingPatientFields(
  patient: Patient | null | undefined
): MissingFieldDescriptor[] {
  if (!patient) return [];
  const missing: MissingFieldDescriptor[] = [];

  if (isBlank(patientCurp(patient))) {
    missing.push({ key: 'curp', label: FIELD_LABELS.curp });
  }
  if (isBlank((patient as any).birth_date)) {
    missing.push({ key: 'birth_date', label: FIELD_LABELS.birth_date });
  }
  if (isBlank((patient as any).gender)) {
    missing.push({ key: 'gender', label: FIELD_LABELS.gender });
  }
  return missing;
}

/** True when the patient has every NOM-004 mandatory field. */
export function isPatientProfileComplete(
  patient: Patient | null | undefined
): boolean {
  return missingPatientFields(patient).length === 0;
}
