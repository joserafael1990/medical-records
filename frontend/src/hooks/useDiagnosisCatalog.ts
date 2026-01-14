import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';

// DiagnosisCategory removed - diagnosis_categories table eliminated (not required by law)

export interface DiagnosisCatalog {
  id: number | string;
  code: string;  // CIE-10 code (required by law)
  name: string;  // Diagnosis description (required by law)
  is_active?: boolean;
  created_by?: number;  // 0 = system, doctor_id = doctor who created it
  created_at?: string;
  updated_at?: string;
  description?: string;
  category?: string;
  specialty?: string;
  severity_level?: string;
  is_chronic?: boolean;
}

// DiagnosisRecommendation and DiagnosisDifferential removed - tables deleted

export interface DiagnosisSearchRequest {
  query: string;
  limit?: number;
  offset?: number;
}

export interface DiagnosisSearchResult {
  id: number;
  code: string;  // CIE-10 code (required by law)
  name: string;  // Diagnosis description (required by law)
  created_by: number;  // 0 = system, doctor_id = doctor who created it
  rank?: number;
}

// DiagnosisRecommendationResult and DiagnosisDifferentialResult removed - tables deleted

export interface DiagnosisStats {
  total_diagnoses: number;
}

export const useDiagnosisCatalog = () => {
  const [diagnoses, setDiagnoses] = useState<DiagnosisCatalog[]>([]);
  const [stats, setStats] = useState<DiagnosisStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get diagnosis catalog
  // Shows system diagnoses (created_by=0) and doctor's own diagnoses (created_by=doctor_id)
  const getDiagnoses = useCallback(async (filters?: {
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

      const response = await apiService.consultations.api.get(`/api/diagnosis/catalog?${params.toString()}`);
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

      const response = await apiService.consultations.api.get(`/api/diagnosis/catalog/${diagnosisId}`);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading diagnosis';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new diagnosis
  const createDiagnosis = useCallback(async (name: string): Promise<DiagnosisCatalog> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.consultations.api.post('/api/diagnosis/catalog', {
        code: '', // Empty code for custom diagnoses
        name: name.trim(),
        is_active: true
      });

      const newDiagnosis = response.data as DiagnosisCatalog;

      // Add to local state
      setDiagnoses(prev => {
        const nameLower = (newDiagnosis.name || '').toLowerCase().trim();
        const exists = prev.some(d => (d.name || '').toLowerCase().trim() === nameLower);
        if (!exists) {
          return [...prev, newDiagnosis];
        }
        return prev;
      });

      return newDiagnosis;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error creating diagnosis';
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

      const response = await apiService.consultations.api.post('/api/diagnosis/search', searchRequest);

      // Handle different response structures
      let searchResults = [];
      if (Array.isArray(response.data)) {
        searchResults = response.data;
      } else if (Array.isArray(response)) {
        searchResults = response;
      } else if (response && typeof response === 'object') {
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            searchResults = response[key];
            break;
          }
        }
      }
      return searchResults;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error searching diagnoses';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // getDiagnosisRecommendations and getDiagnosisDifferentials removed - tables deleted

  // Get diagnosis statistics (non-critical, used for display only)
  const getStats = useCallback(async () => {
    try {
      // Don't set loading state for stats as it's non-critical
      const response = await apiService.consultations.api.get('/api/diagnosis/stats');
      setStats(response.data);
      return response.data;
    } catch (err: any) {
      // Don't set error state or throw - stats are non-critical
      console.warn('⚠️ Could not load diagnosis statistics (non-critical):', err);
      return null;
    }
  }, []);

  // Load initial data (with debouncing and caching to avoid rate limiting)
  const hasLoadedStatsRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // Skip if already loaded
    if (hasLoadedStatsRef.current) {
      return;
    }

    const loadInitialData = async () => {
      try {
        // Try to load stats, but don't fail if it errors (non-critical)
        try {
          await getStats();
          if (isMounted) {
            hasLoadedStatsRef.current = true;
          }
        } catch (statsErr: any) {
          // Ignore 429 errors (rate limiting) - will retry later
          if (statsErr?.response?.status !== 429) {
            console.warn('⚠️ Could not load diagnosis statistics (non-critical):', statsErr);
          }
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Error loading initial diagnosis data', err, 'api');
          if (err instanceof Error && !err.message.includes('statistics')) {
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
  }, [getStats]);

  return {
    // State
    diagnoses,
    stats,
    loading,
    error,

    // Actions
    getDiagnoses,
    getDiagnosis,
    createDiagnosis,
    searchDiagnoses,
    // getDiagnosisRecommendations and getDiagnosisDifferentials removed - tables deleted
    getStats,

    // Utilities
    clearError: () => setError(null)
  };
};
