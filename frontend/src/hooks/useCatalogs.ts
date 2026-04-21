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

// Module-level cache — survives remounts, cleared on page reload
let _cachedCountries: Country[] | null = null;
let _cachedStates: State[] | null = null;
let _fetchPromise: Promise<void> | null = null;

export const useCatalogs = () => {
  const [countries, setCountries] = useState<Country[]>(_cachedCountries ?? []);
  const [allStates, setAllStates] = useState<State[]>(_cachedStates ?? []);
  const [loading, setLoading] = useState(_cachedCountries === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cachedCountries !== null && _cachedStates !== null) return;

    if (!_fetchPromise) {
      _fetchPromise = (async () => {
        try {
          const [countriesData, statesData] = await Promise.all([
            apiService.catalogs.getCountries(),
            apiService.catalogs.getStates()
          ]);

          _cachedCountries = Array.isArray(countriesData)
            ? countriesData.filter(c => c.is_active !== false)
            : [];
          _cachedStates = Array.isArray(statesData)
            ? statesData.filter(s => s.is_active !== false)
            : [];

          logger.debug('Catalogs loaded', {
            countries: _cachedCountries.length,
            states: _cachedStates.length,
          }, 'api');
        } catch (err) {
          _fetchPromise = null; // allow retry
          logger.error('Error fetching catalogs', err, 'api');
          throw err;
        }
      })();
    }

    setLoading(true);
    _fetchPromise
      .then(() => {
        setCountries(_cachedCountries!);
        setAllStates(_cachedStates!);
      })
      .catch(() => setError('Error al cargar catálogos'))
      .finally(() => setLoading(false));
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
