// Export main API service
export { ApiService, apiService } from './ApiService';

// Export individual services
export { AuthService } from './auth/AuthService';
export { PatientService } from './patients/PatientService';
export { AppointmentService } from './appointments/AppointmentService';
export { ConsultationService } from './consultations/ConsultationService';
export { CatalogService } from './catalogs/CatalogService';
export { DocumentService } from './documents/DocumentService';
export { ClinicalStudyService } from './clinical-studies/ClinicalStudyService';
export { DoctorService } from './doctors/DoctorService';
export { OfficeService } from './offices/OfficeService';
export { WhatsAppService } from './whatsapp/WhatsAppService';
export { AnalyticsService } from './analytics/AnalyticsService';
export { AvatarService } from './avatars/AvatarService';
export type { DashboardMetrics } from './analytics/AnalyticsService';

// Export base classes and types
export { ApiBase } from './base/ApiBase';
export type { ApiResponse, ApiError } from './base/ApiBase';

// Export service types
export type { LoginCredentials, RegisterData, AuthResponse } from './auth/AuthService';
