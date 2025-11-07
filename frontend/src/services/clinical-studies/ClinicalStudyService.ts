import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';
import { API_CONFIG } from '../../constants';

export class ClinicalStudyService extends ApiBase {
  /**
   * Get clinical studies by consultation
   */
  async getClinicalStudiesByConsultation(consultationId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/consultation/${consultationId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting clinical studies by consultation', error, 'api');
      throw error;
    }
  }

  /**
   * Get clinical studies by patient
   */
  async getClinicalStudiesByPatient(patientId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/patient/${patientId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting clinical studies by patient', error, 'api');
      throw error;
    }
  }

  /**
   * Create clinical study
   */
  async createClinicalStudy(studyData: any): Promise<any> {
    try {
      const response = await this.api.post(API_CONFIG.ENDPOINTS.CLINICAL_STUDIES, studyData);
      return response.data;
    } catch (error) {
      logger.error('Error creating clinical study', error, 'api');
      throw error;
    }
  }

  /**
   * Update clinical study
   */
  async updateClinicalStudy(studyId: string, updateData: any): Promise<any> {
    try {
      const response = await this.api.put(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}`, updateData);
      return response.data;
    } catch (error) {
      logger.error('Error updating clinical study', error, 'api');
      throw error;
    }
  }

  /**
   * Upload clinical study file
   */
  async uploadClinicalStudyFile(studyId: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.api.put(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error uploading clinical study file', error, 'api');
      throw error;
    }
  }

  /**
   * Delete clinical study
   */
  async deleteClinicalStudy(studyId: string): Promise<void> {
    try {
      await this.api.delete(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}`);
    } catch (error) {
      logger.error('Error deleting clinical study', error, 'api');
      throw error;
    }
  }
}

