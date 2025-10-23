import { lazy } from 'react';

// Lazy load heavy components
export const ConsultationDialog = lazy(() => import('../dialogs/ConsultationDialog'));
export const ConsultationDialogRefactored = lazy(() => import('../dialogs/ConsultationDialogRefactored'));
export const AppointmentDialog = lazy(() => import('../dialogs/AppointmentDialog'));
export const AppointmentDialogRefactored = lazy(() => import('../dialogs/AppointmentDialogRefactored'));
export const PatientDialog = lazy(() => import('../dialogs/PatientDialog'));
export const PatientDialogRefactored = lazy(() => import('../dialogs/PatientDialogRefactored'));
export const DigitalSignatureDialog = lazy(() => import('../dialogs/DigitalSignatureDialog'));
export const ScheduleConfigDialog = lazy(() => import('../dialogs/ScheduleConfigDialog'));

// Lazy load views
export const DashboardView = lazy(() => import('../views/DashboardView'));
export const PatientsViewSmart = lazy(() => import('../views/PatientsViewSmart'));
export const ConsultationsViewSmart = lazy(() => import('../views/ConsultationsViewSmart'));
export const AgendaView = lazy(() => import('../views/AgendaView'));
export const DoctorProfileView = lazy(() => import('../views/DoctorProfileView'));
export const StyleGuideView = lazy(() => import('../views/StyleGuideView'));

// Lazy load auth components
export const RegisterView = lazy(() => import('../auth/RegisterView'));
export const RegisterViewRefactored = lazy(() => import('../auth/RegisterViewRefactored'));

// Lazy load heavy common components
export const SmartTable = lazy(() => import('../common/SmartTable'));
export const EnhancedErrorDisplay = lazy(() => import('../common/EnhancedErrorDisplay'));
export const IntelligentSearch = lazy(() => import('../common/IntelligentSearch'));
export const SmartLoadingState = lazy(() => import('../common/SmartLoadingState'));