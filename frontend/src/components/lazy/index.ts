import { lazy } from 'react';

// Lazy load heavy components
export const ConsultationDialog = lazy(() => import('../dialogs/ConsultationDialog'));
export const PatientDialog = lazy(() => import('../dialogs/PatientDialog'));
export const DigitalSignatureDialog = lazy(() => import('../dialogs/DigitalSignatureDialog'));
export const ScheduleConfigDialog = lazy(() => import('../dialogs/ScheduleConfigDialog'));

// Lazy load views
export const DashboardView = lazy(() => import('../views/DashboardView'));
export const PatientsViewSmart = lazy(() => import('../views/PatientsViewSmart'));
export const ConsultationsViewSmart = lazy(() => import('../views/ConsultationsViewSmart'));
export const AgendaView = lazy(() => import('../views/AgendaView'));
export const DoctorProfileView = lazy(() => import('../views/DoctorProfileView'));

// Lazy load auth components
export const RegisterView = lazy(() => import('../auth/RegisterView'));

// Lazy load heavy common components. These files expose named exports
// (no default), so we wrap each in `{ default: ... }` so `React.lazy`
// gets the shape it expects.
export const SmartTable = lazy(() =>
  import('../common/SmartTable').then((m) => ({ default: m.SmartTable }))
);
export const EnhancedErrorDisplay = lazy(() => import('../common/EnhancedErrorDisplay'));
export const IntelligentSearch = lazy(() =>
  import('../common/IntelligentSearch').then((m) => ({ default: m.IntelligentSearch }))
);
export const SmartLoadingState = lazy(() =>
  import('../common/SmartLoadingState').then((m) => ({ default: m.SmartLoadingState }))
);