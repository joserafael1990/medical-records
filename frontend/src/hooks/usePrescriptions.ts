// ============================================================================
// PRESCRIPTIONS HOOK - Gestión de medicamentos prescritos
// ============================================================================

import { useState, useCallback } from 'react';
import { ConsultationPrescription, CreatePrescriptionData, UpdatePrescriptionData, Medication } from '../types';
import { apiService } from '../services';
import { logger } from '../utils/logger';
import { useToast } from '../components/common/ToastNotification';

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
  addTemporaryPrescription: (prescriptionData: CreatePrescriptionData) => void;
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
  const { showSuccess, showError } = useToast();

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
    logger.debug('fetchPrescriptions called', { consultationId }, 'api');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.consultations.api.get(`/api/consultations/${consultationId}/prescriptions`);
      const prescriptionsData: ConsultationPrescription[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      const uniqueMap = new Map<number | string, ConsultationPrescription>();
      (prescriptionsData || []).forEach((prescription: ConsultationPrescription) => {
        const key =
          prescription.id ??
          `${prescription.medication_id}-${prescription.dosage}-${prescription.frequency}-${prescription.duration}-${prescription.instructions}-${prescription.quantity}-${prescription.via_administracion}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, prescription);
        }
      });

      setPrescriptions(Array.from(uniqueMap.values()));
    } catch (err) {
      logger.error('Error fetching prescriptions', err, 'api');
      setError('Error al cargar las prescripciones');
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch medications (for autocomplete)
  const fetchMedications = useCallback(async (search?: string) => {
    try {
      logger.debug('fetchMedications', { search }, 'api');
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await apiService.consultations.api.get(`/api/medications${params}`);
      const medicationsArray: Medication[] = Array.isArray(response.data) ? response.data : [];

      const sortedMedications = [...medicationsArray].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
      );

      setMedications(sortedMedications);
    } catch (err: any) {
      logger.error('Error fetching medications', err, 'api');
      setMedications([]);
    }
  }, []);

  // Create a new prescription
  const createPrescription = useCallback(async (
    prescriptionData: CreatePrescriptionData, 
    consultationId: string
  ): Promise<ConsultationPrescription> => {
    try {
      const response = await apiService.consultations.api.post(
        `/api/consultations/${consultationId}/prescriptions`, 
        prescriptionData
      );
      const newPrescription = response.data;
      
      // Add to local state avoiding duplicates
      setPrescriptions(prev => {
        const exists = prev.some(p => p.id === newPrescription.id);
        if (exists) {
          return prev;
        }
        return [...prev, newPrescription];
      });
      
      return newPrescription;
    } catch (err) {
      logger.error('Error creating prescription', err, 'api');
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
      const response = await apiService.consultations.api.put(
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
      logger.error('Error updating prescription', err, 'api');
      throw err;
    }
  }, []);

  // Delete a prescription
  const deletePrescription = useCallback(async (prescriptionId: number, consultationId: string) => {
    try {
      // Check if this is a temporary consultation
      if (consultationId === 'temp_consultation') {
        // For temporary consultations, delete locally only
        setPrescriptions(prev => prev.filter(prescription => prescription.id !== prescriptionId));
      } else {
        // For saved consultations, delete on server
        await apiService.consultations.api.delete(`/api/consultations/${consultationId}/prescriptions/${prescriptionId}`);
        
        // Remove from local state
        setPrescriptions(prev => prev.filter(prescription => prescription.id !== prescriptionId));
      }
    } catch (err) {
      logger.error('Error deleting prescription', err, 'api');
      throw err;
    }
  }, []);

  // Create a new medication
  const createMedication = useCallback(async (medicationName: string): Promise<Medication> => {
    try {
      logger.debug('Creando medicamento', { medicationName }, 'api');
      const response = await apiService.consultations.api.post('/api/medications', { name: medicationName });
      const newMedication = response.data as Medication;

      setMedications(prev => {
        const nameLower = (newMedication.name || '').toLowerCase().trim();
        const exists = prev.some(m => (m.name || '').toLowerCase().trim() === nameLower);
        if (!exists) {
          return [...prev, newMedication];
        }
        return prev;
      });

      logger.info('Medicamento creado', { medicationId: newMedication.id, name: newMedication.name }, 'api');
      showSuccess('Medicamento guardado con éxito', 'Se agregó a tu lista personal');
      return newMedication;
    } catch (err: any) {
      const isDuplicate = err?.response?.status === 400;
      if (isDuplicate) {
        logger.warn('Medicamento duplicado detectado', { medicationName }, 'api');
        showError('Ya tienes un medicamento con ese nombre');
      } else {
        logger.error('Error creating medicamento', err, 'api');
        showError('No se pudo guardar el medicamento');
      }
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

  // Add temporary prescription (for new consultations before saving)
  const addTemporaryPrescription = useCallback((prescriptionData: CreatePrescriptionData) => {
    // Find medication name from medications list
    const medication = medications.find(m => m.id === prescriptionData.medication_id);
    
    if (!medication) {
      logger.error(
        'No se encontró el medicamento en la lista temporal',
        { medicationId: prescriptionData.medication_id },
        'api'
      );
      return;
    }
    
    // Generate unique ID with timestamp and random component
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    
    const tempPrescription: ConsultationPrescription = {
      id: uniqueId,
      consultation_id: 0, // Temporary, will be set when consultation is created
      medication_id: prescriptionData.medication_id,
      medication_name: medication.name,
      dosage: prescriptionData.dosage,
      frequency: prescriptionData.frequency,
      duration: prescriptionData.duration,
      instructions: prescriptionData.instructions,
      quantity: prescriptionData.quantity,
      via_administracion: prescriptionData.via_administracion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    logger.debug('Agregando prescripción temporal local', tempPrescription, 'api');
    setPrescriptions(prev => {
      const duplicate = prev.some(existing =>
        existing.medication_id === tempPrescription.medication_id &&
        existing.dosage === tempPrescription.dosage &&
        existing.frequency === tempPrescription.frequency &&
        existing.duration === tempPrescription.duration &&
        existing.instructions === tempPrescription.instructions &&
        existing.quantity === tempPrescription.quantity &&
        existing.via_administracion === tempPrescription.via_administracion
      );

      if (duplicate) {
        return prev;
      }

      const newPrescriptions = [...prev, tempPrescription];
      logger.debug('Lista de prescripciones temporales actualizada', newPrescriptions, 'api');
      return newPrescriptions;
    });
  }, [medications]);

  // Form management
  const updateFormData = useCallback((data: Partial<CreatePrescriptionData>) => {
    setPrescriptionFormData(prev => ({ ...prev, ...data }));
  }, []);

  const submitForm = useCallback(async (consultationId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    logger.debug('submitForm prescripción', { consultationId, prescriptionFormData }, 'api');
    
    try {
      if (isEditingPrescription && selectedPrescription) {
        // Check if this is a temporary consultation
        if (consultationId === 'temp_consultation') {
          // For temporary consultations, update locally only
          
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
          logger.debug('Agregando prescripción temporal a la lista local', prescriptionFormData, 'api');
          
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
          
          logger.debug('Prescripción temporal generada', tempPrescription, 'api');
          setPrescriptions(prev => {
            const duplicate = prev.some(existing =>
              existing.medication_id === tempPrescription.medication_id &&
              existing.dosage === tempPrescription.dosage &&
              existing.frequency === tempPrescription.frequency &&
              existing.duration === tempPrescription.duration &&
              existing.instructions === tempPrescription.instructions &&
              existing.quantity === tempPrescription.quantity &&
              existing.via_administracion === tempPrescription.via_administracion
            );

            if (duplicate) {
              return prev;
            }

            const newPrescriptions = [...prev, tempPrescription];
            logger.debug('Lista de prescripciones temporales actualizada', newPrescriptions, 'api');
            return newPrescriptions;
          });
        } else {
          logger.debug('Creando prescripción en base de datos', prescriptionFormData, 'api');
          await createPrescription(prescriptionFormData, consultationId);
        }
      }
      
      logger.info('Prescripción guardada correctamente', undefined, 'api');
      closeDialog();
    } catch (err) {
      logger.error('Error al enviar la prescripción', err, 'api');
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
    clearTemporaryPrescriptions,
    addTemporaryPrescription
  };
};

