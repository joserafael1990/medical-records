import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Patient, CompletePatientData, PatientFormData } from '../../types';
import { logger } from '../../utils/logger';

export class PatientService extends ApiBase {
  async getPatients(searchTerm?: string): Promise<Patient[]> {
    try {
      logger.debug('Fetching patients', { searchTerm: searchTerm || 'all' }, 'api');
      
      // Always fetch all patients from backend
      // Filtering is done on the frontend (see useMemoizedSearch in PatientsView)
      const response = await this.api.get<Patient[]>('/api/patients');
      logger.debug('Patients fetched successfully', { count: response.data?.length }, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch patients', error, 'api');
      throw error;
    }
  }

  async getPatientById(id: string): Promise<CompletePatientData> {
    try {
      logger.debug('Fetching patient by ID', { id }, 'api');
      const response = await this.api.get<CompletePatientData>(`/api/patients/${id}`);
      logger.debug('Patient fetched successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch patient', error, 'api');
      throw error;
    }
  }

  async createPatient(patientData: PatientFormData): Promise<Patient> {
    try {
      logger.debug('Creating patient', { name: patientData.name }, 'api');
      
      // Map gender to backend format
      const mappedData = {
        ...patientData,
        gender: this.mapGenderToBackend(patientData.gender)
      };

      const response = await this.api.post<Patient>('/api/patients', mappedData);
      logger.debug('Patient created successfully', { id: response.data?.id }, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to create patient', error, 'api');
      throw error;
    }
  }

  async updatePatient(id: string, patientData: Partial<PatientFormData>): Promise<Patient> {
    try {
      logger.debug('Updating patient', { id, documents: (patientData as any)?.documents }, 'api');
      
      // Map gender to backend format if provided
      const mappedData = {
        ...patientData,
        ...(patientData.gender && { gender: this.mapGenderToBackend(patientData.gender) })
      };

      const response = await this.api.put<Patient>(`/api/patients/${id}`, mappedData);
      logger.debug('Patient updated successfully', { id }, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to update patient', error, 'api');
      throw error;
    }
  }

  async deletePatient(id: string): Promise<void> {
    try {
      logger.debug('Deleting patient', { id }, 'api');
      await this.api.delete(`/api/patients/${id}`);
      logger.debug('Patient deleted successfully', { id }, 'api');
    } catch (error: any) {
      logger.error('Failed to delete patient', error, 'api');
      throw error;
    }
  }

  async searchPatients(query: string): Promise<Patient[]> {
    try {
      logger.debug('Searching patients', { query }, 'api');
      const response = await this.api.get<Patient[]>(`/api/patients/search?q=${encodeURIComponent(query)}`);
      logger.debug('Patient search completed', { count: response.data?.length }, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to search patients', error, 'api');
      throw error;
    }
  }

  async getPatientsByDoctor(doctorId: string): Promise<Patient[]> {
    try {
      logger.debug('Fetching patients for doctor', { doctorId }, 'api');
      const response = await this.api.get<Patient[]>(`/api/patients/doctor/${doctorId}`);
      logger.debug('Patients fetched for doctor', { count: response.data?.length }, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch patients for doctor', error, 'api');
      throw error;
    }
  }

  async getPatientStatistics(): Promise<any> {
    try {
      logger.debug('Fetching patient statistics', undefined, 'api');
      const response = await this.api.get('/api/patients/statistics');
      logger.debug('Patient statistics fetched', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch patient statistics', error, 'api');
      throw error;
    }
  }

  async exportPatients(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    try {
      logger.debug('Exporting patients', { format }, 'api');
      const response = await this.api.get(`/api/patients/export?format=${format}`, {
        responseType: 'blob'
      });
      logger.debug('Patients exported successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to export patients', error, 'api');
      throw error;
    }
  }

  async importPatients(file: File): Promise<{ success: number; errors: any[] }> {
    try {
      logger.debug('Importing patients from file', { fileName: file.name }, 'api');
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.api.post('/api/patients/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      logger.debug('Patients imported successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to import patients', error, 'api');
      throw error;
    }
  }

  async validatePatientData(patientData: PatientFormData): Promise<{ valid: boolean; errors: string[] }> {
    try {
      logger.debug('Validating patient data', undefined, 'api');
      const response = await this.api.post('/api/patients/validate', patientData);
      logger.debug('Patient data validation completed', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to validate patient data', error, 'api');
      throw error;
    }
  }
}
