import { AuthService } from './auth/AuthService';
import { PatientService } from './patients/PatientService';
import { AppointmentService } from './appointments/AppointmentService';
import { ConsultationService } from './consultations/ConsultationService';

/**
 * Main API Service that aggregates all domain-specific services
 * This provides a unified interface for all API operations
 */
export class ApiService {
  public auth: AuthService;
  public patients: PatientService;
  public appointments: AppointmentService;
  public consultations: ConsultationService;

  constructor() {
    this.auth = new AuthService();
    this.patients = new PatientService();
    this.appointments = new AppointmentService();
    this.consultations = new ConsultationService();
  }

  // Convenience methods for common operations
  async getDashboardData(): Promise<any> {
    try {
      const [patients, appointments, consultations] = await Promise.all([
        this.patients.getPatientStatistics(),
        this.appointments.getAppointmentStatistics(),
        this.consultations.getConsultationStatistics()
      ]);

      return {
        patients,
        appointments,
        consultations
      };
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
