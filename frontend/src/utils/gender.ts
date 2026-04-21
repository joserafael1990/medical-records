/**
 * Gender canonicalization helpers.
 *
 * Backend stores `persons.gender` as the single-letter codes M / F / O
 * (see backend/schemas/persons.py). Legacy rows and older callers may still
 * hold full words ("Masculino", "Femenino", "Otro") or English aliases —
 * these helpers accept any of those forms and funnel everything through the
 * canonical code. Use `formatGenderLabel` whenever rendering a gender to the
 * user, and `normalizeGenderCode` before sending values to the API.
 */

export type GenderCode = 'M' | 'F' | 'O';

const ALIAS_TO_CODE: Record<string, GenderCode> = {
  m: 'M',
  masculino: 'M',
  male: 'M',
  hombre: 'M',
  f: 'F',
  femenino: 'F',
  female: 'F',
  mujer: 'F',
  o: 'O',
  otro: 'O',
  other: 'O',
};

const CODE_TO_LABEL: Record<GenderCode, string> = {
  M: 'Masculino',
  F: 'Femenino',
  O: 'Otro',
};

/** Coerce any accepted gender input to the canonical code, or null. */
export function normalizeGenderCode(value: unknown): GenderCode | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  return ALIAS_TO_CODE[s] ?? null;
}

/** Render a gender value for the user. Unknown values fall back to '—'. */
export function formatGenderLabel(value: unknown, fallback = '—'): string {
  const code = normalizeGenderCode(value);
  return code ? CODE_TO_LABEL[code] : fallback;
}

/** Dropdown options for form Selects — values are the canonical codes. */
export const GENDER_CODE_OPTIONS: ReadonlyArray<{ value: GenderCode; label: string }> = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
];
