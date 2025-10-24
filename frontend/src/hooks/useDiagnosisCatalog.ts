import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

export interface DiagnosisCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: DiagnosisCategory[];
  diagnoses?: DiagnosisCatalog[];
}

export interface DiagnosisCatalog {
  id: number;
  code: string;
  name: string;
  category_id: number;
  description?: string;
  synonyms?: string[];
  severity_level?: 'mild' | 'moderate' | 'severe' | 'critical';
  is_chronic: boolean;
  is_contagious: boolean;
  age_group?: 'pediatric' | 'adult' | 'geriatric' | 'all';
  gender_specific?: 'male' | 'female' | 'both';
  specialty?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: DiagnosisCategory;
  recommendations?: DiagnosisRecommendation[];
  primary_differentials?: DiagnosisDifferential[];
  differential_diagnoses?: DiagnosisDifferential[];
}

export interface DiagnosisRecommendation {
  id: number;
  diagnosis_id: number;
  recommended_study_id: number;
  recommendation_type: 'required' | 'recommended' | 'optional';
  priority: 1 | 2 | 3;
  notes?: string;
  created_at: string;
  diagnosis: DiagnosisCatalog;
  recommended_study: any; // StudyCatalog type
}

export interface DiagnosisDifferential {
  id: number;
  primary_diagnosis_id: number;
  differential_diagnosis_id: number;
  similarity_score?: number;
  notes?: string;
  created_at: string;
  primary_diagnosis: DiagnosisCatalog;
  differential_diagnosis: DiagnosisCatalog;
}

export interface DiagnosisSearchRequest {
  query: string;
  specialty?: string;
  category_code?: string;
  severity_level?: 'mild' | 'moderate' | 'severe' | 'critical';
  is_chronic?: boolean;
  age_group?: 'pediatric' | 'adult' | 'geriatric' | 'all';
  gender_specific?: 'male' | 'female' | 'both';
  limit?: number;
  offset?: number;
}

export interface DiagnosisSearchResult {
  id: number;
  code: string;
  name: string;
  description?: string;
  category_name: string;
  category_code: string;
  specialty?: string;
  severity_level?: 'mild' | 'moderate' | 'severe' | 'critical';
  is_chronic: boolean;
  is_contagious: boolean;
  age_group?: 'pediatric' | 'adult' | 'geriatric' | 'all';
  gender_specific?: 'male' | 'female' | 'both';
  synonyms?: string[];
  rank?: number;
}

export interface DiagnosisRecommendationResult {
  diagnosis: DiagnosisCatalog;
  recommended_studies: Array<{
    id: number;
    study: {
      id: number;
      code: string;
      name: string;
      description?: string;
      specialty?: string;
      duration_hours?: number;
    };
    recommendation_type: 'required' | 'recommended' | 'optional';
    priority: 1 | 2 | 3;
    notes?: string;
  }>;
}

export interface DiagnosisDifferentialResult {
  primary_diagnosis: DiagnosisCatalog;
  differential_diagnoses: Array<{
    id: number;
    diagnosis: {
      id: number;
      code: string;
      name: string;
      description?: string;
      specialty?: string;
      severity_level?: 'mild' | 'moderate' | 'severe' | 'critical';
    };
    similarity_score?: number;
    notes?: string;
  }>;
}

export interface DiagnosisStats {
  total_diagnoses: number;
  total_categories: number;
  diagnoses_by_specialty: Record<string, number>;
  diagnoses_by_severity: Record<string, number>;
  chronic_conditions: number;
  contagious_conditions: number;
}

