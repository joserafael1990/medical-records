import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export class CatalogService extends ApiBase {
  /**
   * Get all medical specialties
   */
  async getSpecialties(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/catalogs/specialties');
      const data = response.data;
      
      // Asegurar que siempre devolvamos un array
      if (Array.isArray(data)) {
        return data;
      }
      // Si la respuesta viene envuelta en un objeto, intentar extraer el array
      if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      if (data?.results && Array.isArray(data.results)) {
        return data.results;
      }
      // Si no es un array, devolver array vacío
      logger.warn('getSpecialties: respuesta no es un array', data, 'api');
      return [];
    } catch (error) {
      logger.error('Error getting specialties', error, 'api');
      return [];
    }
  }

  /**
   * Get all countries
   */
  async getCountries(): Promise<Array<{id: number, name: string}>> {
    try {
      const response = await this.api.get('/api/catalogs/countries');
      return response.data;
    } catch (error) {
      logger.error('Error getting countries', error, 'api');
      throw error;
    }
  }

  /**
   * Get states by country (optional filter)
   */
  async getStates(countryId?: number): Promise<Array<{id: number, name: string}>> {
    try {
      const url = countryId ? `/api/catalogs/states?country_id=${countryId}` : '/api/catalogs/states';
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      logger.error('Error getting states', error, 'api');
      throw error;
    }
  }

  /**
   * Get emergency relationships
   */
  async getEmergencyRelationships(): Promise<Array<{code: string, name: string}>> {
    try {
      const response = await this.api.get('/api/catalogs/emergency-relationships');
      return response.data;
    } catch (error) {
      logger.error('Error getting emergency relationships', error, 'api');
      throw error;
    }
  }

  /**
   * Get available timezones
   */
  async getTimezones(): Promise<Array<{value: string, label: string}>> {
    try {
      const response = await this.api.get('/api/catalogs/timezones');
      return response.data;
    } catch (error) {
      logger.error('Error getting timezones', error, 'api');
      throw error;
    }
  }
}

