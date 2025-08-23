// ============================================================================
// DEBOUNCE HOOK - Hook optimizado para debouncing
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { UI_CONFIG } from '../constants';

/**
 * Hook para debouncing de valores
 * @param value - Valor a debounce
 * @param delay - Delay en milisegundos (default: 500ms)
 * @returns Valor debounced
 */
export const useDebounce = <T>(value: T, delay: number = UI_CONFIG.DEBOUNCE_DELAY): T => {
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
 * Hook para debouncing de callbacks
 * @param callback - Función a debounce
 * @param delay - Delay en milisegundos (default: 500ms)
 * @param deps - Dependencias del callback
 * @returns Función debounced
 */
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = UI_CONFIG.DEBOUNCE_DELAY,
  deps: React.DependencyList = []
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook para búsqueda con debounce
 * @param searchFunction - Función de búsqueda
 * @param delay - Delay en milisegundos
 * @returns [searchTerm, setSearchTerm, isSearching]
 */
export const useDebouncedSearch = <T>(
  searchFunction: (term: string) => Promise<T[]>,
  delay: number = UI_CONFIG.DEBOUNCE_DELAY
): [string, (term: string) => void, boolean, T[], string | null] => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setIsSearching(true);
      setError(null);
      
      searchFunction(debouncedSearchTerm)
        .then(data => {
          setResults(data);
        })
        .catch(err => {
          console.error('Search error:', err);
          setError('Error en la búsqueda');
          setResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      setResults([]);
      setIsSearching(false);
      setError(null);
    }
  }, [debouncedSearchTerm, searchFunction]);

  return [searchTerm, setSearchTerm, isSearching, results, error];
};

export default useDebounce;
