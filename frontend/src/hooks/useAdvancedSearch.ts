import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface SearchFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
  specialty?: string;
  urgency?: string;
  studyType?: string;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface UseAdvancedSearchProps<T> {
  searchFn: (query: string, filters: SearchFilters, page: number) => Promise<{
    items: T[];
    total: number;
    totalPages: number;
  }>;
  initialFilters?: SearchFilters;
  debounceMs?: number;
  pageSize?: number;
}

export function useAdvancedSearch<T>({
  searchFn,
  initialFilters = {},
  debounceMs = 300,
  pageSize = 10
}: UseAdvancedSearchProps<T>): {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  results: SearchResult<T>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  clearSearch: () => void;
  refreshSearch: () => void;
  recentSearches: string[];
  addToRecentSearches: (query: string) => void;
} {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [results, setResults] = useState<SearchResult<T>>({
    items: [],
    total: 0,
    page: 1,
    totalPages: 0,
    isLoading: false,
    hasError: false
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const addToRecentSearches = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(search => search !== query);
      const newSearches = [query, ...filtered].slice(0, 10); // Keep only 10 most recent
      localStorage.setItem('recentSearches', JSON.stringify(newSearches));
      return newSearches;
    });
  }, []);

  // Perform search
  const performSearch = useCallback(async (
    query: string, 
    searchFilters: SearchFilters, 
    page: number
  ) => {
    setResults(prev => ({ ...prev, isLoading: true, hasError: false }));

    try {
      const result = await searchFn(query, searchFilters, page);
      
      setResults({
        items: result.items,
        total: result.total,
        page: page,
        totalPages: result.totalPages,
        isLoading: false,
        hasError: false
      });

      // Add to recent searches if it's a new search (not pagination)
      if (page === 1 && query.trim()) {
        addToRecentSearches(query.trim());
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Error en la búsqueda'
      }));
    }
  }, [searchFn, addToRecentSearches]);

  // Effect to trigger search when debounced query or filters change
  useEffect(() => {
    if (debouncedSearchQuery || Object.keys(filters).length > 0) {
      setCurrentPage(1); // Reset to first page on new search
      performSearch(debouncedSearchQuery, filters, 1);
    } else {
      // Clear results if no search query and no filters
      setResults({
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
        isLoading: false,
        hasError: false
      });
    }
  }, [debouncedSearchQuery, filters, performSearch]);

  // Effect to trigger search when page changes
  useEffect(() => {
    if (currentPage > 1 && (debouncedSearchQuery || Object.keys(filters).length > 0)) {
      performSearch(debouncedSearchQuery, filters, currentPage);
    }
  }, [currentPage, debouncedSearchQuery, filters, performSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setCurrentPage(1);
  }, []);

  const refreshSearch = useCallback(() => {
    if (debouncedSearchQuery || Object.keys(filters).length > 0) {
      performSearch(debouncedSearchQuery, filters, currentPage);
    }
  }, [debouncedSearchQuery, filters, currentPage, performSearch]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    results,
    currentPage,
    setCurrentPage,
    clearSearch,
    refreshSearch,
    recentSearches,
    addToRecentSearches
  };
}
