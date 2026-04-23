import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';
import { License, LicenseCreate, LicenseUpdate, DoctorLicenseRow } from '../../types/license';

export class LicenseService extends ApiBase {
  /**
   * Get every active doctor with their license (null if none). Powers the
   * License Management grid so doctors without a license still appear.
   */
  async getDoctorsWithLicenses(filters?: {
    status?: string;
    license_type?: string;
  }): Promise<DoctorLicenseRow[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.license_type) params.append('license_type', filters.license_type);
      const qs = params.toString();
      const url = `/api/licenses/doctors${qs ? `?${qs}` : ''}`;
      const response = await this.api.get<DoctorLicenseRow[]>(url);
      return response.data;
    } catch (error) {
      logger.error('Error getting doctors with licenses', error, 'api');
      throw error;
    }
  }

  /**
   * Get all licenses with optional filters
   */
  async getLicenses(filters?: {
    status?: string;
    license_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<License[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.license_type) params.append('license_type', filters.license_type);
      if (filters?.skip) params.append('skip', filters.skip.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = `/api/licenses${queryString ? `?${queryString}` : ''}`;
      const response = await this.api.get<License[]>(url);
      return response.data;
    } catch (error) {
      logger.error('Error getting licenses', error, 'api');
      throw error;
    }
  }

  /**
   * Get license for a specific doctor
   */
  async getDoctorLicense(doctorId: number): Promise<License> {
    try {
      const response = await this.api.get<License>(`/api/licenses/doctor/${doctorId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting doctor license', error, 'api');
      throw error;
    }
  }

  /**
   * Get full profile of a doctor (for the License Management details view).
   */
  async getDoctorProfile(doctorId: number): Promise<any> {
    try {
      const response = await this.api.get<any>(`/api/licenses/doctor/${doctorId}/profile`);
      return response.data;
    } catch (error) {
      logger.error('Error getting doctor profile from licenses admin', error, 'api');
      throw error;
    }
  }

  /**
   * Create a new license
   */
  async createLicense(data: LicenseCreate): Promise<License> {
    try {
      const response = await this.api.post<License>('/api/licenses', data);
      return response.data;
    } catch (error) {
      logger.error('Error creating license', error, 'api');
      throw error;
    }
  }

  /**
   * Update a license
   */
  async updateLicense(licenseId: number, data: LicenseUpdate): Promise<License> {
    try {
      const response = await this.api.put<License>(`/api/licenses/${licenseId}`, data);
      return response.data;
    } catch (error) {
      logger.error('Error updating license', error, 'api');
      throw error;
    }
  }

  /**
   * Check license status for a doctor
   */
  async checkLicenseStatus(doctorId: number): Promise<{
    is_valid: boolean;
    has_license: boolean;
    license: License | null;
  }> {
    try {
      const response = await this.api.get(`/api/licenses/check/${doctorId}`);
      return response.data;
    } catch (error) {
      logger.error('Error checking license status', error, 'api');
      throw error;
    }
  }
}

