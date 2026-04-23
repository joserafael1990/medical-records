import { parseDateOnly, formatDateOnly, calculateAge } from '../../utils/dateHelpers';

describe('dateHelpers (date-only)', () => {
  describe('parseDateOnly', () => {
    it('parses YYYY-MM-DD without timezone shift', () => {
      const d = parseDateOnly('1991-11-07');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(1991);
      expect(d!.getMonth()).toBe(10); // November
      expect(d!.getDate()).toBe(7);
    });

    it('strips time part when present', () => {
      const d = parseDateOnly('1991-11-07T00:00:00');
      expect(d!.getDate()).toBe(7);
      expect(d!.getMonth()).toBe(10);
    });

    it('returns null for empty, null, or undefined', () => {
      expect(parseDateOnly('')).toBeNull();
      expect(parseDateOnly(null)).toBeNull();
      expect(parseDateOnly(undefined)).toBeNull();
    });

    it('returns null for malformed strings', () => {
      expect(parseDateOnly('not-a-date')).toBeNull();
    });

    it('passes through valid Date instances', () => {
      const input = new Date(1991, 10, 7);
      expect(parseDateOnly(input)).toBe(input);
    });
  });

  describe('formatDateOnly', () => {
    it('formats Nov 7 1991 as November 7 (not Nov 6) regardless of host tz', () => {
      const out = formatDateOnly('1991-11-07');
      expect(out).toMatch(/7/);
      expect(out).toMatch(/noviembre/i);
      expect(out).not.toMatch(/\b6 de noviembre\b/);
    });

    it('returns empty string for empty input', () => {
      expect(formatDateOnly('')).toBe('');
      expect(formatDateOnly(null)).toBe('');
      expect(formatDateOnly(undefined)).toBe('');
    });

    it('supports custom options (short format)', () => {
      const out = formatDateOnly('2026-01-15', { day: '2-digit', month: '2-digit', year: 'numeric' });
      expect(out).toContain('15');
      expect(out).toContain('01');
      expect(out).toContain('2026');
    });
  });

  describe('calculateAge', () => {
    it('treats birth_date as a calendar day (no timezone drift)', () => {
      // For someone born 1991-11-07, on 1991-11-07 they are 0 years old (not -1 due to tz)
      const today = new Date(1991, 10, 7, 10, 0, 0);
      jest.useFakeTimers().setSystemTime(today);
      try {
        expect(calculateAge('1991-11-07')).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns correct age one day before birthday', () => {
      const today = new Date(2026, 10, 6, 10, 0, 0); // Nov 6 2026
      jest.useFakeTimers().setSystemTime(today);
      try {
        expect(calculateAge('1991-11-07')).toBe(34); // still 34, birthday not reached
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns correct age on birthday', () => {
      const today = new Date(2026, 10, 7, 10, 0, 0); // Nov 7 2026
      jest.useFakeTimers().setSystemTime(today);
      try {
        expect(calculateAge('1991-11-07')).toBe(35);
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns null for empty/invalid input', () => {
      expect(calculateAge(null)).toBeNull();
      expect(calculateAge(undefined)).toBeNull();
      expect(calculateAge('')).toBeNull();
      expect(calculateAge('not-a-date')).toBeNull();
    });
  });
});
