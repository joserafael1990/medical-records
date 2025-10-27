import { ApiBase, ApiResponse } from '../base/ApiBase';
import { Patient, CompletePatientData, PatientFormData } from '../../types';
import { logger } from '../../utils/logger';

export class PatientService extends ApiBase {
  async getPatients(): Promise<Patient[]> {
    try {
      logger.api.info('Fetching patients');
      const response = await this.api.get<Patient[]>('/api/patients');
      logger.api.success('Patients fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch patients:', error);
      throw error;
    }
  }

  async getPatientById(id: string): Promise<CompletePatientData> {
    try {
      logger.api.info('Fetching patient by ID:', id);
      const response = await this.api.get<CompletePatientData>(`/api/patients/${id}`);
      logger.api.success('Patient fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch patient:', error);
      throw error;
    }
  }

  async createPatient(patientData: PatientFormData): Promise<Patient> {
    try {
      logger.api.info('Creating patient:', patientData.first_name);
      
      // Map gender to backend format
      const mappedData = {
        ...patientData,
        gender: this.mapGenderToBackend(patientData.gender)
      };

      const response = await this.api.post<Patient>('/api/patients', mappedData);
      logger.api.success('Patient created successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to create patient:', error);
      throw error;
    }
  }

  async updatePatient(id: string, patientData: Partial<PatientFormData>): Promise<Patient> {
    try {
      logger.api.info('Updating patient:', id);
      
      // Map gender to backend format if provided
      const mappedData = {
        ...patientData,
        ...(patientData.gender && { gender: this.mapGenderToBackend(patientData.gender) })
      };

      const response = await this.api.put<Patient>(`/api/patients/${id}`, mappedData);
      logger.api.success('Patient updated successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to update patient:', error);
      throw error;
    }
  }

  async deletePatient(id: string): Promise<void> {
    try {
      logger.api.info('Deleting patient:', id);
      await this.api.delete(`/api/patients/${id}`);
      logger.api.success('Patient deleted successfully');
    } catch (error: any) {
      logger.api.error('Failed to delete patient:', error);
      throw error;
    }
  }

  async searchPatients(query: string): Promise<Patient[]> {
    try {
      logger.api.info('Searching patients with query:', query);
      const response = await this.api.get<Patient[]>(`/api/patients/search?q=${encodeURIComponent(query)}`);
      logger.api.success('Patient search completed');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to search patients:', error);
      throw error;
    }
  }

  async getPatientsByDoctor(doctorId: string): Promise<Patient[]> {
    try {
      logger.api.info('Fetching patients for doctor:', doctorId);
      const response = await this.api.get<Patient[]>(`/api/patients/doctor/${doctorId}`);
      logger.api.success('Patients fetched for doctor');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch patients for doctor:', error);
      throw error;
    }
  }

  async getPatientStatistics(): Promise<any> {
    try {
      logger.api.info('Fetching patient statistics');
      const response = await this.api.get('/api/patients/statistics');
      logger.api.success('Patient statistics fetched');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to fetch patient statistics:', error);
      throw error;
    }
  }

  async exportPatients(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    try {
      logger.api.info('Exporting patients in format:', format);
      const response = await this.api.get(`/api/patients/export?format=${format}`, {
        responseType: 'blob'
      });
      logger.api.success('Patients exported successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to export patients:', error);
      throw error;
    }
  }

  async importPatients(file: File): Promise<{ success: number; errors: any[] }> {
    try {
      logger.api.info('Importing patients from file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.api.post('/api/patients/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      logger.api.success('Patients imported successfully');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to import patients:', error);
      throw error;
    }
  }

  async validatePatientData(patientData: PatientFormData): Promise<{ valid: boolean; errors: string[] }> {
    try {
      console.log('Validating patient data');
      const response = await this.api.post('/api/patients/validate', patientData);
      console.log('Patient data validation completed');
      return response.data;
    } catch (error: any) {
      logger.api.error('Failed to validate patient data:', error);
      throw error;
    }
  }
}
