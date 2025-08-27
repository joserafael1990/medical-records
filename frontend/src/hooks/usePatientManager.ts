// ============================================================================
// PATIENT MANAGER HOOK - Gestión de pacientes
// ============================================================================

import { useState, useCallback } from 'react';
import { Patient, PatientFormData } from '../types';
import { apiService } from '../services/api';

export interface UsePatientManagerReturn {
  // State
  patients: Patient[];
  patientDialogOpen: boolean;
  isEditingPatient: boolean;
  selectedPatient: Patient | null;
  patientFormData: PatientFormData;
  patientFormErrorMessage: string;
  patientFieldErrors: { [key: string]: string };
  isPatientSubmitting: boolean;
  patientSearchTerm: string;
  creatingPatientFromConsultation: boolean;

  // Actions
  setPatients: (patients: Patient[]) => void;
  setPatientDialogOpen: (open: boolean) => void;
  setIsEditingPatient: (editing: boolean) => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setPatientFormData: (data: PatientFormData) => void;
  setPatientFormErrorMessage: (message: string) => void;
  setPatientFieldErrors: (errors: { [key: string]: string }) => void;
  setIsPatientSubmitting: (submitting: boolean) => void;
  setPatientSearchTerm: (term: string) => void;
  setCreatingPatientFromConsultation: (creating: boolean) => void;

  // Utilities
  calculateAge: (birthDate: string) => number;
  formatPatientNameWithAge: (patient: Patient) => string;

  // Handlers
  fetchPatients: () => Promise<void>;
  handleNewPatient: () => void;
  handleEditPatient: (patient: Patient) => void;
  handleDeletePatient: (patient: Patient) => Promise<void>;
  handlePatientSubmit: () => Promise<void>;
}

export const usePatientManager = (): UsePatientManagerReturn => {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientFormData, setPatientFormData] = useState<PatientFormData>({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_type: '',
    allergies: '',
    current_medications: ''
  });
  const [patientFormErrorMessage, setPatientFormErrorMessage] = useState('');
  const [patientFieldErrors, setPatientFieldErrors] = useState<{[key: string]: string}>({});
  const [isPatientSubmitting, setIsPatientSubmitting] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [creatingPatientFromConsultation, setCreatingPatientFromConsultation] = useState(false);

  // Utilities
  const calculateAge = useCallback((birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }, []);

  const formatPatientNameWithAge = useCallback((patient: Patient): string => {
    const fullName = `${patient.first_name} ${patient.paternal_surname} ${patient.maternal_surname || ''}`.trim();
    const age = calculateAge(patient.birth_date);
    return `${fullName} (${age} años)`;
  }, [calculateAge]);

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    try {
      const data = await apiService.getPatients(patientSearchTerm);
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Load mock data as fallback
      const mockPatients: Patient[] = [
        {
          id: 'PATAE5C6017',
          first_name: 'María',
          paternal_surname: 'González',
          maternal_surname: 'Pérez',
          full_name: 'María González Pérez',
          birth_date: '1990-05-15',
          age: calculateAge('1990-05-15'),
          gender: 'Femenino',
          phone: '555-0123',
          email: 'maria.gonzalez@email.com',
          address: 'Av. Principal 123, Ciudad',
          emergency_contact_name: 'Juan González',
          emergency_contact_phone: '555-0124',
          blood_type: 'O+',
          allergies: 'Ninguna conocida',
          current_medications: 'Ninguna'
        }
      ];
      setPatients(mockPatients);
    }
  }, [patientSearchTerm, calculateAge]);

  // Handle new patient
  const handleNewPatient = useCallback(() => {
    setSelectedPatient(null);
    setIsEditingPatient(false);
    setPatientFormData({
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      birth_date: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      blood_type: '',
      allergies: '',
      current_medications: ''
    });
    setPatientFormErrorMessage('');
    setPatientFieldErrors({});
    setPatientDialogOpen(true);
  }, []);

  // Handle edit patient
  const handleEditPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditingPatient(true);
    setPatientFormData({
      first_name: patient.first_name,
      paternal_surname: patient.paternal_surname,
      maternal_surname: patient.maternal_surname || '',
      birth_date: patient.birth_date,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      blood_type: patient.blood_type || '',
      allergies: patient.allergies || '',
      current_medications: patient.current_medications || ''
    });
    setPatientFormErrorMessage('');
    setPatientFieldErrors({});
    setPatientDialogOpen(true);
  }, []);

  // Handle delete patient
  const handleDeletePatient = useCallback(async (patient: Patient) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el paciente ${patient.full_name}?`)) {
      return;
    }

    try {
      await apiService.deletePatient(patient.id);
      await fetchPatients(); // Refresh the list
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Error al eliminar el paciente');
    }
  }, [fetchPatients]);

  // Handle patient form submission
  const handlePatientSubmit = useCallback(async () => {
    setIsPatientSubmitting(true);
    setPatientFormErrorMessage('');
    setPatientFieldErrors({});
    
    try {
      if (isEditingPatient && selectedPatient) {
        await apiService.updatePatient(selectedPatient.id, patientFormData);
      } else {
        await apiService.createPatient(patientFormData);
      }
      
      setPatientDialogOpen(false);
      await fetchPatients(); // Refresh the list
      
      // Reset form
      setPatientFormData({
        first_name: '',
        paternal_surname: '',
        maternal_surname: '',
        birth_date: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        blood_type: '',
        allergies: '',
        current_medications: ''
      });
      
    } catch (error: any) {
      console.error('Error saving patient:', error);
      
      // Parse API errors properly
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          setPatientFormErrorMessage(detail);
        } else if (Array.isArray(detail)) {
          // Handle Pydantic validation errors
          const errorMessages = detail.map((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0] || 'Campo';
            return `${field}: ${err.msg}`;
          }).join(', ');
          setPatientFormErrorMessage(errorMessages);
          
          // Set individual field errors
          const newFieldErrors: {[key: string]: string} = {};
          detail.forEach((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0];
            if (field) {
              newFieldErrors[field] = err.msg;
            }
          });
          setPatientFieldErrors(newFieldErrors);
        } else {
          setPatientFormErrorMessage('Error al guardar el paciente');
        }
      } else {
        setPatientFormErrorMessage('Error de conexión al guardar el paciente');
      }
    } finally {
      setIsPatientSubmitting(false);
    }
  }, [isEditingPatient, selectedPatient, patientFormData, fetchPatients]);

  return {
    // State
    patients,
    patientDialogOpen,
    isEditingPatient,
    selectedPatient,
    patientFormData,
    patientFormErrorMessage,
    patientFieldErrors,
    isPatientSubmitting,
    patientSearchTerm,
    creatingPatientFromConsultation,

    // Actions
    setPatients,
    setPatientDialogOpen,
    setIsEditingPatient,
    setSelectedPatient,
    setPatientFormData,
    setPatientFormErrorMessage,
    setPatientFieldErrors,
    setIsPatientSubmitting,
    setPatientSearchTerm,
    setCreatingPatientFromConsultation,

    // Utilities
    calculateAge,
    formatPatientNameWithAge,

    // Handlers
    fetchPatients,
    handleNewPatient,
    handleEditPatient,
    handleDeletePatient,
    handlePatientSubmit
  };
};