import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';

export interface Country {
  id: number;
  name: string;
  // `code` (ISO 3166) is not emitted by all of our catalog endpoints;
  // `is_active` is emitted by the admin-managed table. Keep both
  // optional so the hook accepts either payload shape.
  code?: string;
  is_active?: boolean;
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
      const countriesData = await apiService.catalogs.getCountries();
      setCountries(countriesData || []);
    } catch (err: any) {
      logger.error('Error fetching countries', err, 'api');
      setError('Error al cargar países');
    }
  }, []);

  const fetchStates = useCallback(async (countryId?: number) => {
    try {
      const statesData = await apiService.catalogs.getStates(countryId);
      setStates(statesData || []);
    } catch (err: any) {
      logger.error('Error fetching states', err, 'api');
      setError('Error al cargar estados');
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchCountries();
      // Load states for Mexico by default (country_id = 1)
      await fetchStates(1);
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
