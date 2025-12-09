import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export class CatalogService extends ApiBase {
  /**
   * Get all medical specialties
   */
  async getSpecialties(): Promise<Array<{ id: number; name: string; is_active: boolean; created_at?: string | null }>> {
    try {
      const response = await this.api.get('/api/catalogs/specialties');
      const data = response.data;
      
      // Asegurar que siempre devolvamos un array
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          ...item,
          is_active: item?.is_active ?? item?.active ?? false
        }));
      }
      // Si la respuesta viene envuelta en un objeto, intentar extraer el array
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          ...item,
          is_active: item?.is_active ?? item?.active ?? false
        }));
      }
      if (data?.results && Array.isArray(data.results)) {
        return data.results.map((item: any) => ({
          ...item,
          is_active: item?.is_active ?? item?.active ?? false
        }));
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
  async getCountries(): Promise<Array<{id: number; name: string; is_active: boolean}>> {
    try {
      const response = await this.api.get('/api/catalogs/countries');
      let countries = response.data;
      
      // Handle different response structures
      if (!countries) {
        logger.warn('getCountries: respuesta vacía', response, 'api');
        return [];
      }
      
      // If wrapped in data property
      if (countries.data && Array.isArray(countries.data)) {
        countries = countries.data;
      }
      // If wrapped in results property
      else if (countries.results && Array.isArray(countries.results)) {
        countries = countries.results;
      }
      
      if (!Array.isArray(countries)) {
        logger.warn('getCountries: respuesta no es un array', { 
          type: typeof countries,
          data: countries,
          response: response.data 
        }, 'api');
        return [];
      }
      
      const mappedCountries = countries.map((country: any) => ({
        id: country.id,
        name: country.name,
        is_active: country?.is_active ?? country?.active ?? true
      }));
      
      logger.debug('getCountries: países cargados', { 
        count: mappedCountries.length,
        sample: mappedCountries.slice(0, 3)
      }, 'api');
      
      return mappedCountries;
    } catch (error) {
      logger.error('Error getting countries', error, 'api');
      throw error;
    }
  }

  /**
   * Get states by country (optional filter)
   */
  async getStates(countryId?: number): Promise<Array<{id: number; name: string; country_id: number; is_active: boolean}>> {
    try {
      const url = countryId ? `/api/catalogs/states?country_id=${countryId}` : '/api/catalogs/states';
      const response = await this.api.get(url);
      let states = response.data;
      
      // Handle different response structures
      if (!states) {
        logger.warn('getStates: respuesta vacía', response, 'api');
        return [];
      }
      
      // If wrapped in data property
      if (states.data && Array.isArray(states.data)) {
        states = states.data;
      }
      // If wrapped in results property
      else if (states.results && Array.isArray(states.results)) {
        states = states.results;
      }
      
      if (!Array.isArray(states)) {
        logger.warn('getStates: respuesta no es un array', { 
          type: typeof states,
          data: states,
          response: response.data 
        }, 'api');
        return [];
      }
      
      const mappedStates = states.map((state: any) => ({
        id: state.id,
        name: state.name,
        country_id: state.country_id,
        is_active: state?.is_active ?? state?.active ?? true
      }));
      
      logger.debug('getStates: estados cargados', { 
        count: mappedStates.length,
        countryId 
      }, 'api');
      
      return mappedStates;
    } catch (error) {
      logger.error('Error getting states', error, 'api');
      throw error;
    }
  }

  /**
   * Get emergency relationships
   */
  async getEmergencyRelationships(): Promise<Array<{code: string; name: string; is_active: boolean}>> {
    try {
      const response = await this.api.get('/api/catalogs/emergency-relationships');
      const relationships = response.data || [];
      if (!Array.isArray(relationships)) {
        logger.warn('getEmergencyRelationships: respuesta no es un array', relationships, 'api');
        return [];
      }
      return relationships.map((item: any) => ({
        ...item,
        is_active: item?.is_active ?? item?.active ?? false
      }));
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

