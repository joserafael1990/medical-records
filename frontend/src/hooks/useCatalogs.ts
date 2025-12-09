import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';

interface Country {
  id: number;
  name: string;
  is_active: boolean;
}
interface State {
  id: number;
  name: string;
  country_id: number;
  is_active: boolean;
}

export const useCatalogs = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [allStates, setAllStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalogs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all catalogs in parallel using new CatalogService
        const [countriesData, statesData] = await Promise.all([
          apiService.catalogs.getCountries(),
          apiService.catalogs.getStates()
        ]);

        // Filter active countries and states, ensure they're arrays
        const activeCountries = Array.isArray(countriesData) 
          ? countriesData.filter(c => c.is_active !== false)
          : [];
        const activeStates = Array.isArray(statesData)
          ? statesData.filter(s => s.is_active !== false)
          : [];

        logger.debug('Catalogs loaded', {
          countries: activeCountries.length,
          states: activeStates.length,
          totalCountries: countriesData?.length || 0,
          totalStates: statesData?.length || 0
        }, 'api');

        setCountries(activeCountries);
        setAllStates(activeStates);

      } catch (err) {
        setError('Error al cargar catálogos');
        logger.error('Error fetching catalogs', err, 'api');
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogs();
  }, []);

  // Function to get states filtered by country
  const getStatesByCountry = useMemo(() => {
    return (countryName: string): State[] => {
      if (!countryName || !allStates.length || !countries.length) return [];
      
      const country = countries.find(c => c.name === countryName);
      if (!country) return [];
      
      return allStates.filter(state => state.country_id === country.id && state.is_active);
    };
  }, [allStates, countries]);

  // Get country by name
  const getCountryByName = useMemo(() => {
    return (countryName: string): Country | undefined => {
      return countries.find(c => c.name === countryName);
    };
  }, [countries]);

  return {
    countries,
    states: allStates,
    getStatesByCountry,
    getCountryByName,
    loading,
    error
  };
};
