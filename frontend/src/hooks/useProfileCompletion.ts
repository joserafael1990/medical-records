import { useMemo } from 'react';

export interface CompletionItem {
  id: string;
  label: string;
  done: boolean;
  /**
   * If `true`, the item must be completed before the doctor can perform core
   * actions (schedule appointments, issue prescriptions). The banner surfaces
   * these first.
   */
  blocking?: boolean;
  /**
   * Optional deep-link hint consumed by the banner to route the doctor to the
   * right settings screen. Kept as a string so the caller owns the routing
   * table (this hook doesn't know about react-router).
   */
  target?: string;
  /** Short explanation of why this item blocks core workflows. */
  hint?: string;
}

export interface ProfileCompletionResult {
  items: CompletionItem[];
  missing: CompletionItem[];
  completed: CompletionItem[];
  percentage: number;
  isComplete: boolean;
  hasBlockingGap: boolean;
  /** True once the profile has enough data loaded to be evaluated.
   *  Callers should render nothing while hydrated=false to avoid the
   *  "Falta cédula" flash while documents load from a secondary call. */
  hydrated: boolean;
}

const hasActiveSchedule = (schedule: any): boolean => {
  if (!schedule) return false;
  // A day is considered scheduled if is_active is true — same logic as useScheduleData.
  // Do NOT require time_blocks.length > 0: the DB may store schedule via start_time/end_time columns
  // rather than a time_blocks JSON array.
  if (Array.isArray(schedule)) {
    return schedule.some((day: any) => !!day?.is_active);
  }
  if (typeof schedule === 'object') {
    return Object.values(schedule).some((day: any) => !!day?.is_active);
  }
  return false;
};

const hasCedula = (documents: any[] | undefined): boolean => {
  if (!Array.isArray(documents)) return false;
  // Accept any professional document with a non-empty value (cédula, colegiatura, matrícula, etc.)
  return documents.some((d: any) => {
    const value = (d?.document_value || d?.value || '').toString().trim();
    return value.length > 0;
  });
};

/**
 * Computes which doctor-profile fields are still missing after a quick
 * registration. Used by `ProfileCompletionBanner` and anywhere else that needs
 * to guide the doctor toward finishing setup (e.g. blocking appointment
 * creation when there are no offices or schedules).
 */
export const useProfileCompletion = (doctorProfile: any): ProfileCompletionResult => {
  return useMemo<ProfileCompletionResult>(() => {
    const offices: any[] = Array.isArray(doctorProfile?.offices) ? doctorProfile.offices : [];
    // hydrated = at least one document-bearing array is present. Distinguishes
    // "profile not fetched yet" (undefined) from "fetched and empty" ([]).
    // Without this, banners flash "Falta cédula" during the 1-3s window while
    // the profile loads from /api/me and the documents arrive from a later call.
    const hydrated =
      !!doctorProfile &&
      (Array.isArray(doctorProfile?.documents) ||
        Array.isArray(doctorProfile?.person_documents) ||
        Array.isArray(doctorProfile?.professional_documents));
    const documents: any[] = Array.isArray(doctorProfile?.documents)
      ? doctorProfile.documents
      : Array.isArray(doctorProfile?.person_documents)
        ? doctorProfile.person_documents
        : Array.isArray(doctorProfile?.professional_documents)
          ? doctorProfile.professional_documents
          : [];
    const schedule = doctorProfile?.schedule || doctorProfile?.weekly_schedule || null;

    const items: CompletionItem[] = [
      {
        id: 'specialty',
        label: 'Especialidad médica',
        done: !!doctorProfile?.specialty_id || !!doctorProfile?.specialty?.id,
        blocking: true,
        target: 'profile',
        hint: 'Requerido por NOM-004 para emitir recetas y expedientes clínicos válidos.'
      },
      {
        id: 'cedula',
        label: 'Cédula profesional',
        done: !!doctorProfile?.professional_license || hasCedula(documents),
        blocking: true,
        target: 'cedula',
        hint: 'Obligatoria para acreditar tu ejercicio profesional ante la SSA y en cada expediente.'
      },
      {
        id: 'office',
        label: 'Al menos un consultorio',
        done: offices.length > 0,
        blocking: true,
        target: 'offices',
        hint: 'Sin consultorio no puedes agendar citas — las citas siempre se asocian a un lugar físico o virtual.'
      },
      {
        id: 'schedule',
        label: 'Horarios de atención',
        done: hasActiveSchedule(schedule),
        blocking: true,
        target: 'schedule',
        hint: 'El sistema bloquea fechas sin horario activo para que no lleguen citas fuera de tu disponibilidad.'
      },
      {
        id: 'phone',
        label: 'Teléfono de contacto',
        done: !!(doctorProfile?.primary_phone || doctorProfile?.phone)?.toString().trim(),
        target: undefined
      },
      {
        id: 'address',
        label: 'Dirección del consultorio',
        done: offices.some((o: any) => !!(o?.address || o?.office_address)),
        target: 'offices'
      },
      {
        id: 'appointment_duration',
        label: 'Duración de la consulta',
        done: !!doctorProfile?.appointment_duration,
        target: undefined
      }
    ];

    const completed = items.filter(i => i.done);
    const missing = items.filter(i => !i.done);
    const percentage = items.length > 0 ? Math.round((completed.length / items.length) * 100) : 100;

    return {
      items,
      missing,
      completed,
      percentage,
      isComplete: missing.length === 0,
      hasBlockingGap: missing.some(i => i.blocking),
      hydrated
    };
  }, [doctorProfile]);
};

export default useProfileCompletion;
