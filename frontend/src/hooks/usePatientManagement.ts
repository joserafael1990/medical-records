/**
 * Patient Management Hook
 * Centralized hook for all patient-related operations extracted from App.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Patient, PatientFormData } from '../types';

// Debug helper - only logs in development
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data || '');
  }
};

// ============================================================================
// CENTRALIZED PATIENT MANAGEMENT INTERFACES
// ============================================================================

export interface PatientManagementState {
  patients: Patient[];
  selectedPatient: Patient | null;
  selectedPatientData?: any; // For complete patient data
  patientDialogOpen: boolean;
  isEditingPatient: boolean;
  patientSearchTerm: string;
  isSubmitting: boolean;
  isLoading: boolean;
}

export interface PatientManagementActions {
  // Data operations
  fetchPatients: () => Promise<void>;
  createPatient: (data: PatientFormData) => Promise<Patient>;
  updatePatient: (id: string, data: PatientFormData) => Promise<Patient>; // Unified to string
  deactivatePatient: (patient: Patient) => Promise<void>;
  
  // UI state management
  setPatients: (patients: Patient[]) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setSelectedPatientData: (patient: any) => void;
  setPatientDialogOpen: (open: boolean) => void;
  setIsEditingPatient: (editing: boolean) => void;
  setPatientSearchTerm: (term: string) => void;
  
  // Utility functions
  resetPatientForm: () => void;
  openPatientDialog: (patient?: Patient) => void;
  closePatientDialog: () => void;
}

export type PatientManagementReturn = PatientManagementState & PatientManagementActions;

export const usePatientManagement = (): PatientManagementReturn => {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    try {
      const data = await apiService.getPatients(patientSearchTerm);
      
      // Clean and normalize patient data
      const cleanedData = data.map((patient: any) => ({
        ...patient,
        // Map backend fields to frontend expected fields
        full_name: `${patient.first_name || ''} ${patient.paternal_surname || ''} ${patient.maternal_surname || ''}`.trim(),
        primary_phone: patient.primary_phone || '',
        address_street: patient.address_street || '',
        
        // Convert object fields to strings
        nationality: typeof patient.nacionalidad === 'object' 
          ? patient.nacionalidad?.nombre || 'Mexicana'
          : patient.nacionalidad || patient.nationality || 'Mexicana',
        especialidad: typeof patient.specialty === 'object' 
          ? patient.specialty?.nombre || ''
          : patient.specialty || '',
        ciudad_residencia: typeof patient.ciudad_residencia === 'object'
          ? patient.ciudad_residencia?.nombre || ''
          : patient.ciudad_residencia || ''
      }));
      
      setPatients(cleanedData);
    } catch (error: any) {
      console.error('❌ Error fetching patients:', {
        message: error?.message || 'Unknown error',
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      });
      setPatients([]);
      // No fallback logic - backend is required
      throw error;
    }
  }, [patientSearchTerm]);

  // Authentication state
  const { isAuthenticated } = useAuth();
  
  // Load patients on mount - only if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    
    fetchPatients().catch(error => {
      console.warn('⚠️ Could not load patients on mount:', error.message);
    });
  }, [isAuthenticated]); // Only depend on authentication, not fetchPatients

  // Create new patient
  const createPatient = useCallback(async (data: PatientFormData): Promise<Patient> => {
    setIsSubmitting(true);
    try {
      const newPatient = await apiService.createPatient(data);
      await fetchPatients(); // Refresh list
      return newPatient;
    } catch (error: any) {
      // Let the error bubble up with specific details - the App.tsx handler will format it
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchPatients]);

  // Update existing patient
  const updatePatient = useCallback(async (id: string, data: PatientFormData): Promise<Patient> => {
    setIsSubmitting(true);
    try {
      const updatedPatient = await apiService.updatePatient(id, data);
      await fetchPatients(); // Refresh list
      return updatedPatient;
    } catch (error: any) {
      // Let the error bubble up with specific details - the App.tsx handler will format it
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchPatients]);

  // Deactivate patient
  const deactivatePatient = useCallback(async (patient: Patient): Promise<void> => {
    setIsSubmitting(true);
    try {
      // NOTE: Patient deactivation API endpoint not yet implemented
      console.log('Patient deactivation requested:', patient.id);
      // Placeholder: Would call apiService.deactivatePatient(patient.id) when available
      await fetchPatients(); // Refresh list
    } catch (error: any) {
      throw new Error(error.message || 'Error al desactivar paciente');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchPatients]);

  // Set selected patient data (for complete patient info)
  const setSelectedPatientData = useCallback((patient: any) => {
    setSelectedPatient(patient);
  }, []);

  // Reset form state
  const resetPatientForm = useCallback(() => {
    setSelectedPatient(null);
    setIsEditingPatient(false);
    setPatientDialogOpen(false);
  }, []);

  // Open patient dialog for create/edit
  const openPatientDialog = useCallback((patient?: Patient) => {
    if (patient) {
      setSelectedPatient(patient);
      setIsEditingPatient(true);
    } else {
      setSelectedPatient(null);
      setIsEditingPatient(false);
    }
    setPatientDialogOpen(true);
  }, []);

  // Close patient dialog
  const closePatientDialog = useCallback(() => {
    setPatientDialogOpen(false);
    setSelectedPatient(null);
    setIsEditingPatient(false);
  }, []);

  return {
    // State
    patients,
    selectedPatient,
    patientDialogOpen,
    isEditingPatient,
    patientSearchTerm,
    isSubmitting,
    isLoading,
    
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
    closePatientDialog
  };
};
