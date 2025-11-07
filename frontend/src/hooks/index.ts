// ============================================================================
// HOOKS BARREL EXPORT
// ============================================================================
//
// Centralizes all custom hook exports for easier imports and better
// code organization across the Historias Clínicas application.
//
// ============================================================================

// Core application hooks (actively used)
export { useAppState } from './useAppState';
export { useAppointmentManager } from './useAppointmentManager';

// New refactored hooks (extracted from App.tsx)
export { usePatientManagement } from './usePatientManagement';
export { useConsultationManagement } from './useConsultationManagement';
export { useEmergencyRelationships } from './useEmergencyRelationships';

// Consultation form hooks (extracted from ConsultationDialog)
export { useConsultationForm, type ConsultationFormData } from './useConsultationForm';
export { usePatientPreviousStudies } from './usePatientPreviousStudies';

// Patient form hooks (extracted from PatientDialog)
export { usePatientForm } from './usePatientForm';

// Appointment multi-office form hooks (extracted from AppointmentDialogMultiOffice)
export { useAppointmentMultiOfficeForm, formatPatientNameWithAge } from './useAppointmentMultiOfficeForm';

// Schedule config form hooks (extracted from ScheduleConfigDialog)
export { 
  useScheduleConfigForm, 
  DAYS_OF_WEEK,
  type TimeBlock,
  type ScheduleTemplate,
  type WeeklySchedule
} from './useScheduleConfigForm';

// Doctor profile view hooks (extracted from DoctorProfileView)
export { useDoctorProfileView } from './useDoctorProfileView';

// Agenda view hooks (extracted from AgendaView)
export { useAgendaView } from './useAgendaView';

// Enhanced UX Error Handling hooks
export { useLoadingStates } from './useLoadingStates';
export { useRealTimeValidation } from './useRealTimeValidation';
export { useFormErrorNavigation } from './useFormErrorNavigation';

// Individual hooks are imported directly by components as needed:
// - useDoctorProfile, useDoctorProfileCache
// - useDebounce, useTableSorting  
// - useMemoizedSearch, useMedicalTableColumns
// - useFormSubmission, useCRUD

// Note: Legacy hooks removed as they were not being used anywhere

// Hook type definitions
export interface HookReturnBase {
  isLoading: boolean;
  error: string | null;
}

export interface CRUDHookReturn<T> extends HookReturnBase {
  data: T[];
  create: (item: Omit<T, 'id'>) => Promise<T>;
  update: (id: string | number, item: Partial<T>) => Promise<T>;
  delete: (id: string | number) => Promise<void>;
  get: (id: string | number) => Promise<T>;
  getAll: () => Promise<T[]>;
}

export interface FormHookReturn {
  formData: any;
  setFormData: (data: any) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleSubmit: (data: any) => Promise<void>;
  resetForm: () => void;
}

// Hook categories for organization
export const HOOK_CATEGORIES = {
  CORE: 'core',
  DATA: 'data',
  FORM: 'form',
  UI: 'ui',
  UTILITY: 'utility'
} as const;

// Hook metadata for documentation
export const HOOK_METADATA = {
  totalHooks: 4, // Active hooks in barrel export
  activeHooks: ['useAppState', 'useAppointmentManager', 'usePatientManagement', 'useConsultationManagement'],
  refactoredHooks: ['usePatientManagement', 'useConsultationManagement'], // Extracted from App.tsx
  categories: Object.values(HOOK_CATEGORIES),
  description: 'Custom React hooks for Historias Clínicas application',
  lastUpdated: '2024-09-11',
  note: 'Major refactoring: Extracted patient and consultation logic from App.tsx'
};
