import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { API_CONFIG } from '../constants';

interface Country {
  id: number;
  name: string;
  active: boolean;
}


interface State {
  id: number;
  name: string;
  country_id: number;
  active: boolean;
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
        // Fetch all catalogs in parallel
        const [countriesResponse, statesResponse] = await Promise.all([
          fetch(`${API_CONFIG.BASE_URL}/api/catalogs/countries`),
          fetch(`${API_CONFIG.BASE_URL}/api/catalogs/states`)
        ]);

        if (countriesResponse.ok) {
          const countriesData = await countriesResponse.json();
          setCountries(countriesData);
        }

        if (statesResponse.ok) {
          const statesData = await statesResponse.json();
          setAllStates(statesData);
        }

      } catch (err) {
        setError('Error al cargar catálogos');
        console.error('Error fetching catalogs:', err);
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
      
      return allStates.filter(state => state.country_id === country.id && state.active);
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
