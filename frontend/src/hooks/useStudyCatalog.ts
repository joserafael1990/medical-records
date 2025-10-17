import { useState, useEffect, useCallback } from 'react';
import { StudyCatalog, StudyCategory, StudyTemplate, StudySearchFilters, StudyRecommendation } from '../types';
import { apiService } from '../services/api';

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
  const [templates, setTemplates] = useState<StudyTemplate[]>([]);
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
      console.log('🔍 useStudyCatalog - Token present:', token ? 'YES' : 'NO');
      if (token) {
        console.log('🔍 useStudyCatalog - Token preview:', token.substring(0, 20) + '...');
      }
      
      const params = new URLSearchParams();
      if (filters?.category_id) params.append('category_id', filters.category_id.toString());
      if (filters?.specialty) params.append('specialty', filters.specialty);
      if (filters?.name) params.append('search', filters.name);
      if (filters?.code) params.append('search', filters.code);
      if (filters?.duration_hours) params.append('duration_hours', filters.duration_hours.toString());
      
      console.log('🔍 useStudyCatalog - fetchStudies called with filters:', filters);
      console.log('🔍 useStudyCatalog - API URL:', `/api/study-catalog?${params.toString()}`);
      
      const response = await apiService.get(`/api/study-catalog?${params.toString()}`);
      console.log('🔍 useStudyCatalog - API response:', response.data);
      console.log('🔍 useStudyCatalog - Number of studies received:', response.data?.length || 0);
      
      setStudies(response.data);
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
      
      console.log('🔍 useStudyCatalog - fetchCategories called');
      const response = await apiService.get('/api/study-categories');
      console.log('🔍 useStudyCatalog - Categories response:', response.data);
      console.log('🔍 useStudyCatalog - Number of categories received:', response.data?.length || 0);
      setCategories(response.data);
    } catch (err: any) {
      console.error('❌ Error fetching categories:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async (specialty?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (specialty) params.append('specialty', specialty);
      
      const response = await apiService.get(`/api/study-templates?${params.toString()}`);
      setTemplates(response.data);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.response?.data?.detail || 'Error al cargar plantillas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchStudies = useCallback(async (query: string, filters?: StudySearchFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('q', query);
      if (filters?.category_id) params.append('category_id', filters.category_id.toString());
      if (filters?.specialty) params.append('specialty', filters.specialty);
      
      const response = await apiService.get(`/api/study-search?${params.toString()}`);
      setStudies(response.data);
    } catch (err: any) {
      console.error('Error searching studies:', err);
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
    fetchCategories();
    fetchStudies();
  }, [fetchCategories, fetchStudies]);

  // Debug: Log when studies or categories change
  useEffect(() => {
    console.log('🔍 useStudyCatalog - Studies updated:', studies.length, 'studies');
    console.log('🔍 useStudyCatalog - Categories updated:', categories.length, 'categories');
  }, [studies, categories]);

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
