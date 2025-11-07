import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  name: string;
  country_id: number;
}

export const useLocationCatalogs = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = useCallback(async () => {
    try {
      logger.debug('Fetching countries', undefined, 'api');
      const countriesData = await apiService.catalogs.getCountries();
      logger.debug('Countries fetched successfully', { count: countriesData?.length }, 'api');
      setCountries(countriesData || []);
    } catch (err: any) {
      logger.error('Error fetching countries', err, 'api');
      setError('Error al cargar países');
    }
  }, []);

  const fetchStates = useCallback(async (countryId?: number) => {
    try {
      logger.debug('Fetching states', { countryId }, 'api');
      const statesData = await apiService.catalogs.getStates(countryId);
      logger.debug('States fetched successfully', { count: statesData?.length }, 'api');
      setStates(statesData || []);
    } catch (err: any) {
      logger.error('Error fetching states', err, 'api');
      setError('Error al cargar estados');
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    logger.debug('Loading catalogs', undefined, 'api');
    setIsLoading(true);
    setError(null);
    try {
      await fetchCountries();
      // Load states for Mexico by default (country_id = 1)
      await fetchStates(1);
      logger.debug('Catalogs loaded successfully', undefined, 'api');
    } catch (err: any) {
      logger.error('Error loading catalogs', err, 'api');
      setError('Error al cargar catálogos');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCountries, fetchStates]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  return {
    countries,
    states,
    isLoading,
    error,
    fetchCountries,
    fetchStates,
    loadCatalogs
  };
};
