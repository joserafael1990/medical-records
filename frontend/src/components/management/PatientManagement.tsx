import React, { useState, useEffect, useCallback } from 'react';
import { Patient, CompletePatientData } from '../../types';
import { apiService } from '../../services/api';
// useApiErrorHandler removed - using simplified error handling

export interface PatientManagementState {
  patients: Patient[];
  selectedPatient: Patient | null;
  patientDialogOpen: boolean;
  isEditingPatient: boolean;
  patientSearchTerm: string;
  selectedPatientData: CompletePatientData | null;
}

export interface PatientManagementActions {
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  setSelectedPatient: React.Dispatch<React.SetStateAction<Patient | null>>;
  setPatientDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditingPatient: React.Dispatch<React.SetStateAction<boolean>>;
  setPatientSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPatientData: React.Dispatch<React.SetStateAction<CompletePatientData | null>>;
  handleViewPatientDetails: (patient: Patient) => void;
  loadPatients: () => Promise<void>;
}

export interface UsePatientManagementReturn extends PatientManagementState, PatientManagementActions {}

export function usePatientManagement(
  showSuccessMessage?: (message: string) => void,
  showErrorMessage?: (message: string) => void
): UsePatientManagementReturn {
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
      () => apiService.getPatients(''),
      undefined // No mostrar mensaje de éxito para carga inicial
    );
    
    if (result) {
      console.log('✅ Pacientes cargados exitosamente:', result.length);
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

  return {
    patients,
    selectedPatient,
    patientDialogOpen,
    isEditingPatient,
    patientSearchTerm,
    selectedPatientData,
    setPatients,
    setSelectedPatient,
    setPatientDialogOpen,
    setIsEditingPatient,
    setPatientSearchTerm,
    setSelectedPatientData,
    handleViewPatientDetails,
    loadPatients
  };
}


