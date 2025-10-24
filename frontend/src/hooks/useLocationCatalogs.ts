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
      console.log('🌍 Countries response type:', typeof response);
      console.log('🌍 Countries response keys:', response ? Object.keys(response) : 'null');
      const countriesData = response.data || response;
      console.log('🌍 Countries data:', countriesData);
      console.log('🌍 Countries data length:', countriesData ? countriesData.length : 'null');
      setCountries(countriesData || []);
    } catch (err: any) {
      console.error('❌ Error fetching countries:', err);
      console.error('❌ Error details:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
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
    console.log('🌍🏛️ loadCatalogs called');
    setIsLoading(true);
    setError(null);
    try {
      console.log('🌍🏛️ Starting to load catalogs...');
      await fetchCountries();
      console.log('🌍🏛️ Countries loaded, now loading states for Mexico...');
      // Load states for Mexico by default (country_id = 1)
      await fetchStates(1);
      console.log('🌍🏛️ Catalogs loading completed');
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
