
import { useState, useEffect, useCallback, useRef } from 'react';
import { StudyCatalog, StudyCategory, StudySearchFilters, StudyRecommendation, StudyTemplate } from '../types';
import { apiService } from '../services';

interface UseStudyCatalogReturn {
  // State
  studies: StudyCatalog[];
  categories: StudyCategory[];
  templates: StudyTemplate[];
  recommendations: StudyRecommendation[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStudies: (filters?: StudySearchFilters) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTemplates: (specialty?: string) => Promise<void>;
  searchStudies: (query: string, filters?: StudySearchFilters) => Promise<void>;
  getRecommendations: (diagnosis?: string, specialty?: string) => Promise<void>;
  getStudyById: (id: number) => Promise<StudyCatalog | null>;
  getStudyByCode: (code: string) => Promise<StudyCatalog | null>;

  // Utilities
  getStudiesBySpecialty: (specialty: string) => StudyCatalog[];
  getStudiesByCategory: (categoryId: number) => StudyCatalog[];
  clearError: () => void;
}

export const useStudyCatalog = (): UseStudyCatalogReturn => {
  const [studies, setStudies] = useState<StudyCatalog[]>([]);
  const [categories, setCategories] = useState<StudyCategory[]>([]);
  // templates state removed - table deleted
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchStudies = useCallback(async (filters?: StudySearchFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay sesión activa');
        return;
      }

      const params = new URLSearchParams();
      if (filters?.category_id) params.append('category_id', filters.category_id.toString());
      if (filters?.specialty) params.append('specialty', filters.specialty);
      if (filters?.name) params.append('search', filters.name);
      if (filters?.duration_hours) params.append('duration_hours', filters.duration_hours.toString());

      // Request all studies by setting a high limit
      params.append('limit', '500');

      const url = `/api/study-catalog?${params.toString()}`;

      const response = await apiService.clinicalStudies.api.get(url);

      // Handle different response structures (same as medications and diagnoses)
      let studiesArray = [];
      if (Array.isArray(response.data)) {
        studiesArray = response.data;
      } else if (Array.isArray(response)) {
        studiesArray = response;
      } else if (response && typeof response === 'object') {
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            studiesArray = response[key];
            break;
          }
        }
      }

      setStudies(studiesArray);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar estudios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.clinicalStudies.api.get('/api/study-categories');

      // Handle different response structures (same as studies and medications)
      let categoriesArray = [];
      if (Array.isArray(response.data)) {
        categoriesArray = response.data;
      } else if (Array.isArray(response)) {
        categoriesArray = response;
      } else if (response && typeof response === 'object') {
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            categoriesArray = response[key];
            break;
          }
        }
      }

      setCategories(categoriesArray);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // templates state removed - table deleted which we are adding back mock for compile
  const [templates, setTemplates] = useState<StudyTemplate[]>([]);

  // ...

  const fetchTemplates = useCallback(async (specialty?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // Mock implementation since table is deleted
      setTemplates([]);
    } catch (err: any) {
      setError('Error al cargar plantillas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchStudies = useCallback(async (query: string, filters?: StudySearchFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('search', query);
      if (filters?.category_id) params.append('category_id', filters.category_id.toString());
      if (filters?.specialty) params.append('specialty', filters.specialty);
      params.append('limit', '50');

      const url = `/api/study-catalog?${params.toString()}`;

      const response = await apiService.clinicalStudies.api.get(url);

      // Handle different response structures (same as medications and diagnoses)
      let studiesArray = [];
      if (Array.isArray(response.data)) {
        studiesArray = response.data;
      } else if (Array.isArray(response)) {
        studiesArray = response;
      } else if (response && typeof response === 'object') {
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            studiesArray = response[key];
            break;
          }
        }
      }

      // Map the response to include description field for StudyCatalog type
      const mappedStudies = studiesArray.map((study: any) => ({
        id: study.id,
        name: study.name,
        category_id: study.category_id,
        is_active: study.is_active,
        created_at: study.created_at,
        updated_at: study.updated_at,
        description: study.description || '', // Add description field even if not in DB
        category: study.category
      }));

      setStudies(mappedStudies);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error en la búsqueda');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRecommendations = useCallback(async (diagnosis?: string, specialty?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (diagnosis) params.append('diagnosis', diagnosis);
      if (specialty) params.append('specialty', specialty);

      const response = await apiService.clinicalStudies.api.get(`/api/study-recommendations?${params.toString()}`);
      setRecommendations(response.data);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.response?.data?.detail || 'Error al cargar recomendaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStudyById = useCallback(async (id: number): Promise<StudyCatalog | null> => {
    try {
      setError(null);
      const response = await apiService.clinicalStudies.api.get(`/api/study-catalog/${id}`);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching study by ID:', err);
      setError(err.response?.data?.detail || 'Error al cargar estudio');
      return null;
    }
  }, []);

  const getStudyByCode = useCallback(async (code: string): Promise<StudyCatalog | null> => {
    try {
      setError(null);
      const response = await apiService.clinicalStudies.api.get(`/api/study-catalog/code/${code}`);
      return response.data;
    } catch (err: any) {
      console.error('Error fetching study by code:', err);
      setError(err.response?.data?.detail || 'Error al cargar estudio');
      return null;
    }
  }, []);

  const getStudiesBySpecialty = useCallback((specialty: string): StudyCatalog[] => {
    return studies.filter(study =>
      study.specialty?.toLowerCase().includes(specialty.toLowerCase())
    );
  }, [studies]);

  const getStudiesByCategory = useCallback((categoryId: number): StudyCatalog[] => {
    return studies.filter(study => study.category_id === categoryId);
  }, [studies]);

  // Track if initial data has been loaded to prevent multiple calls
  const hasLoadedInitialDataRef = useRef(false);

  // Load initial data only once (with debouncing to avoid rate limiting)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    if (hasLoadedInitialDataRef.current) {
      return;
    }

    const loadInitialData = async () => {
      try {
        // Load critical data first
        await Promise.all([
          fetchCategories().catch((err: any) => {
            // Ignore 429 errors
            if (err?.response?.status !== 429) {
              console.warn('Error loading study categories:', err);
            }
          }),
          fetchStudies().catch((err: any) => {
            // Ignore 429 errors
            if (err?.response?.status !== 429) {
              console.warn('Error loading studies:', err);
            }
          })
        ]);

        if (isMounted) {
          hasLoadedInitialDataRef.current = true;
        }
      } catch (err: any) {
        // Ignore 429 errors
        if (err?.response?.status !== 429) {
          hasLoadedInitialDataRef.current = false; // Reset on error to allow retry
          // Don't set error state for non-critical failures
          if (err instanceof Error && !err.message.includes('studies')) {
            setError(err.message);
          }
        }
      }
    };

    // Debounce to avoid rapid successive calls
    timeoutId = setTimeout(() => {
      loadInitialData();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchCategories, fetchStudies]);

  return {
    // State
    studies,
    categories,
    templates,
    recommendations,
    isLoading,
    error,

    // Actions
    fetchStudies,
    fetchCategories,
    fetchTemplates,
    searchStudies,
    getRecommendations,
    getStudyById,
    getStudyByCode,

    // Utilities
    getStudiesBySpecialty,
    getStudiesByCategory,
    clearError
  };
};
