import React, { lazy } from 'react';

// Lazy load components for better performance and code splitting
export const DashboardView = lazy(() => import('./views/DashboardView'));
export const PatientsViewSmart = lazy(() => import('./views/PatientsView'));
export const ConsultationsViewSmart = lazy(() => import('./views/ConsultationsView'));
export const AgendaView = lazy(() => import('./views/AgendaView'));
export const MedicalRecordsView = lazy(() => import('./views/MedicalRecordsView'));

// Dialog components
export const PatientDialog = lazy(() => import('./dialogs/PatientDialog'));
export const ConsultationDialog = lazy(() => import('./dialogs/ConsultationDialog'));
export const AppointmentDialog = lazy(() => import('./dialogs/AppointmentDialog'));
export const ClinicalStudyDialog = lazy(() => import('./dialogs/ClinicalStudyDialog'));

// Profile components
export const DoctorProfileView = lazy(() => import('./views/DoctorProfileView'));
export const DoctorProfileDialog = lazy(() => import('./dialogs/DoctorProfileDialog'));

// Export default for backwards compatibility
export default {
  DashboardView,
  PatientsViewSmart,
  ConsultationsViewSmart,
  AgendaView,
  MedicalRecordsView,
  PatientDialog,
  ConsultationDialog,
  AppointmentDialog,
  ClinicalStudyDialog,
  DoctorProfileView,
  DoctorProfileDialog
};

