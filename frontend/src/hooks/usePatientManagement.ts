/**
 * Patient Management Hook
 * Centralized hook for all patient-related operations extracted from App.tsx
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import type { Patient, PatientFormData } from '../types';

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

export const usePatientManagement = (onNavigate?: (view: string) => void): PatientManagementReturn => {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Authentication state
  const { isAuthenticated } = useAuth();
  
  // Track if initial data has been loaded to prevent multiple calls
  const hasLoadedInitialDataRef = useRef(false);
  const isLoadingRef = useRef(false);
  
  // Fetch patients from API (without search term - filtering is done on frontend)
  const fetchPatients = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    
    // Prevent concurrent calls
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const data = await apiService.patients.getPatients(); // Get all patients
      
      // Clean and normalize patient data
      const cleanedData = data.map((patient: any) => ({
        ...patient,
        // Map backend fields to frontend expected fields
        full_name: patient.name || patient.full_name || '',
        primary_phone: patient.primary_phone || '',
        address_street: patient.address_street || patient.home_address || '',
        
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
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [isAuthenticated]);
  
  // Load patients on mount - only if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      hasLoadedInitialDataRef.current = false;
      return;
    }
    
    if (hasLoadedInitialDataRef.current) {
      return;
    }
    
    hasLoadedInitialDataRef.current = true;
    fetchPatients().catch(error => {
      hasLoadedInitialDataRef.current = false; // Reset on error to allow retry
      console.warn('⚠️ Could not load patients on mount:', error.message);
    });
  }, [isAuthenticated, fetchPatients]);

  // Create new patient
  const createPatient = useCallback(async (data: PatientFormData): Promise<Patient> => {
    setIsSubmitting(true);
    try {
      const newPatient = await apiService.patients.createPatient(data);
      
      // Track patient creation in Amplitude
      const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
      AmplitudeService.track('patient_created', {
        has_phone: !!data.primary_phone,
        has_email: !!data.email,
        has_birth_date: !!data.birth_date
      });
      
      await fetchPatients(); // Refresh list
      
      // Navigate to patients view after successful creation
      if (onNavigate) {
        setTimeout(() => {
          onNavigate('patients');
        }, 1000); // Small delay to show success message
      }
      
      return newPatient;
    } catch (error: any) {
      // Let the error bubble up with specific details - the App.tsx handler will format it
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchPatients, onNavigate]);

  // Update existing patient
  const updatePatient = useCallback(async (id: string, data: PatientFormData): Promise<Patient> => {
    setIsSubmitting(true);
    try {
      const updatedPatient = await apiService.patients.updatePatient(id, data);
      
      // Track patient update in Amplitude
      const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
      AmplitudeService.track('patient_updated', {
        has_phone: !!data.primary_phone,
        has_email: !!data.email,
        has_birth_date: !!data.birth_date
      });
      
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
      
      // Track patient deletion in Amplitude
      const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
      AmplitudeService.track('patient_deleted', {
        patient_id: patient.id
      });
      
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
  const openPatientDialog = useCallback(async (patient?: Patient) => {
    if (patient) {
      setSelectedPatient(patient);
      setIsEditingPatient(true);
    } else {
      // Track patient create button clicked in Amplitude
      const { AmplitudeService } = await import('../services/analytics/AmplitudeService');
      AmplitudeService.track('patient_create_button_clicked');
      
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
