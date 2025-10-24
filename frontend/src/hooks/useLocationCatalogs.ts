import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

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
      console.log('🌍 Fetching countries...');
      const response = await apiService.getCountries();
      console.log('🌍 Countries response:', response);
      const countriesData = response.data || response;
      console.log('🌍 Countries data:', countriesData);
      setCountries(countriesData || []);
    } catch (err: any) {
      console.error('❌ Error fetching countries:', err);
      setError('Error al cargar países');
    }
  }, []);

  const fetchStates = useCallback(async (countryId?: number) => {
    try {
      console.log('🏛️ Fetching states for country:', countryId);
      const response = await apiService.getStates(countryId);
      console.log('🏛️ States response:', response);
      const statesData = response.data || response;
      console.log('🏛️ States data:', statesData);
      setStates(statesData || []);
    } catch (err: any) {
      console.error('❌ Error fetching states:', err);
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
      console.error('❌ Error loading catalogs:', err);
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
