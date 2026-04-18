import { renderHook } from '@testing-library/react';
import { useProfileCompletion } from '../useProfileCompletion';

describe('useProfileCompletion', () => {
  // Profile that satisfies every completion item — used as the baseline for
  // partial-profile tests so each test can toggle off exactly one field.
  const fullProfile = {
    specialty_id: 12,
    primary_phone: '+525512345678',
    appointment_duration: 30,
    documents: [
      { document_name: 'Cédula Profesional', document_value: '12345678' }
    ],
    offices: [
      { id: 1, name: 'Consultorio Polanco', address: 'Av. Masaryk 123' }
    ],
    schedule: {
      monday: { is_active: true, time_blocks: [{ start_time: '09:00', end_time: '14:00' }] }
    }
  };

  it('reports 100% when every item is satisfied', () => {
    const { result } = renderHook(() => useProfileCompletion(fullProfile));

    expect(result.current.percentage).toBe(100);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.hasBlockingGap).toBe(false);
    expect(result.current.missing).toHaveLength(0);
    expect(result.current.completed).toHaveLength(result.current.items.length);
  });

  it('reports 0% and flags a blocking gap when the profile is null', () => {
    const { result } = renderHook(() => useProfileCompletion(null));

    expect(result.current.percentage).toBe(0);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.hasBlockingGap).toBe(true);
    expect(result.current.missing.length).toBeGreaterThan(0);
    // All four legally-blocking items (specialty, cedula, office, schedule)
    // must be flagged as blocking when there is no profile at all.
    const blockingIds = result.current.missing
      .filter(m => m.blocking)
      .map(m => m.id)
      .sort();
    expect(blockingIds).toEqual(['cedula', 'office', 'schedule', 'specialty']);
  });

  it('flags "office" and "schedule" as blocking gaps when they are missing but the doctor is otherwise set up', () => {
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        offices: [],
        schedule: null
      })
    );

    expect(result.current.isComplete).toBe(false);
    expect(result.current.hasBlockingGap).toBe(true);
    const missingIds = result.current.missing.map(m => m.id).sort();
    // `address` depends on having at least one office, so it is missing too.
    expect(missingIds).toEqual(['address', 'office', 'schedule']);
  });

  it('treats a schedule where every day is inactive as "no schedule"', () => {
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        schedule: {
          monday: { is_active: false, time_blocks: [] },
          tuesday: { is_active: false, time_blocks: [] }
        }
      })
    );

    const scheduleItem = result.current.items.find(i => i.id === 'schedule');
    expect(scheduleItem?.done).toBe(false);
    expect(result.current.hasBlockingGap).toBe(true);
  });

  it('accepts weekly_schedule as an alias for schedule', () => {
    // Some backend responses use `weekly_schedule` instead of `schedule` — the
    // hook should detect either.
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        schedule: undefined,
        weekly_schedule: {
          tuesday: { is_active: true, time_blocks: [{ start_time: '08:00', end_time: '12:00' }] }
        }
      })
    );

    const scheduleItem = result.current.items.find(i => i.id === 'schedule');
    expect(scheduleItem?.done).toBe(true);
  });

  it('accepts an array-shaped schedule', () => {
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        schedule: [
          { day_of_week: 1, is_active: true, time_blocks: [{ start_time: '09:00', end_time: '13:00' }] }
        ]
      })
    );

    const scheduleItem = result.current.items.find(i => i.id === 'schedule');
    expect(scheduleItem?.done).toBe(true);
  });

  it('detects the cédula professional document by Spanish name, with or without accent', () => {
    const noAccent = {
      ...fullProfile,
      documents: [{ document_name: 'Cedula Profesional', document_value: '1234567' }]
    };
    const accented = {
      ...fullProfile,
      documents: [{ document_name: 'Cédula Profesional', document_value: '1234567' }]
    };
    const alternate = {
      ...fullProfile,
      documents: [{ type_name: 'Cédula profesional', value: '1234567' }]
    };

    expect(
      renderHook(() => useProfileCompletion(noAccent)).result.current.items.find(
        i => i.id === 'cedula'
      )?.done
    ).toBe(true);
    expect(
      renderHook(() => useProfileCompletion(accented)).result.current.items.find(
        i => i.id === 'cedula'
      )?.done
    ).toBe(true);
    expect(
      renderHook(() => useProfileCompletion(alternate)).result.current.items.find(
        i => i.id === 'cedula'
      )?.done
    ).toBe(true);
  });

  it('flags cédula as missing when the document type matches but the value is blank', () => {
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        documents: [{ document_name: 'Cédula Profesional', document_value: '   ' }]
      })
    );

    const cedulaItem = result.current.items.find(i => i.id === 'cedula');
    expect(cedulaItem?.done).toBe(false);
  });

  it('accepts person_documents as an alias for documents', () => {
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        documents: undefined,
        person_documents: [{ document_name: 'Cédula Profesional', document_value: '12345678' }]
      })
    );

    const cedulaItem = result.current.items.find(i => i.id === 'cedula');
    expect(cedulaItem?.done).toBe(true);
  });

  it('accepts specialty via nested specialty.id when specialty_id is not present', () => {
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        specialty_id: undefined,
        specialty: { id: 7, name: 'Pediatría' }
      })
    );

    const specialtyItem = result.current.items.find(i => i.id === 'specialty');
    expect(specialtyItem?.done).toBe(true);
  });

  it('accepts phone via either primary_phone or phone field', () => {
    const withPhoneField = {
      ...fullProfile,
      primary_phone: undefined,
      phone: '+525599998888'
    };

    const { result } = renderHook(() => useProfileCompletion(withPhoneField));
    const phoneItem = result.current.items.find(i => i.id === 'phone');
    expect(phoneItem?.done).toBe(true);
  });

  it('computes percentage as the proportion of completed items', () => {
    // fullProfile has 7 items; start from full and knock one off.
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        appointment_duration: undefined
      })
    );

    // 6 of 7 items done → 86%
    expect(result.current.items).toHaveLength(7);
    expect(result.current.completed).toHaveLength(6);
    expect(result.current.percentage).toBe(86);
    // Only soft gap missing — must not be flagged as blocking.
    expect(result.current.hasBlockingGap).toBe(false);
  });

  it('does not treat soft gaps (phone, address, duration) as blocking', () => {
    // Strip only the soft-gap fields from fullProfile.
    const { result } = renderHook(() =>
      useProfileCompletion({
        ...fullProfile,
        primary_phone: '',
        appointment_duration: null,
        offices: [{ id: 1, name: 'Consultorio' }] // no address
      })
    );

    expect(result.current.hasBlockingGap).toBe(false);
    expect(result.current.isComplete).toBe(false);
    const missingIds = result.current.missing.map(m => m.id).sort();
    expect(missingIds).toEqual(['address', 'appointment_duration', 'phone']);
  });
});
