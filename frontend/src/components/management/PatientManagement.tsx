import React, { useState, useEffect, useCallback } from 'react';
import { Patient, CompletePatientData } from '../../types';
import { apiService } from '../../services';
// Using centralized PatientManagement interfaces from hooks
import type { PatientManagementState, PatientManagementActions } from '../../hooks/usePatientManagement';

// Component-specific interface extending centralized ones
export interface PatientManagementComponentActions extends Omit<PatientManagementActions, 'setPatients' | 'setSelectedPatient' | 'setPatientDialogOpen' | 'setIsEditingPatient' | 'setPatientSearchTerm' | 'setSelectedPatientData'> {
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  setSelectedPatient: React.Dispatch<React.SetStateAction<Patient | null>>;
  setPatientDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditingPatient: React.Dispatch<React.SetStateAction<boolean>>;
  setPatientSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPatientData: React.Dispatch<React.SetStateAction<CompletePatientData | null>>;
  handleViewPatientDetails: (patient: Patient) => void;
  loadPatients: () => Promise<void>;
}

// Removed duplicate usePatientManagement hook - using centralized hook instead
// This component should use the centralized usePatientManagement from hooks/

export interface UsePatientManagementComponentReturn extends PatientManagementState, PatientManagementComponentActions {}

export function usePatientManagementComponent(
  showSuccessMessage?: (message: string) => void,
  showErrorMessage?: (message: string) => void
): UsePatientManagementComponentReturn {
  // Patient management state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatientData, setSelectedPatientData] = useState<CompletePatientData | null>(null);
  
  // Error handling
  // Simplified API call execution - removed useApiErrorHandler dependency
  const executeApiCall = async (apiCall: () => Promise<any>, successMessage?: string) => {
    try {
      const result = await apiCall();
      if (successMessage && showSuccessMessage) showSuccessMessage(successMessage);
      return result;
    } catch (error: any) {
      if (showErrorMessage) showErrorMessage(error.message || 'Error en la operación');
      throw error;
    }
  };

  // Load patients function
  const loadPatients = useCallback(async () => {
    console.log('📋 Cargando lista de pacientes...');
    
    const result = await executeApiCall(
      () => apiService.patients.getPatients(''),
      undefined // No mostrar mensaje de éxito para carga inicial
    );
    
    if (result) {
      setPatients(result);
    }
  }, [executeApiCall]);

  // Handle view patient details
  const handleViewPatientDetails = useCallback((patient: Patient) => {
    console.log('👁️ Viendo detalles del paciente:', patient.first_name, patient.paternal_surname);
    setSelectedPatient(patient);
    setSelectedPatientData({
      patient: patient,
      medical_history: [],
      vital_signs: [],
      prescriptions: [],
      appointments: [],
      active_prescriptions: [],
      upcoming_appointments: []
    });
    setIsEditingPatient(true);
    setPatientDialogOpen(true);
  }, []);

  // Load patients on mount
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Stub implementations for missing interface methods
  const fetchPatients = loadPatients;
  const createPatient = async (data: any) => { throw new Error('Use centralized hook'); };
  const updatePatient = async (id: string, data: any) => { throw new Error('Use centralized hook'); };
  const deactivatePatient = async (patient: Patient) => { throw new Error('Use centralized hook'); };
  const resetPatientForm = () => {};
  const openPatientDialog = (patient?: Patient) => {};
  const closePatientDialog = () => {};

  return {
    // State
    patients,
    selectedPatient,
    selectedPatientData,
    patientDialogOpen,
    isEditingPatient,
    patientSearchTerm,
    isSubmitting: false,
    isLoading: false,
    
    // Actions
    fetchPatients,
    createPatient,
    updatePatient,
    deactivatePatient,
    setPatients,
    setSelectedPatient,
    setSelectedPatientData,
    setPatientDialogOpen,
    setIsEditingPatient,
    setPatientSearchTerm,
    resetPatientForm,
    openPatientDialog,
    closePatientDialog,
    
    // Component-specific
    handleViewPatientDetails,
    loadPatients
  };
}
