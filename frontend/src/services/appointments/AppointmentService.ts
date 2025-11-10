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
      logger.debug('Fetching appointments', { filters }, 'api');
      const response = await this.api.get<Appointment[]>('/api/appointments', { 
        params: filters 
      });
      logger.debug('Appointments fetched successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments', error, 'api');
      throw error;
    }
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    try {
      logger.debug('Fetching appointment by ID', { id }, 'api');
      const response = await this.api.get<Appointment>(`/api/appointments/${id}`);
      logger.debug('Appointment fetched successfully', undefined, 'api');
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
      logger.debug('Creating appointment for patient:', appointmentData.patient_id);
      const response = await this.api.post<Appointment>('/api/appointments', appointmentData);
      logger.debug('Appointment created successfully');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to create appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    try {
      logger.debug('Updating appointment:', id);
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
      logger.debug('Appointment updated successfully');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to update appointment:', error);
      throw error;
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    try {
      logger.debug('Deleting appointment:', id);
      await this.api.delete(`/api/appointments/${id}`);
      logger.debug('Appointment deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete appointment:', error);
      throw error;
    }
  }

  async getAvailableTimes(doctorId: string, date: string): Promise<any[]> {
    try {
      logger.debug('Fetching available times for doctor', { doctorId, date }, 'api');
      const response = await this.api.get<any[]>(`/api/schedule/available-times?doctor_id=${doctorId}&date=${date}`);
      logger.debug('Available times fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch available times:', error);
      throw error;
    }
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    try {
      logger.debug('Fetching appointments for date:', date);
      const response = await this.api.get<Appointment[]>(`/api/appointments/date/${date}`);
      logger.debug('Appointments fetched for date');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments for date:', error);
      throw error;
    }
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    try {
      logger.debug('Fetching appointments for patient:', patientId);
      const response = await this.api.get<Appointment[]>(`/api/appointments/patient/${patientId}`);
      logger.debug('Appointments fetched for patient');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments for patient:', error);
      throw error;
    }
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    try {
      logger.debug('Fetching appointments for doctor:', doctorId);
      const response = await this.api.get<Appointment[]>(`/api/appointments/doctor/${doctorId}`);
      logger.debug('Appointments fetched for doctor');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointments for doctor:', error);
      throw error;
    }
  }

  async cancelAppointment(id: string, reason?: string): Promise<void> {
    try {
      logger.debug('Cancelling appointment:', id);
      await this.api.delete(`/api/appointments/${id}`);
      logger.debug('Appointment cancelled successfully');
    } catch (error: any) {
      logger.error('Failed to cancel appointment:', error);
      throw error;
    }
  }

  async rescheduleAppointment(id: string, newDateTime: string): Promise<Appointment> {
    try {
      logger.debug('Rescheduling appointment', { id, newDateTime }, 'api');
      const response = await this.api.post<Appointment>(`/api/appointments/${id}/reschedule`, {
        new_date_time: newDateTime
      });
      logger.debug('Appointment rescheduled successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to reschedule appointment:', error);
      throw error;
    }
  }

  async sendAppointmentReminder(appointmentId: string): Promise<void> {
    try {
      logger.debug('Sending appointment reminder for:', appointmentId);
      await this.api.post(`/api/whatsapp/appointment-reminder/${appointmentId}`);
      logger.debug('Appointment reminder sent successfully');
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
      logger.debug('Fetching available slots for date:', targetDate);
      const response = await this.api.get<any[]>(`/api/appointments/available-slots?date=${targetDate}`);
      logger.debug('Available slots fetched successfully');
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
      logger.debug('Fetching available times for booking:', date);
      const response = await this.api.get<any>(`/api/appointments/available-times?date=${date}`);
      logger.debug('Available times response received', { 
        status: response.status, 
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        availableTimesCount: response.data?.available_times?.length || 0
      }, 'api');
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
      logger.debug('Fetching daily agenda for:', dateStr);
      const response = await this.api.get<Appointment[]>(`/api/appointments/calendar?date=${dateStr}`);
      logger.debug('Daily agenda fetched successfully');
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
      logger.debug('Fetching weekly agenda', { start, end }, 'api');
      const response = await this.api.get<Appointment[]>(`/api/appointments/calendar?start_date=${start}&end_date=${end}`);
      logger.debug('Weekly agenda fetched successfully', undefined, 'api');
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
      logger.debug('Fetching monthly agenda', { start, end }, 'api');
      const response = await this.api.get<Appointment[]>(`/api/appointments/calendar?start_date=${start}&end_date=${end}`);
      logger.debug('Monthly agenda fetched successfully', undefined, 'api');
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
      logger.debug('Creating agenda appointment');
      const response = await this.api.post<any>('/api/appointments', appointmentData);
      logger.debug('Agenda appointment created successfully');
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
      logger.debug('Updating agenda appointment:', id);
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
      logger.debug('Agenda appointment updated successfully');
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
      logger.debug('Deleting agenda appointment:', id);
      await this.api.delete(`/api/appointments/${id}`);
      logger.debug('Agenda appointment deleted successfully');
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
      logger.debug('Updating appointment status', { id, status }, 'api');
      const response = await this.api.put<Appointment>(`/api/appointments/${id}`, { status });
      logger.debug('Appointment status updated successfully', undefined, 'api');
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
      logger.debug('Bulk updating appointments');
      const response = await this.api.post('/api/appointments/bulk-update', { updates });
      logger.debug('Appointments bulk updated successfully');
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
      logger.debug('Fetching appointment types');
      const response = await this.api.get<any[]>('/api/appointment-types');
      logger.debug('Appointment types fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointment types', error);
      throw error;
    }
  }

  async getAppointmentStatistics(): Promise<any> {
    try {
      logger.debug('Fetching appointment statistics');
      const response = await this.api.get('/api/appointments/statistics');
      logger.debug('Appointment statistics fetched');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch appointment statistics:', error);
      throw error;
    }
  }

  async exportAppointments(format: 'csv' | 'excel' = 'csv', dateRange?: { start: string; end: string }): Promise<Blob> {
    try {
      logger.debug('Exporting appointments in format:', format);
      
      let url = `/api/appointments/export?format=${format}`;
      if (dateRange) {
        url += `&start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      logger.debug('Appointments exported successfully');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to export appointments:', error);
      throw error;
    }
  }
}
