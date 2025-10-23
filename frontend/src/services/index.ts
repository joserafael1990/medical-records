// Export main API service
export { ApiService, apiService } from './ApiService';

// Export individual services
export { AuthService } from './auth/AuthService';
export { PatientService } from './patients/PatientService';
export { AppointmentService } from './appointments/AppointmentService';
export { ConsultationService } from './consultations/ConsultationService';

// Export base classes and types
export { ApiBase } from './base/ApiBase';
export type { ApiResponse, ApiError } from './base/ApiBase';

// Export service types
export type { LoginCredentials, RegisterData, AuthResponse } from './auth/AuthService';
