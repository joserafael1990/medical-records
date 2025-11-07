import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';
import { API_CONFIG } from '../../constants';

export class DoctorService extends ApiBase {
  /**
   * Get doctor profile
   */
  async getDoctorProfile(): Promise<any> {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.DOCTOR_PROFILE);
      return response.data;
    } catch (error) {
      logger.error('Error getting doctor profile', error, 'api');
      throw error;
    }
  }

  /**
   * Create doctor profile
   */
  async createDoctorProfile(profileData: any): Promise<any> {
    try {
      const response = await this.api.post(API_CONFIG.ENDPOINTS.DOCTOR_PROFILE, profileData);
      return response.data;
    } catch (error) {
      logger.error('Error creating doctor profile', error, 'api');
      throw error;
    }
  }

  /**
   * Update doctor profile
   */
  async updateDoctorProfile(profileData: any): Promise<any> {
    try {
      const response = await this.api.put(API_CONFIG.ENDPOINTS.DOCTOR_PROFILE, profileData);
      return response.data;
    } catch (error) {
      logger.error('Error updating doctor profile', error, 'api');
      throw error;
    }
  }
}

