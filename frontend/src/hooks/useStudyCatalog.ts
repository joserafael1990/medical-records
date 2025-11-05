
import { useState, useEffect, useCallback } from 'react';
import { StudyCatalog, StudyCategory, StudySearchFilters, StudyRecommendation } from '../types';
import { apiService } from '../services/api';

interface UseStudyCatalogReturn {
  // State
  studies: StudyCatalog[];
  categories: StudyCategory[];
  // templates removed - table deleted
  recommendations: StudyRecommendation[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStudies: (filters?: StudySearchFilters) => Promise<void>;
  fetchCategories: () => Promise<void>;
  // fetchTemplates removed - table deleted
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
      console.log('🔍 Fetching studies with filters:', filters);
      setIsLoading(true);
      setError(null);
      
      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
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
      console.log('🌐 Making request to:', url);
      
      const response = await apiService.get(url);
      console.log('✅ Studies response:', response);
      console.log('✅ Studies response.data:', response.data);
      console.log('✅ Studies response.data type:', typeof response.data);
      console.log('✅ Studies response.data length:', response.data?.length || 0);
      
      // Handle different response structures (same as medications and diagnoses)
      let studiesArray = [];
      if (Array.isArray(response.data)) {
        console.log('✅ Using response.data (array)');
        studiesArray = response.data;
      } else if (Array.isArray(response)) {
        console.log('✅ Using response directly (array)');
        studiesArray = response;
      } else if (response && typeof response === 'object') {
        console.log('✅ Response is object, checking for array properties');
        console.log('✅ Response keys:', Object.keys(response));
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`✅ Found array in key: ${key}`);
            studiesArray = response[key];
            break;
          }
        }
      }
      
      console.log('✅ Final studies array:', studiesArray);
      console.log('✅ Final studies array length:', studiesArray.length);
      
      setStudies(studiesArray);
    } catch (err: any) {
      console.error('❌ Error fetching studies:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      setError(err.response?.data?.detail || 'Error al cargar estudios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Fetching study categories...');
      const response = await apiService.get('/api/study-categories');
      console.log('✅ Categories response:', response);
      console.log('✅ Categories response.data:', response.data);
      console.log('✅ Categories response.data type:', typeof response.data);
      console.log('✅ Categories response.data length:', response.data?.length || 0);
      
      // Handle different response structures (same as studies and medications)
      let categoriesArray = [];
      if (Array.isArray(response.data)) {
        console.log('✅ Using response.data (array)');
        categoriesArray = response.data;
      } else if (Array.isArray(response)) {
        console.log('✅ Using response directly (array)');
        categoriesArray = response;
      } else if (response && typeof response === 'object') {
        console.log('✅ Response is object, checking for array properties');
        console.log('✅ Response keys:', Object.keys(response));
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`✅ Found array in key: ${key}`);
            categoriesArray = response[key];
            break;
          }
        }
      }
      
      console.log('✅ Final categories array:', categoriesArray);
      console.log('✅ Final categories array length:', categoriesArray.length);
      
      setCategories(categoriesArray);
    } catch (err: any) {
      console.error('❌ Error fetching categories:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // fetchTemplates function removed - table deleted

  const searchStudies = useCallback(async (query: string, filters?: StudySearchFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Searching studies with query:', query, 'filters:', filters);
      
      const params = new URLSearchParams();
      params.append('search', query);
      if (filters?.category_id) params.append('category_id', filters.category_id.toString());
      if (filters?.specialty) params.append('specialty', filters.specialty);
      params.append('limit', '50');
      
      const url = `/api/study-catalog?${params.toString()}`;
      console.log('🌐 Making request to:', url);
      
      const response = await apiService.get(url);
      console.log('✅ Studies search response:', response);
      console.log('✅ Studies search response.data:', response.data);
      console.log('✅ Studies search response.data type:', typeof response.data);
      console.log('✅ Studies search response.data length:', response.data?.length || 0);
      
      // Handle different response structures (same as medications and diagnoses)
      let studiesArray = [];
      if (Array.isArray(response.data)) {
        console.log('✅ Using response.data (array)');
        studiesArray = response.data;
      } else if (Array.isArray(response)) {
        console.log('✅ Using response directly (array)');
        studiesArray = response;
      } else if (response && typeof response === 'object') {
        console.log('✅ Response is object, checking for array properties');
        console.log('✅ Response keys:', Object.keys(response));
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`✅ Found array in key: ${key}`);
            studiesArray = response[key];
            break;
          }
        }
      }
      
      console.log('✅ Final studies array:', studiesArray);
      console.log('✅ Final studies array length:', studiesArray.length);
      
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
      console.error('❌ Error searching studies:', err);
      console.error('❌ Error response:', err.response?.data);
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
      
      const response = await apiService.get(`/api/study-recommendations?${params.toString()}`);
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
      const response = await apiService.get(`/api/study-catalog/${id}`);
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
      const response = await apiService.get(`/api/study-catalog/code/${code}`);
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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load critical data first
        await Promise.all([
          fetchCategories(),
          fetchStudies()
        ]);
      } catch (err) {
        console.error('❌ Error loading initial study data:', err);
        // Don't set error state for non-critical failures
        if (err instanceof Error && !err.message.includes('studies')) {
          setError(err.message);
        }
      }
    };
    
    loadInitialData();
  }, [fetchCategories, fetchStudies]);

  useEffect(() => {
  }, [studies, categories]);

  return {
    // State
    studies,
    categories,
    // templates removed - table deleted
    recommendations,
    isLoading,
    error,
    
    // Actions
    fetchStudies,
    fetchCategories,
    // fetchTemplates removed - table deleted
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
