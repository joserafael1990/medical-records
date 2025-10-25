// Views
export { default as DashboardView } from './views/DashboardView';
export { default as PatientsView } from './views/PatientsView';
export { default as PatientsViewSmart } from './views/PatientsViewSmart';
export { default as ConsultationsView } from './views/ConsultationsView';
export { default as ConsultationsViewSmart } from './views/ConsultationsViewSmart';
export { default as ConsultationDetailView } from './views/ConsultationDetailView';
export { default as DoctorProfileView } from './views/DoctorProfileView';
export { default as AgendaView } from './views/AgendaView';

// Dialogs
export { default as PatientDialog } from './dialogs/PatientDialog';
export { default as ConsultationDialog } from './dialogs/ConsultationDialog';
export { default as DoctorProfileDialog } from './dialogs/DoctorProfileDialog';
export { default as MedicalOrderDialog } from './dialogs/MedicalOrderDialog';

// Common
export { ErrorRibbon } from './common/ErrorRibbon';
export { default as VirtualizedTable } from './common/VirtualizedTable';
export { default as LoadingFallback } from './common/LoadingFallback';
export { default as MedicalOrdersSection } from './common/MedicalOrdersSection';
export { default as MedicalOrderPrintFormat } from './common/MedicalOrderPrintFormat';
export { StudyCatalogSelector } from './common/StudyCatalogSelector';
export { PrintPrescriptionButton } from './common/PrintPrescriptionButton';
export { PrintMedicalOrderButton } from './common/PrintMedicalOrderButton';
export { PrintButtons } from './common/PrintButtons';

// UX Improvements
export { SmartLoadingState, useSmartLoading } from './common/SmartLoadingState';
export { IntelligentSearch, useIntelligentSearch } from './common/IntelligentSearch';
export { ToastProvider, useToast, useSimpleToast } from './common/ToastNotification';
export { SmartTable, useSmartTable } from './common/SmartTable';
