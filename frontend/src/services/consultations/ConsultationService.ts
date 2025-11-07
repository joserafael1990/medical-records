import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Consultation, ConsultationFormData } from '../../types';
import { logger } from '../../utils/logger';

export class ConsultationService extends ApiBase {
  async getConsultations(): Promise<Consultation[]> {
    try {
      logger.debug('Fetching consultations', undefined, 'api');
      const response = await this.api.get<Consultation[]>('/api/consultations');
      logger.debug('Consultations fetched successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch consultations', error, 'api');
      throw error;
    }
  }

  async getConsultationById(id: string): Promise<Consultation> {
    try {
      logger.debug('Fetching consultation by ID', { id }, 'api');
      const response = await this.api.get<Consultation>(`/api/consultations/${id}`);
      logger.debug('Consultation fetched successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch consultation', error, 'api');
      throw error;
    }
  }

  async createConsultation(consultationData: ConsultationFormData): Promise<Consultation> {
    try {
      logger.debug('Creating consultation for patient', { patientId: consultationData.patient_id }, 'api');
      const response = await this.api.post<Consultation>('/api/consultations', consultationData);
      logger.debug('Consultation created successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create consultation:', error);
      throw error;
    }
  }

  async updateConsultation(id: string, consultationData: Partial<ConsultationFormData>): Promise<Consultation> {
    try {
      logger.debug('Updating consultation', { id }, 'api');
      const response = await this.api.put<Consultation>(`/api/consultations/${id}`, consultationData);
      logger.debug('Consultation updated successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to update consultation:', error);
      throw error;
    }
  }

  async deleteConsultation(id: string): Promise<void> {
    try {
      logger.debug('Deleting consultation', { id }, 'api');
      await this.api.delete(`/api/consultations/${id}`);
      logger.debug('Consultation deleted successfully', undefined, 'api');
    } catch (error: any) {
      logger.api.error('Failed to delete consultation:', error);
      throw error;
    }
  }

  async getConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    try {
      logger.debug('Fetching consultations for patient', { patientId }, 'api');
      const response = await this.api.get<Consultation[]>(`/api/consultations/patient/${patientId}`);
      logger.debug('Consultations fetched for patient', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for patient:', error);
      throw error;
    }
  }

  async getConsultationsByDoctor(doctorId: string): Promise<Consultation[]> {
    try {
      logger.debug('Fetching consultations for doctor', { doctorId }, 'api');
      const response = await this.api.get<Consultation[]>(`/api/consultations/doctor/${doctorId}`);
      logger.debug('Consultations fetched for doctor', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for doctor:', error);
      throw error;
    }
  }

  async getConsultationsByDate(date: string): Promise<Consultation[]> {
    try {
      logger.debug('Fetching consultations for date', { date }, 'api');
      const response = await this.api.get<Consultation[]>(`/api/consultations/date/${date}`);
      logger.debug('Consultations fetched for date', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for date:', error);
      throw error;
    }
  }

  async getConsultationStatistics(): Promise<any> {
    try {
      logger.debug('Fetching consultation statistics', undefined, 'api');
      const response = await this.api.get('/api/consultations/statistics');
      logger.debug('Consultation statistics fetched', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation statistics:', error);
      throw error;
    }
  }

  async exportConsultations(format: 'csv' | 'excel' | 'pdf' = 'csv', dateRange?: { start: string; end: string }): Promise<Blob> {
    try {
      logger.debug('Exporting consultations', { format, dateRange }, 'api');
      
      let url = `/api/consultations/export?format=${format}`;
      if (dateRange) {
        url += `&start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      logger.debug('Consultations exported successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to export consultations:', error);
      throw error;
    }
  }

  async generateConsultationReport(consultationId: string): Promise<Blob> {
    try {
      logger.debug('Generating consultation report', { consultationId }, 'api');
      const response = await this.api.get(`/api/consultations/${consultationId}/report`, {
        responseType: 'blob'
      });
      logger.debug('Consultation report generated successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to generate consultation report:', error);
      throw error;
    }
  }

  async searchConsultations(query: string): Promise<Consultation[]> {
    try {
      logger.debug('Searching consultations', { query }, 'api');
      const response = await this.api.get<Consultation[]>(`/api/consultations/search?q=${encodeURIComponent(query)}`);
      logger.debug('Consultation search completed', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to search consultations:', error);
      throw error;
    }
  }

  async getConsultationHistory(patientId: string): Promise<Consultation[]> {
    try {
      logger.debug('Fetching consultation history for patient', { patientId }, 'api');
      const response = await this.api.get<Consultation[]>(`/api/consultations/history/${patientId}`);
      logger.debug('Consultation history fetched', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation history:', error);
      throw error;
    }
  }
}
