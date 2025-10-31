// ============================================================================
// PRESCRIPTIONS HOOK - Gestión de medicamentos prescritos
// ============================================================================

import { useState, useCallback } from 'react';
import { ConsultationPrescription, CreatePrescriptionData, UpdatePrescriptionData, Medication } from '../types';
import { apiService } from '../services/api';

export interface UsePrescriptionsReturn {
  // State
  prescriptions: ConsultationPrescription[];
  medications: Medication[];
  isLoading: boolean;
  error: string | null;
  prescriptionDialogOpen: boolean;
  isEditingPrescription: boolean;
  selectedPrescription: ConsultationPrescription | null;
  prescriptionFormData: CreatePrescriptionData;
  isSubmitting: boolean;

  // Actions
  fetchPrescriptions: (consultationId: string) => Promise<void>;
  fetchMedications: (search?: string) => Promise<void>;
  createPrescription: (prescriptionData: CreatePrescriptionData, consultationId: string) => Promise<ConsultationPrescription>;
  updatePrescription: (prescriptionId: number, consultationId: string, prescriptionData: UpdatePrescriptionData) => Promise<ConsultationPrescription>;
  deletePrescription: (prescriptionId: number, consultationId: string) => Promise<void>;
  createMedication: (medicationName: string) => Promise<Medication>;
  
  // Dialog management
  openAddDialog: () => void;
  openEditDialog: (prescription: ConsultationPrescription) => void;
  closeDialog: () => void;
  
  // Form management
  updateFormData: (data: Partial<CreatePrescriptionData>) => void;
  submitForm: (consultationId: string) => Promise<void>;
  
  // Utility functions
  clearTemporaryPrescriptions: () => void;
}

