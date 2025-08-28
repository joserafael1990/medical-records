import { useState, useEffect } from 'react';

/**
 * Custom hook para implementar debounce en búsquedas
 * Retrasa la ejecución hasta que el usuario pare de escribir
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook más avanzado para búsquedas con loading state
 */
export const useSearchWithDebounce = (
  searchTerm: string,
  searchFunction: (term: string) => Promise<any[]>,
  delay: number = 300
) => {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const searchResults = await searchFunction(debouncedSearchTerm);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error en la búsqueda');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm, searchFunction]);

  return { results, isLoading, error };
};