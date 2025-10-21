
import { lazy } from 'react';

// Lazy load views for code splitting
export const DashboardView = lazy(() => import('../views/DashboardView'));
export const PatientsView = lazy(() => import('../views/PatientsView'));
export const PatientsViewSmart = lazy(() => import('../views/PatientsViewSmart'));
export const ConsultationsView = lazy(() => import('../views/ConsultationsView'));
export const ConsultationsViewSmart = lazy(() => import('../views/ConsultationsViewSmart'));
export const AgendaView = lazy(() => import('../views/AgendaView'));
export const DoctorProfileView = lazy(() => import('../views/DoctorProfileView'));

// Lazy load dialogs
export const PatientDialog = lazy(() => import('../dialogs/PatientDialog'));
export const ConsultationDialog = lazy(() => import('../dialogs/ConsultationDialog'));
export const AppointmentDialog = lazy(() => import('../dialogs/AppointmentDialog'));
export const ClinicalStudyDialog = lazy(() => import('../dialogs/ClinicalStudyDialog'));
export const DoctorProfileDialog = lazy(() => import('../dialogs/DoctorProfileDialog'));

// Lazy load heavy components
export const VirtualizedTable = lazy(() => import('../common/VirtualizedTable'));