export const usePrescriptions = (): UsePrescriptionsReturn => {
  // State
  const [prescriptions, setPrescriptions] = useState<ConsultationPrescription[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<ConsultationPrescription | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data with default values
  const [prescriptionFormData, setPrescriptionFormData] = useState<CreatePrescriptionData>({
    medication_id: 0,
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: undefined,
    via_administracion: ''
  });

  // Fetch prescriptions for a consultation
  const fetchPrescriptions = useCallback(async (consultationId: string) => {
    console.log('💊 fetchPrescriptions called with consultationId:', consultationId);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get(`/api/consultations/${consultationId}/prescriptions`);
      console.log('💊 fetchPrescriptions response:', response);
      const prescriptionsData = response.data || response;
      console.log('💊 fetchPrescriptions data:', prescriptionsData);
      setPrescriptions(prescriptionsData || []);
    } catch (err) {
      console.error('❌ Error fetching prescriptions:', err);
      setError('Error al cargar las prescripciones');
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch medications (for autocomplete)
  const fetchMedications = useCallback(async (search?: string) => {
    try {
      console.log('💊 fetchMedications called with search:', search);
      console.log('💊 fetchMedications function exists:', !!fetchMedications);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const url = `/api/medications${params}`;
      console.log('🌐 Making request to:', url);
      
      // Debug: Check token
      const token = localStorage.getItem('token');
      console.log('🔐 Token check:', {
        exists: !!token,
        length: token?.length || 0,
        isValidFormat: token ? token.split('.').length === 3 : false
      });
      
      const response = await apiService.get(url);
      console.log('✅ Medications response:', response);
      console.log('✅ Medications response.data:', response.data);
      console.log('✅ Medications response.data type:', typeof response.data);
      console.log('✅ Medications response.data length:', response.data?.length || 0);
      
      // Handle different response structures (same as diagnoses)
      let medicationsArray = [];
      if (Array.isArray(response.data)) {
        console.log('✅ Using response.data (array)');
        medicationsArray = response.data;
      } else if (Array.isArray(response)) {
        console.log('✅ Using response directly (array)');
        medicationsArray = response;
      } else if (response && typeof response === 'object') {
        console.log('✅ Response is object, checking for array properties');
        console.log('✅ Response keys:', Object.keys(response));
        // Try to find the array in the response
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`✅ Found array in key: ${key}`);
            medicationsArray = response[key];
            break;
          }
        }
      }
      
      console.log('✅ Final medications array:', medicationsArray);
      console.log('✅ Final medications array length:', medicationsArray.length);
      
      // Remove duplicates by medication name (case-insensitive)
      const uniqueMedications = medicationsArray.reduce((acc: Medication[], medication: Medication) => {
        const nameLower = (medication.name || '').toLowerCase().trim();
        const exists = acc.some(m => (m.name || '').toLowerCase().trim() === nameLower);
        if (!exists) {
          acc.push(medication);
        }
        return acc;
      }, []);
      
      console.log('✅ Unique medications count:', uniqueMedications.length);
      setMedications(uniqueMedications);
    } catch (err) {
      console.error('❌ Error fetching medications:', err);
      console.error('❌ Error response:', err.response?.data);
      setMedications([]);
    }
  }, []);

  // Create a new prescription
  const createPrescription = useCallback(async (
    prescriptionData: CreatePrescriptionData, 
    consultationId: string
  ): Promise<ConsultationPrescription> => {
    try {
      const response = await apiService.post(
        `/api/consultations/${consultationId}/prescriptions`, 
        prescriptionData
      );
      const newPrescription = response.data;
      
      // Add to local state
      setPrescriptions(prev => [...prev, newPrescription]);
      
      return newPrescription;
    } catch (err) {
      console.error('❌ Error creating prescription:', err);
      throw err;
    }
  }, []);

  // Update an existing prescription
  const updatePrescription = useCallback(async (
    prescriptionId: number,
    consultationId: string,
    prescriptionData: UpdatePrescriptionData
  ): Promise<ConsultationPrescription> => {
    try {
      const response = await apiService.put(
        `/api/consultations/${consultationId}/prescriptions/${prescriptionId}`, 
        prescriptionData
      );
      const updatedPrescription = response.data;
      
      // Update local state
      setPrescriptions(prev => prev.map(prescription => 
        prescription.id === prescriptionId ? updatedPrescription : prescription
      ));
      
      return updatedPrescription;
    } catch (err) {
      console.error('❌ Error updating prescription:', err);
      throw err;
    }
  }, []);

  // Delete a prescription
  const deletePrescription = useCallback(async (prescriptionId: number, consultationId: string) => {
    try {
      // Check if this is a temporary consultation
      if (consultationId === 'temp_consultation') {
        // For temporary consultations, delete locally only
        console.log('💊 Deleting temporary prescription locally');
        setPrescriptions(prev => prev.filter(prescription => prescription.id !== prescriptionId));
      } else {
        // For saved consultations, delete on server
        await apiService.delete(`/api/consultations/${consultationId}/prescriptions/${prescriptionId}`);
        
        // Remove from local state
        setPrescriptions(prev => prev.filter(prescription => prescription.id !== prescriptionId));
      }
    } catch (err) {
      console.error('❌ Error deleting prescription:', err);
      throw err;
    }
  }, []);

  // Create a new medication
  const createMedication = useCallback(async (medicationName: string): Promise<Medication> => {
    try {
      const response = await apiService.post('/api/medications', { name: medicationName });
      const newMedication = response.data;
      
      // Add to local medications list (avoid duplicates)
      setMedications(prev => {
        const nameLower = (newMedication.name || '').toLowerCase().trim();
        const exists = prev.some(m => (m.name || '').toLowerCase().trim() === nameLower);
        if (!exists) {
          return [...prev, newMedication];
        }
        return prev;
      });
      
      return newMedication;
    } catch (err) {
      console.error('❌ Error creating medication:', err);
      throw err;
    }
  }, []);

  // Dialog management
  const openAddDialog = useCallback(() => {
    setPrescriptionFormData({
      medication_id: 0,
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: undefined,
      via_administracion: ''
    });
    setIsEditingPrescription(false);
    setSelectedPrescription(null);
    setPrescriptionDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((prescription: ConsultationPrescription) => {
    setPrescriptionFormData({
      medication_id: prescription.medication_id,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      instructions: prescription.instructions || '',
      quantity: prescription.quantity,
      via_administracion: prescription.via_administracion || ''
    });
    setIsEditingPrescription(true);
    setSelectedPrescription(prescription);
    setPrescriptionDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setPrescriptionDialogOpen(false);
    setIsEditingPrescription(false);
    setSelectedPrescription(null);
    setError(null);
  }, []);

  // Clear temporary prescriptions (for new consultations)
  const clearTemporaryPrescriptions = useCallback(() => {
    setPrescriptions([]);
  }, []);

  // Form management
  const updateFormData = useCallback((data: Partial<CreatePrescriptionData>) => {
    setPrescriptionFormData(prev => ({ ...prev, ...data }));
  }, []);

  const submitForm = useCallback(async (consultationId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    console.log('💊 submitForm called with consultation_id:', consultationId);
    console.log('💊 Form data:', prescriptionFormData);
    
    try {
      if (isEditingPrescription && selectedPrescription) {
        // Check if this is a temporary consultation
        if (consultationId === 'temp_consultation') {
          // For temporary consultations, update locally only
          console.log('💊 Updating temporary prescription locally');
          
          // Find medication name from medications list
          const medication = medications.find(m => m.id === prescriptionFormData.medication_id);
          
          if (!medication) {
            throw new Error('Medication not found');
          }
          
          const updatedPrescription: ConsultationPrescription = {
            ...selectedPrescription,
            medication_id: prescriptionFormData.medication_id,
            medication_name: medication.name,
            dosage: prescriptionFormData.dosage,
            frequency: prescriptionFormData.frequency,
            duration: prescriptionFormData.duration,
            instructions: prescriptionFormData.instructions,
            quantity: prescriptionFormData.quantity,
            via_administracion: prescriptionFormData.via_administracion,
            updated_at: new Date().toISOString()
          };
          
          setPrescriptions(prev => prev.map(prescription => 
            prescription.id === selectedPrescription.id ? updatedPrescription : prescription
          ));
        } else {
          // For saved consultations, update on server
          await updatePrescription(
            selectedPrescription.id,
            consultationId,
            prescriptionFormData
          );
        }
      } else {
        // For new consultations, add to temporary prescriptions list
        if (consultationId === 'temp_consultation') {
          console.log('💊 Adding temporary prescription to local state');
          
          // Find medication name from medications list
          const medication = medications.find(m => m.id === prescriptionFormData.medication_id);
          
          if (!medication) {
            throw new Error('Medication not found');
          }
          
          // Generate unique ID with timestamp and random component
          const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
          
          const tempPrescription: ConsultationPrescription = {
            id: uniqueId,
            consultation_id: 0, // Temporary, will be set when consultation is created
            medication_id: prescriptionFormData.medication_id,
            medication_name: medication.name,
            dosage: prescriptionFormData.dosage,
            frequency: prescriptionFormData.frequency,
            duration: prescriptionFormData.duration,
            instructions: prescriptionFormData.instructions,
            quantity: prescriptionFormData.quantity,
            via_administracion: prescriptionFormData.via_administracion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('💊 Adding temp prescription:', tempPrescription);
          setPrescriptions(prev => {
            const newPrescriptions = [...prev, tempPrescription];
            console.log('💊 Updated prescriptions list:', newPrescriptions);
            return newPrescriptions;
          });
        } else {
          console.log('💊 Creating prescription in database');
          await createPrescription(prescriptionFormData, consultationId);
        }
      }
      
      console.log('💊 Prescription submission successful');
      closeDialog();
    } catch (err) {
      console.error('❌ Error submitting prescription form:', err);
      setError('Error al guardar la prescripción');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingPrescription, selectedPrescription, prescriptionFormData, medications, createPrescription, updatePrescription, closeDialog]);

  return {
    // State
    prescriptions,
    medications,
    isLoading,
    error,
    prescriptionDialogOpen,
    isEditingPrescription,
    selectedPrescription,
    prescriptionFormData,
    isSubmitting,

    // Actions
    fetchPrescriptions,
    fetchMedications,
    createPrescription,
    updatePrescription,
    deletePrescription,
    createMedication,
    
    // Dialog management
    openAddDialog,
    openEditDialog,
    closeDialog,
    
    // Form management
    updateFormData,
    submitForm,
    
    // Utility functions
    clearTemporaryPrescriptions
  };
};

