import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Consultation, ConsultationFormData } from '../../types';
import { logger } from '../../utils/logger';

export class ConsultationService extends ApiBase {
  async getConsultations(): Promise<Consultation[]> {
    try {
      logger.api.info('Fetching consultations');
      const response = await this.api.get<Consultation[]>('/api/consultations');
      logger.api.success('Consultations fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations:', error);
      throw error;
    }
  }

  async getConsultationById(id: string): Promise<Consultation> {
    try {
      logger.api.info('Fetching consultation by ID:', id);
      const response = await this.api.get<Consultation>(`/api/consultations/${id}`);
      logger.api.success('Consultation fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation:', error);
      throw error;
    }
  }

  async createConsultation(consultationData: ConsultationFormData): Promise<Consultation> {
    try {
      logger.api.info('Creating consultation for patient:', consultationData.patient_id);
      const response = await this.api.post<Consultation>('/api/consultations', consultationData);
      logger.api.success('Consultation created successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create consultation:', error);
      throw error;
    }
  }

  async updateConsultation(id: string, consultationData: Partial<ConsultationFormData>): Promise<Consultation> {
    try {
      logger.api.info('Updating consultation:', id);
      const response = await this.api.put<Consultation>(`/api/consultations/${id}`, consultationData);
      logger.api.success('Consultation updated successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to update consultation:', error);
      throw error;
    }
  }

  async deleteConsultation(id: string): Promise<void> {
    try {
      logger.api.info('Deleting consultation:', id);
      await this.api.delete(`/api/consultations/${id}`);
      logger.api.success('Consultation deleted successfully');
    } catch (error: any) {
      logger.api.error('Failed to delete consultation:', error);
      throw error;
    }
  }

  async getConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    try {
      logger.api.info('Fetching consultations for patient:', patientId);
      const response = await this.api.get<Consultation[]>(`/api/consultations/patient/${patientId}`);
      logger.api.success('Consultations fetched for patient');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for patient:', error);
      throw error;
    }
  }

  async getConsultationsByDoctor(doctorId: string): Promise<Consultation[]> {
    try {
      logger.api.info('Fetching consultations for doctor:', doctorId);
      const response = await this.api.get<Consultation[]>(`/api/consultations/doctor/${doctorId}`);
      logger.api.success('Consultations fetched for doctor');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for doctor:', error);
      throw error;
    }
  }

  async getConsultationsByDate(date: string): Promise<Consultation[]> {
    try {
      logger.api.info('Fetching consultations for date:', date);
      const response = await this.api.get<Consultation[]>(`/api/consultations/date/${date}`);
      logger.api.success('Consultations fetched for date');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for date:', error);
      throw error;
    }
  }

  async getConsultationStatistics(): Promise<any> {
    try {
      logger.api.info('Fetching consultation statistics');
      const response = await this.api.get('/api/consultations/statistics');
      logger.api.success('Consultation statistics fetched');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation statistics:', error);
      throw error;
    }
  }

  async exportConsultations(format: 'csv' | 'excel' | 'pdf' = 'csv', dateRange?: { start: string; end: string }): Promise<Blob> {
    try {
      logger.api.info('Exporting consultations in format:', format);
      
      let url = `/api/consultations/export?format=${format}`;
      if (dateRange) {
        url += `&start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      
      logger.api.success('Consultations exported successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to export consultations:', error);
      throw error;
    }
  }

  async generateConsultationReport(consultationId: string): Promise<Blob> {
    try {
      logger.api.info('Generating consultation report for:', consultationId);
      const response = await this.api.get(`/api/consultations/${consultationId}/report`, {
        responseType: 'blob'
      });
      logger.api.success('Consultation report generated successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to generate consultation report:', error);
      throw error;
    }
  }

  async searchConsultations(query: string): Promise<Consultation[]> {
    try {
      logger.api.info('Searching consultations with query:', query);
      const response = await this.api.get<Consultation[]>(`/api/consultations/search?q=${encodeURIComponent(query)}`);
      logger.api.success('Consultation search completed');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to search consultations:', error);
      throw error;
    }
  }

  async getConsultationHistory(patientId: string): Promise<Consultation[]> {
    try {
      logger.api.info('Fetching consultation history for patient:', patientId);
      const response = await this.api.get<Consultation[]>(`/api/consultations/history/${patientId}`);
      logger.api.success('Consultation history fetched');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation history:', error);
      throw error;
    }
  }
}
