import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Appointment, AppointmentFormData } from '../../types';
import { logger } from '../../utils/logger';

export class AppointmentService extends ApiBase {
  async getAppointments(filters?: {
    date?: string;
    status?: string;
    available_for_consultation?: boolean;
  }): Promise<Appointment[]> {
    try {
      const response = await this.api.get<Appointment[]>('/api/appointments', { 
        params: filters 
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments', error, 'api');
      throw error;
    }
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    try {
      const response = await this.api.get<Appointment>(`/api/appointments/${id}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointment', error, 'api');
      throw error;
    }
  }

  // Alias for compatibility
  async getAppointment(id: number | string): Promise<Appointment> {
    return this.getAppointmentById(String(id));
  }

  async createAppointment(appointmentData: AppointmentFormData): Promise<Appointment> {
    try {
      const response = await this.api.post<Appointment>('/api/appointments', appointmentData);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to create appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    try {
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to update appointment:', error);
      throw error;
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/appointments/${id}`);
    } catch (error: any) {
      logger.error('Failed to delete appointment:', error);
      throw error;
    }
  }

  async getAvailableTimes(doctorId: string, date: string): Promise<any[]> {
    try {
      const response = await this.api.get<any[]>(`/api/schedule/available-times?doctor_id=${doctorId}&date=${date}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch available times:', error);
      throw error;
    }
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    try {
      const response = await this.api.get<Appointment[]>(`/api/appointments/date/${date}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments for date:', error);
      throw error;
    }
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    try {
      const response = await this.api.get<Appointment[]>(`/api/appointments/patient/${patientId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments for patient:', error);
      throw error;
    }
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    try {
      const response = await this.api.get<Appointment[]>(`/api/appointments/doctor/${doctorId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments for doctor:', error);
      throw error;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<void> {
    try {
      await this.api.delete(`/api/appointments/${id}`);
    } catch (error: any) {
      logger.error('Failed to cancel appointment:', error);
      throw error;
    }
  }

  async rescheduleAppointment(id: string, newDateTime: string): Promise<Appointment> {
    try {
      const response = await this.api.post<Appointment>(`/api/appointments/${id}/reschedule`, {
        new_date_time: newDateTime
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to reschedule appointment:', error);
      throw error;
    }
  }

  async sendAppointmentReminder(appointmentId: string): Promise<void> {
    try {
      await this.api.post(`/api/whatsapp/appointment-reminder/${appointmentId}`);
    } catch (error: any) {
      logger.error('Failed to send appointment reminder:', error);
      throw error;
    }
  }

  /**
   * Get available slots for a specific date
   */
  async getAvailableSlots(targetDate: string): Promise<any[]> {
    try {
      const response = await this.api.get<any[]>(`/api/appointments/available-slots?date=${targetDate}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch available slots', error);
      throw error;
    }
  }

  /**
   * Get available times for booking on a specific date
   */
  async getAvailableTimesForBooking(date: string): Promise<any> {
    try {
      const response = await this.api.get<any>(`/api/appointments/available-times?date=${date}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch available times for booking', error, 'api');
      throw error;
    }
  }

  /**
   * Get daily agenda
   */
  async getDailyAgenda(targetDate?: string): Promise<Appointment[]> {
    try {
      const dateStr = targetDate || new Date().toISOString().split('T')[0];
      const response = await this.api.get<Appointment[]>(`/api/appointments/calendar?date=${dateStr}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch daily agenda', error);
      throw error;
    }
  }

  /**
   * Get weekly agenda
   */
  async getWeeklyAgenda(startDate?: string, endDate?: string): Promise<Appointment[]> {
    try {
      const start = startDate || new Date().toISOString().split('T')[0];
      const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await this.api.get<Appointment[]>(`/api/appointments/calendar?start_date=${start}&end_date=${end}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch weekly agenda', error);
      throw error;
    }
  }

  /**
   * Get monthly agenda
   */
  async getMonthlyAgenda(startDate?: string, endDate?: string): Promise<Appointment[]> {
    try {
      const start = startDate || new Date().toISOString().split('T')[0];
      const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await this.api.get<Appointment[]>(`/api/appointments/calendar?start_date=${start}&end_date=${end}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch monthly agenda', error);
      throw error;
    }
  }

  /**
   * Create agenda appointment
   */
  async createAgendaAppointment(appointmentData: any): Promise<any> {
    try {
      const response = await this.api.post<any>('/api/appointments', appointmentData);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to create agenda appointment', error);
      throw error;
    }
  }

  /**
   * Update agenda appointment
   */
  async updateAgendaAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    try {
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to update agenda appointment', error);
      throw error;
    }
  }

  /**
   * Delete agenda appointment
   */
  async deleteAgendaAppointment(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/appointments/${id}`);
    } catch (error: any) {
      logger.error('Failed to delete agenda appointment', error);
      throw error;
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    try {
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, { status });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to update appointment status', error);
      throw error;
    }
  }

  /**
   * Bulk update appointments
   */
  async bulkUpdateAppointments(updates: any[]): Promise<any> {
    try {
      const response = await this.api.post('/api/appointments/bulk-update', { updates });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to bulk update appointments', error);
      throw error;
    }
  }

  /**
   * Get appointment types
   */
  async getAppointmentTypes(): Promise<any[]> {
    try {
      const response = await this.api.get<any[]>('/api/appointment-types');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointment types', error);
      throw error;
    }
  }

  async getAppointmentStatistics(): Promise<any> {
    try {
      const response = await this.api.get('/api/appointments/statistics');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointment statistics:', error);
      throw error;
    }
  }

  async exportAppointments(format: 'csv' | 'excel' = 'csv', dateRange?: { start: string; end: string }): Promise<Blob> {
    try {
      let url = `/api/appointments/export?format=${format}`;
      if (dateRange) {
        url += `&start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('Failed to export appointments:', error);
      throw error;
    }
  }
}
