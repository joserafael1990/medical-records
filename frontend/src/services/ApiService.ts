import { AuthService } from './auth/AuthService';
import { PatientService } from './patients/PatientService';
import { AppointmentService } from './appointments/AppointmentService';
import { ConsultationService } from './consultations/ConsultationService';
import { CatalogService } from './catalogs/CatalogService';
import { DocumentService } from './documents/DocumentService';
import { ClinicalStudyService } from './clinical-studies/ClinicalStudyService';
import { DoctorService } from './doctors/DoctorService';
import { OfficeService } from './offices/OfficeService';
import { WhatsAppService } from './whatsapp/WhatsAppService';
import { AnalyticsService } from './analytics/AnalyticsService';
import { logger } from '../utils/logger';

/**
 * Main API Service that aggregates all domain-specific services
 * This provides a unified interface for all API operations
 */
export class ApiService {
  public auth: AuthService;
  public patients: PatientService;
  public appointments: AppointmentService;
  public consultations: ConsultationService;
  public catalogs: CatalogService;
  public documents: DocumentService;
  public clinicalStudies: ClinicalStudyService;
  public doctors: DoctorService;
  public offices: OfficeService;
  public whatsapp: WhatsAppService;
  public analytics: AnalyticsService;

  constructor() {
    this.auth = new AuthService();
    this.patients = new PatientService();
    this.appointments = new AppointmentService();
    this.consultations = new ConsultationService();
    this.catalogs = new CatalogService();
    this.documents = new DocumentService();
    this.clinicalStudies = new ClinicalStudyService();
    this.doctors = new DoctorService();
    this.offices = new OfficeService();
    this.whatsapp = new WhatsAppService();
    this.analytics = new AnalyticsService();
  }

  // Convenience methods for common operations
  async getDashboardData(): Promise<any> {
    try {
      logger.debug('Fetching dashboard data', undefined, 'api');
      // Use appointments service's api instance (all services share the same base)
      const response = await this.appointments.api.get<any>('/api/dashboard');
      logger.debug('Dashboard data fetched successfully', undefined, 'api');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch dashboard data', error, 'api');
      throw error;
    }
  }

  async searchAll(query: string): Promise<{
    patients: any[];
    appointments: any[];
    consultations: any[];
  }> {
    try {
      const [patients, appointments, consultations] = await Promise.all([
        this.patients.searchPatients(query),
        this.appointments.getAppointments(), // You might want to add search to appointments
        this.consultations.searchConsultations(query)
      ]);

      return {
        patients,
        appointments,
        consultations
      };
    } catch (error) {
      console.error('Failed to search all:', error);
      throw error;
    }
  }

  async exportAll(format: 'csv' | 'excel' = 'csv'): Promise<{
    patients: Blob;
    appointments: Blob;
    consultations: Blob;
  }> {
    try {
      const [patients, appointments, consultations] = await Promise.all([
        this.patients.exportPatients(format),
        this.appointments.exportAppointments(format),
        this.consultations.exportConsultations(format)
      ]);

      return {
        patients,
        appointments,
        consultations
      };
    } catch (error) {
      console.error('Failed to export all:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export individual services for direct access if needed
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
export type { DashboardMetrics } from './analytics/AnalyticsService';
