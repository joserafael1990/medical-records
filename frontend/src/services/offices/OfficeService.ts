import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';
import type { Office, OfficeCreate, OfficeUpdate } from '../../types';

export class OfficeService extends ApiBase {
  /**
   * Get all offices for the current doctor
   */
  async getOffices(doctorId?: number): Promise<Office[]> {
    try {
      const url = doctorId ? `/api/offices?doctor_id=${doctorId}` : '/api/offices';
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      logger.error('Error getting offices', error, 'api');
      throw error;
    }
  }

  /**
   * Get a specific office by ID
   */
  async getOffice(officeId: number): Promise<Office> {
    try {
      const response = await this.api.get(`/api/offices/${officeId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting office', error, 'api');
      throw error;
    }
  }

  /**
   * Create a new office
   */
  async createOffice(office: OfficeCreate): Promise<Office> {
    try {
      const response = await this.api.post('/api/offices', office);
      return response.data;
    } catch (error) {
      logger.error('Error creating office', error, 'api');
      throw error;
    }
  }

  /**
   * Update an office
   */
  async updateOffice(id: number, office: OfficeUpdate): Promise<Office> {
    try {
      const response = await this.api.put(`/api/offices/${id}`, office);
      return response.data;
    } catch (error) {
      logger.error('Error updating office', error, 'api');
      throw error;
    }
  }

  /**
   * Delete an office
   */
  async deleteOffice(id: number): Promise<void> {
    try {
      await this.api.delete(`/api/offices/${id}`);
    } catch (error) {
      logger.error('Error deleting office', error, 'api');
      throw error;
    }
  }
}

