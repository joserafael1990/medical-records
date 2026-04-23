/**
 * Parses a date-only value ("YYYY-MM-DD", optionally with a time part that is ignored)
 * as a LOCAL date at noon. Avoids the `new Date('YYYY-MM-DD')` UTC-parsing pitfall
 * that shifts the calendar day by the UTC offset (e.g. "1991-11-07" renders as
 * Nov 6 in CDMX).
 *
 * Returns null for empty or malformed input. Pass-through for valid Date instances.
 */
export const parseDateOnly = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const datePart = value.split('T')[0];
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
};

/**
 * Formats a date-only value without timezone conversion. Use for columns stored
 * as SQL DATE (e.g. birth_date, effective_date, license dates). Do NOT use
 * `new Date(str).toLocaleDateString()` on a date-only string — it shifts the day
 * in negative UTC offsets.
 */
export const formatDateOnly = (
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string => {
  const d = parseDateOnly(value);
  if (!d) return '';
  return d.toLocaleDateString('es-MX', options);
};

export const formatDate = (date: string | Date) => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}(T00:00:00(\.0+)?Z?)?$/.test(date)) {
    return formatDateOnly(date);
  }
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City'
  });
};

export const formatDateTime = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  });
};

export const formatDateTimeShort = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  // Format the date in CDMX timezone
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City'
  });
};

export const calculateAge = (birthDate: string | Date | null | undefined): number | null => {
  if (!birthDate) return null;
  const birth = parseDateOnly(birthDate);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

export const isValidDate = (date: any) => {
  return date instanceof Date && !isNaN(date.getTime());
};

export default {
  parseDateOnly,
  formatDateOnly,
  formatDate,
  formatDateTime,
  formatDateTimeShort,
  calculateAge,
  isValidDate
};
