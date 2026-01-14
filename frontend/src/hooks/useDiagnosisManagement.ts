import { useState, useCallback } from 'react';
import { DiagnosisCatalog } from './useDiagnosisCatalog';
import { logger } from '../utils/logger';

export interface UseDiagnosisManagementReturn {
  // State
  diagnoses: DiagnosisCatalog[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  removeDiagnosis: (diagnosisId: string) => void;
  updateDiagnosis: (diagnosisId: string, updatedDiagnosis: DiagnosisCatalog) => void;
  loadDiagnoses: (diagnoses: DiagnosisCatalog[]) => void; // New method for loading without duplicate check
  
  // Utility functions
  clearDiagnoses: () => void;
  getDiagnosisById: (diagnosisId: string) => DiagnosisCatalog | undefined;
}

export const useDiagnosisManagement = (): UseDiagnosisManagementReturn => {
  // State
  const [diagnoses, setDiagnoses] = useState<DiagnosisCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add a new diagnosis
  const addDiagnosis = useCallback((diagnosis: DiagnosisCatalog) => {
    // Use functional update to avoid dependency on diagnoses
    setDiagnoses(prev => {
      // Check if diagnosis already exists
      const exists = prev.some(d => d.code === diagnosis.code);
      
      if (exists) {
        setError('Este diagnóstico ya ha sido agregado');
        return prev; // Return previous state unchanged
      }

      // Generate unique ID for temporary diagnoses
      const uniqueId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const diagnosisWithId = {
        ...diagnosis,
        id: uniqueId
      };

      const newDiagnoses = [...prev, diagnosisWithId];
      setError(null);
      return newDiagnoses;
    });
  }, []);

  // Remove a diagnosis
  const removeDiagnosis = useCallback((diagnosisId: string) => {
    setDiagnoses(prev => prev.filter(d => d.id !== diagnosisId));
    setError(null);
  }, []);

  // Update a diagnosis
  const updateDiagnosis = useCallback((diagnosisId: string, updatedDiagnosis: DiagnosisCatalog) => {
    setDiagnoses(prev => prev.map(d => 
      d.id === diagnosisId ? { ...updatedDiagnosis, id: diagnosisId } : d
    ));
    setError(null);
  }, []);

  // Load diagnoses without duplicate check (for edit mode)
  const loadDiagnoses = useCallback((diagnosesToLoad: DiagnosisCatalog[]) => {
    setDiagnoses(diagnosesToLoad);
    setError(null);
  }, []);

  // Clear all diagnoses
  const clearDiagnoses = useCallback(() => {
    setDiagnoses([]);
    setError(null);
  }, []);

  // Get diagnosis by ID - use state getter pattern
  const getDiagnosisById = useCallback((diagnosisId: string, currentDiagnoses?: DiagnosisCatalog[]) => {
    const diagnosesToSearch = currentDiagnoses || diagnoses;
    return diagnosesToSearch.find(d => d.id === diagnosisId);
  }, [diagnoses]);

  return {
    // State
    diagnoses,
    isLoading,
    error,

    // Actions
    addDiagnosis,
    removeDiagnosis,
    updateDiagnosis,
    loadDiagnoses,
    
    // Utility functions
    clearDiagnoses,
    getDiagnosisById
  };
};
