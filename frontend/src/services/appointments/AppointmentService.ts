import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Appointment, AppointmentFormData, AppointmentUpdateData } from '../../types';
import { logger } from '../../utils/logger';

export class AppointmentService extends ApiBase {
  async getAppointments(): Promise<Appointment[]> {
    try {
      logger.api.info('Fetching appointments');
      const response = await this.api.get<Appointment[]>('/api/appointments');
      logger.api.success('Appointments fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch appointments:', error);
      throw error;
    }
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    try {
      logger.api.info('Fetching appointment by ID:', id);
      const response = await this.api.get<Appointment>(`/api/appointments/${id}`);
      logger.api.success('Appointment fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch appointment:', error);
      throw error;
    }
  }

  async createAppointment(appointmentData: AppointmentFormData): Promise<Appointment> {
    try {
      logger.api.info('Creating appointment for patient:', appointmentData.patient_id);
      const response = await this.api.post<Appointment>('/api/appointments', appointmentData);
      logger.api.success('Appointment created successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, appointmentData: AppointmentUpdateData): Promise<Appointment> {
    try {
      logger.api.info('Updating appointment:', id);
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
      logger.api.success('Appointment updated successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to update appointment:', error);
      throw error;
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    try {
      logger.api.info('Deleting appointment:', id);
      await this.api.delete(`/api/appointments/${id}`);
      logger.api.success('Appointment deleted successfully');
    } catch (error: any) {
      logger.api.error('Failed to delete appointment:', error);
      throw error;
    }
  }

  async getAvailableTimes(doctorId: string, date: string): Promise<any[]> {
    try {
      logger.api.info('Fetching available times for doctor:', doctorId, 'on date:', date);
      const response = await this.api.get<any[]>(`/api/schedule/available-times?doctor_id=${doctorId}&date=${date}`);
      logger.api.success('Available times fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch available times:', error);
      throw error;
    }
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    try {
      logger.api.info('Fetching appointments for date:', date);
      const response = await this.api.get<Appointment[]>(`/api/appointments/date/${date}`);
      logger.api.success('Appointments fetched for date');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch appointments for date:', error);
      throw error;
    }
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    try {
      logger.api.info('Fetching appointments for patient:', patientId);
      const response = await this.api.get<Appointment[]>(`/api/appointments/patient/${patientId}`);
      logger.api.success('Appointments fetched for patient');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch appointments for patient:', error);
      throw error;
    }
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    try {
      logger.api.info('Fetching appointments for doctor:', doctorId);
      const response = await this.api.get<Appointment[]>(`/api/appointments/doctor/${doctorId}`);
      logger.api.success('Appointments fetched for doctor');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch appointments for doctor:', error);
      throw error;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<void> {
    try {
      logger.api.info('Cancelling appointment:', id);
      await this.api.post(`/api/appointments/${id}/cancel`, { reason });
      logger.api.success('Appointment cancelled successfully');
    } catch (error: any) {
      logger.api.error('Failed to cancel appointment:', error);
      throw error;
    }
  }

  async rescheduleAppointment(id: string, newDateTime: string): Promise<Appointment> {
    try {
      logger.api.info('Rescheduling appointment:', id, 'to:', newDateTime);
      const response = await this.api.post<Appointment>(`/api/appointments/${id}/reschedule`, {
        new_date_time: newDateTime
      });
      logger.api.success('Appointment rescheduled successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to reschedule appointment:', error);
      throw error;
    }
  }

  async sendAppointmentReminder(appointmentId: string): Promise<void> {
    try {
      logger.api.info('Sending appointment reminder for:', appointmentId);
      await this.api.post(`/api/whatsapp/appointment-reminder/${appointmentId}`);
      logger.api.success('Appointment reminder sent successfully');
    } catch (error: any) {
      logger.api.error('Failed to send appointment reminder:', error);
      throw error;
    }
  }

  async getAppointmentStatistics(): Promise<any> {
    try {
      logger.api.info('Fetching appointment statistics');
      const response = await this.api.get('/api/appointments/statistics');
      logger.api.success('Appointment statistics fetched');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch appointment statistics:', error);
      throw error;
    }
  }

  async exportAppointments(format: 'csv' | 'excel' = 'csv', dateRange?: { start: string; end: string }): Promise<Blob> {
    try {
      logger.api.info('Exporting appointments in format:', format);
      
      let url = `/api/appointments/export?format=${format}`;
      if (dateRange) {
        url += `&start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      logger.api.success('Appointments exported successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to export appointments:', error);
      throw error;
    }
  }
}
