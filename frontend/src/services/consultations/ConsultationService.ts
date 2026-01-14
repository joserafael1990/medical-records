import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Consultation, ConsultationFormData, DocumentFolio } from '../../types';
import { logger } from '../../utils/logger';

export class ConsultationService extends ApiBase {
  async getConsultations(filters?: {
    patient_search?: string;
    date_from?: string;
    date_to?: string;
    doctor_name?: string;
  }): Promise<Consultation[]> {
    try {
      const response = await this.api.get<Consultation[]>('/api/consultations', {
        params: filters
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch consultations', error, 'api');
      throw error;
    }
  }

  async getConsultationById(id: string): Promise<Consultation> {
    try {
      const response = await this.api.get<Consultation>(`/api/consultations/${id}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch consultation', error, 'api');
      throw error;
    }
  }

  async createConsultation(consultationData: ConsultationFormData): Promise<Consultation> {
    try {
      const response = await this.api.post<Consultation>('/api/consultations', consultationData);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create consultation:', error);
      throw error;
    }
  }

  async updateConsultation(id: string, consultationData: Partial<ConsultationFormData>): Promise<Consultation> {
    try {
      const response = await this.api.put<Consultation>(`/api/consultations/${id}`, consultationData);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to update consultation:', error);
      throw error;
    }
  }

  async deleteConsultation(id: string): Promise<void> {
    try {
      await this.api.delete(`/api/consultations/${id}`);
    } catch (error: any) {
      logger.api.error('Failed to delete consultation:', error);
      throw error;
    }
  }

  async getConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    try {
      const response = await this.api.get<Consultation[]>(`/api/consultations/patient/${patientId}`);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for patient:', error);
      throw error;
    }
  }

  async getConsultationsByDoctor(doctorId: string): Promise<Consultation[]> {
    try {
      const response = await this.api.get<Consultation[]>(`/api/consultations/doctor/${doctorId}`);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for doctor:', error);
      throw error;
    }
  }

  async getConsultationsByDate(date: string): Promise<Consultation[]> {
    try {
      const response = await this.api.get<Consultation[]>(`/api/consultations/date/${date}`);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultations for date:', error);
      throw error;
    }
  }

  async getConsultationStatistics(): Promise<any> {
    try {
      const response = await this.api.get('/api/consultations/statistics');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation statistics:', error);
      throw error;
    }
  }

  async exportConsultations(format: 'csv' | 'excel' | 'pdf' = 'csv', dateRange?: { start: string; end: string }): Promise<Blob> {
    try {
      let url = `/api/consultations/export?format=${format}`;
      if (dateRange) {
        url += `&start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await this.api.get(url, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to export consultations:', error);
      throw error;
    }
  }

  async generateConsultationReport(consultationId: string): Promise<Blob> {
    try {
      const response = await this.api.get(`/api/consultations/${consultationId}/report`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to generate consultation report:', error);
      throw error;
    }
  }

  async searchConsultations(query: string): Promise<Consultation[]> {
    try {
      const response = await this.api.get<Consultation[]>(`/api/consultations/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to search consultations:', error);
      throw error;
    }
  }

  async getConsultationHistory(patientId: string): Promise<Consultation[]> {
    try {
      const response = await this.api.get<Consultation[]>(`/api/consultations/history/${patientId}`);
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch consultation history:', error);
      throw error;
    }
  }

  async getDocumentFolio(consultationId: string, documentType: 'prescription' | 'study_order'): Promise<DocumentFolio> {
    try {
      const response = await this.api.get<DocumentFolio>(
        `/api/consultations/${consultationId}/document-folio`,
        { params: { document_type: documentType } }
      );
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch document folio', error, 'api');
      throw error;
    }
  }
}