export const useDiagnosisCatalog = () => {
  const [categories, setCategories] = useState<DiagnosisCategory[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisCatalog[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [stats, setStats] = useState<DiagnosisStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get diagnosis categories
  const getCategories = useCallback(async (parentId?: number, level?: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (parentId !== undefined) params.append('parent_id', parentId.toString());
      if (level !== undefined) params.append('level', level.toString());
      
      console.log('🔍 Fetching diagnosis categories...');
      const response = await apiService.get(`/api/diagnosis/categories?${params.toString()}`);
      console.log('🔍 Categories response:', response);
      
      let categoriesData = [];
      if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (Array.isArray(response)) {
        categoriesData = response;
      } else if (response && typeof response === 'object') {
        for (const key in response) {
          if (Array.isArray(response[key])) {
            categoriesData = response[key];
            break;
          }
        }
      }
      
      console.log('🔍 Processed categories:', categoriesData);
      setCategories(categoriesData);
      return categoriesData;
    } catch (err: any) {
      console.error('❌ Error fetching diagnosis categories:', err);
      console.warn('API not available, using mock data for diagnosis categories');
      
      // Provide mock data when API fails
      const mockCategories: DiagnosisCategory[] = [
        { id: 1, code: 'A00-B99', name: 'Ciertas enfermedades infecciosas y parasitarias', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 2, code: 'C00-D49', name: 'Neoplasias', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 3, code: 'D50-D89', name: 'Enfermedades de la sangre y de los órganos hematopoyéticos', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 4, code: 'E00-E89', name: 'Endocrinas, nutricionales y metabólicas', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 5, code: 'F01-F99', name: 'Trastornos mentales y del comportamiento', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 6, code: 'G00-G99', name: 'Enfermedades del sistema nervioso', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 7, code: 'H00-H59', name: 'Enfermedades del ojo y sus anexos', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 8, code: 'H60-H95', name: 'Enfermedades del oído y de la apófisis mastoides', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 9, code: 'I00-I99', name: 'Enfermedades del sistema circulatorio', level: 1, is_active: true, created_at: '', updated_at: '' },
        { id: 10, code: 'J00-J99', name: 'Enfermedades del sistema respiratorio', level: 1, is_active: true, created_at: '', updated_at: '' }
      ];
      
      setCategories(mockCategories);
      return mockCategories;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get diagnosis catalog
  const getDiagnoses = useCallback(async (filters?: {
    category_id?: number;
    specialty?: string;
    severity_level?: string;
    is_chronic?: boolean;
    is_contagious?: boolean;
    age_group?: string;
    gender_specific?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await apiService.get(`/api/diagnosis/catalog?${params.toString()}`);
      setDiagnoses(response.data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading diagnosis catalog';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specific diagnosis
  const getDiagnosis = useCallback(async (diagnosisId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get(`/api/diagnosis/catalog/${diagnosisId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading diagnosis';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search diagnoses
  const searchDiagnoses = useCallback(async (searchRequest: DiagnosisSearchRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Searching diagnoses with request:', searchRequest);
      const response = await apiService.post('/api/diagnosis/search', searchRequest);
      console.log('🔍 Diagnosis search response:', response);
      console.log('🔍 Diagnosis search data:', response.data);
      
      // Handle different response structures
      let searchResults = [];
      if (Array.isArray(response.data)) {
        console.log('🔍 Using response.data (array)');
        searchResults = response.data;
      } else if (Array.isArray(response)) {
        console.log('🔍 Using response directly (array)');
        searchResults = response;
      } else if (response && typeof response === 'object') {
        console.log('🔍 Response is object, checking for array properties');
        console.log('🔍 Response keys:', Object.keys(response));
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`🔍 Found array in key: ${key}`);
            searchResults = response[key];
            break;
          }
        }
      }
      
      console.log('🔍 Final search results:', searchResults);
      console.log('🔍 Final search results length:', searchResults.length);
      return searchResults;
    } catch (err: any) {
      console.error('❌ Error searching diagnoses:', err);
      console.error('❌ Error response:', err.response);
      const errorMessage = err.response?.data?.detail || 'Error searching diagnoses';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get diagnosis recommendations
  const getDiagnosisRecommendations = useCallback(async (diagnosisId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get(`/api/diagnosis/catalog/${diagnosisId}/recommendations`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading diagnosis recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get diagnosis differentials
  const getDiagnosisDifferentials = useCallback(async (diagnosisId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get(`/api/diagnosis/catalog/${diagnosisId}/differentials`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading diagnosis differentials';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get diagnosis statistics
  const getStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get('/api/diagnosis/stats');
      setStats(response.data);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading diagnosis statistics';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specialties
  const getSpecialties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching diagnosis specialties...');
      const response = await apiService.get('/api/diagnosis/specialties');
      console.log('🔍 Specialties response:', response);
      
      let specialtiesData = [];
      if (Array.isArray(response.data)) {
        specialtiesData = response.data;
      } else if (Array.isArray(response)) {
        specialtiesData = response;
      } else if (response && typeof response === 'object') {
        for (const key in response) {
          if (Array.isArray(response[key])) {
            specialtiesData = response[key];
            break;
          }
        }
      }
      
      console.log('🔍 Processed specialties:', specialtiesData);
      setSpecialties(specialtiesData);
      return specialtiesData;
    } catch (err: any) {
      console.error('❌ Error fetching diagnosis specialties:', err);
      console.warn('API not available, using mock data for specialties');
      
      // Provide mock data when API fails
      const mockSpecialties = [
        'Medicina Interna',
        'Cardiología',
        'Endocrinología',
        'Gastroenterología',
        'Neurología',
        'Psiquiatría',
        'Dermatología',
        'Oftalmología',
        'Otorrinolaringología',
        'Neumología',
        'Nefrología',
        'Hematología',
        'Oncología',
        'Reumatología',
        'Infectología',
        'Medicina Familiar',
        'Pediatría',
        'Ginecología',
        'Urología',
        'Traumatología'
      ];
      
      setSpecialties(mockSpecialties);
      return mockSpecialties;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          getCategories(),
          getSpecialties(),
          getStats()
        ]);
      } catch (err) {
        console.error('Error loading initial diagnosis data:', err);
      }
    };

    loadInitialData();
  }, [getCategories, getSpecialties, getStats]);

  return {
    // State
    categories,
    diagnoses,
    specialties,
    stats,
    loading,
    error,
    
    // Actions
    getCategories,
    getDiagnoses,
    getDiagnosis,
    searchDiagnoses,
    getDiagnosisRecommendations,
    getDiagnosisDifferentials,
    getStats,
    getSpecialties,
    
    // Utilities
    clearError: () => setError(null)
  };
};
