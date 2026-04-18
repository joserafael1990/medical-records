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
}

export interface ProfileCompletionResult {
  items: CompletionItem[];
  missing: CompletionItem[];
  completed: CompletionItem[];
  percentage: number;
  isComplete: boolean;
  hasBlockingGap: boolean;
}

const hasActiveSchedule = (schedule: any): boolean => {
  if (!schedule) return false;
  if (Array.isArray(schedule)) {
    return schedule.some((day: any) => day?.is_active && day?.time_blocks?.length);
  }
  if (typeof schedule === 'object') {
    return Object.values(schedule).some(
      (day: any) => day?.is_active && Array.isArray(day?.time_blocks) && day.time_blocks.length > 0
    );
  }
  return false;
};

const hasCedula = (documents: any[] | undefined): boolean => {
  if (!Array.isArray(documents)) return false;
  return documents.some((d: any) => {
    const name = (d?.document_name || d?.type_name || d?.name || '').toString().toLowerCase();
    const value = (d?.document_value || d?.value || '').toString().trim();
    return value.length > 0 && (name.includes('cédula') || name.includes('cedula'));
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
    const documents: any[] = Array.isArray(doctorProfile?.documents)
      ? doctorProfile.documents
      : Array.isArray(doctorProfile?.person_documents)
        ? doctorProfile.person_documents
        : [];
    const schedule = doctorProfile?.schedule || doctorProfile?.weekly_schedule || null;

    const items: CompletionItem[] = [
      {
        id: 'specialty',
        label: 'Especialidad médica',
        done: !!doctorProfile?.specialty_id || !!doctorProfile?.specialty?.id,
        blocking: true,
        target: 'profile'
      },
      {
        id: 'cedula',
        label: 'Cédula profesional',
        done: hasCedula(documents),
        blocking: true,
        target: 'profile'
      },
      {
        id: 'office',
        label: 'Al menos un consultorio',
        done: offices.length > 0,
        blocking: true, // can't create appointments without an office
        target: 'profile#offices'
      },
      {
        id: 'schedule',
        label: 'Horarios de atención',
        done: hasActiveSchedule(schedule),
        blocking: true, // can't let patients book without a schedule
        target: 'profile#schedule'
      },
      {
        id: 'phone',
        label: 'Teléfono de contacto',
        done: !!(doctorProfile?.primary_phone || doctorProfile?.phone)?.toString().trim(),
        target: 'profile'
      },
      {
        id: 'address',
        label: 'Dirección del consultorio',
        done: offices.some((o: any) => !!(o?.address || o?.office_address)),
        target: 'profile#offices'
      },
      {
        id: 'appointment_duration',
        label: 'Duración de la consulta',
        done: !!doctorProfile?.appointment_duration,
        target: 'profile'
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
      hasBlockingGap: missing.some(i => i.blocking)
    };
  }, [doctorProfile]);
};

export default useProfileCompletion;
