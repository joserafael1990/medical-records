import { useState, useCallback } from 'react';
import { DiagnosisCatalog } from './useDiagnosisCatalog';

export interface UseDiagnosisManagementReturn {
  // State
  diagnoses: DiagnosisCatalog[];
  isLoading: boolean;
  error: string | null;
  diagnosisDialogOpen: boolean;
  isEditingDiagnosis: boolean;
  selectedDiagnosis: DiagnosisCatalog | null;

  // Actions
  addDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  removeDiagnosis: (diagnosisId: string) => void;
  updateDiagnosis: (diagnosisId: string, updatedDiagnosis: DiagnosisCatalog) => void;
  
  // Dialog management
  openAddDialog: () => void;
  openEditDialog: (diagnosis: DiagnosisCatalog) => void;
  closeDialog: () => void;
  
  // Utility functions
  clearDiagnoses: () => void;
  getDiagnosisById: (diagnosisId: string) => DiagnosisCatalog | undefined;
}

export const useDiagnosisManagement = (): UseDiagnosisManagementReturn => {
  // State
  const [diagnoses, setDiagnoses] = useState<DiagnosisCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisDialogOpen, setDiagnosisDialogOpen] = useState(false);
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisCatalog | null>(null);

  // Add a new diagnosis
  const addDiagnosis = useCallback((diagnosis: DiagnosisCatalog) => {
    console.log('🔬 Adding diagnosis:', diagnosis);
    console.log('🔬 Current diagnoses:', diagnoses);
    console.log('🔬 Checking for existing diagnosis with code:', diagnosis.code);
    
    // Check if diagnosis already exists
    const exists = diagnoses.some(d => d.code === diagnosis.code);
    console.log('🔬 Diagnosis exists check result:', exists);
    
    if (exists) {
      console.log('⚠️ Diagnosis already exists:', diagnosis.code);
      console.log('⚠️ Existing diagnoses:', diagnoses.map(d => ({ id: d.id, code: d.code, name: d.name })));
      setError('Este diagnóstico ya ha sido agregado');
      return;
    }

    // Generate unique ID for temporary diagnoses
    const uniqueId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const diagnosisWithId = {
      ...diagnosis,
      id: uniqueId
    };

    setDiagnoses(prev => {
      const newDiagnoses = [...prev, diagnosisWithId];
      console.log('🔬 Updated diagnoses list:', newDiagnoses);
      return newDiagnoses;
    });
    
    setError(null);
  }, [diagnoses]);

  // Remove a diagnosis
  const removeDiagnosis = useCallback((diagnosisId: string) => {
    console.log('🗑️ Removing diagnosis:', diagnosisId);
    setDiagnoses(prev => prev.filter(d => d.id !== diagnosisId));
    setError(null);
  }, []);

  // Update a diagnosis
  const updateDiagnosis = useCallback((diagnosisId: string, updatedDiagnosis: DiagnosisCatalog) => {
    console.log('✏️ Updating diagnosis:', diagnosisId, updatedDiagnosis);
    setDiagnoses(prev => prev.map(d => 
      d.id === diagnosisId ? { ...updatedDiagnosis, id: diagnosisId } : d
    ));
    setError(null);
  }, []);

  // Dialog management
  const openAddDialog = useCallback(() => {
    setDiagnosisDialogOpen(true);
    setIsEditingDiagnosis(false);
    setSelectedDiagnosis(null);
    setError(null);
  }, []);

  const openEditDialog = useCallback((diagnosis: DiagnosisCatalog) => {
    setSelectedDiagnosis(diagnosis);
    setIsEditingDiagnosis(true);
    setDiagnosisDialogOpen(true);
    setError(null);
  }, []);

  const closeDialog = useCallback(() => {
    setDiagnosisDialogOpen(false);
    setIsEditingDiagnosis(false);
    setSelectedDiagnosis(null);
    setError(null);
  }, []);

  // Clear all diagnoses
  const clearDiagnoses = useCallback(() => {
    setDiagnoses([]);
    setError(null);
  }, []);

  // Get diagnosis by ID
  const getDiagnosisById = useCallback((diagnosisId: string) => {
    return diagnoses.find(d => d.id === diagnosisId);
  }, [diagnoses]);

  return {
    // State
    diagnoses,
    isLoading,
    error,
    diagnosisDialogOpen,
    isEditingDiagnosis,
    selectedDiagnosis,

    // Actions
    addDiagnosis,
    removeDiagnosis,
    updateDiagnosis,
    
    // Dialog management
    openAddDialog,
    openEditDialog,
    closeDialog,
    
    // Utility functions
    clearDiagnoses,
    getDiagnosisById
  };
};
