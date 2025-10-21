// ============================================================================
// VITAL SIGNS HOOK - Gestión de signos vitales
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { VitalSign, ConsultationVitalSign, VitalSignFormData } from '../types';
import { apiService } from '../services/api';

export interface UseVitalSignsReturn {
  // State
  availableVitalSigns: VitalSign[];
  consultationVitalSigns: ConsultationVitalSign[];
  temporaryVitalSigns: VitalSignFormData[]; // For new consultations
  isLoading: boolean;
  error: string | null;
  vitalSignDialogOpen: boolean;
  isEditingVitalSign: boolean;
  selectedVitalSign: ConsultationVitalSign | null;
  vitalSignFormData: VitalSignFormData;
  isSubmitting: boolean;

  // Actions
  fetchAvailableVitalSigns: () => Promise<void>;
  fetchConsultationVitalSigns: (consultationId: string) => Promise<void>;
  createVitalSign: (consultationId: string, vitalSignData: VitalSignFormData) => Promise<ConsultationVitalSign>;
  updateVitalSign: (consultationId: string, vitalSignId: number, vitalSignData: VitalSignFormData) => Promise<ConsultationVitalSign>;
  deleteVitalSign: (consultationId: string, vitalSignId: number) => Promise<void>;
  clearTemporaryVitalSigns: () => void;
  getAllVitalSigns: () => ConsultationVitalSign[];
  
  // Dialog management
  openAddDialog: (vitalSign?: VitalSign) => void;
  openEditDialog: (vitalSign: ConsultationVitalSign) => void;
  closeDialog: () => void;
  
  // Form management
  updateFormData: (data: Partial<VitalSignFormData>) => void;
  submitForm: (consultationId: string) => Promise<void>;
  resetForm: () => void;
}

export const useVitalSigns = (): UseVitalSignsReturn => {
  // State
  const [availableVitalSigns, setAvailableVitalSigns] = useState<VitalSign[]>([]);
  const [consultationVitalSigns, setConsultationVitalSigns] = useState<ConsultationVitalSign[]>([]);
  const [temporaryVitalSigns, setTemporaryVitalSigns] = useState<VitalSignFormData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitalSignDialogOpen, setVitalSignDialogOpen] = useState(false);
  const [isEditingVitalSign, setIsEditingVitalSign] = useState(false);
  const [selectedVitalSign, setSelectedVitalSign] = useState<ConsultationVitalSign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data with default values
  const [vitalSignFormData, setVitalSignFormData] = useState<VitalSignFormData>({
    vital_sign_id: 0,
    value: '',
    unit: '',
    notes: ''
  });

  // Fetch available vital signs
  const fetchAvailableVitalSigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get('/api/vital-signs');
      setAvailableVitalSigns(response.data);
    } catch (err: any) {
      console.error('❌ Error fetching available vital signs:', err);
      setError(err.message || 'Error fetching available vital signs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch consultation vital signs
  const fetchConsultationVitalSigns = useCallback(async (consultationId: string) => {
    if (consultationId === 'temp_consultation') {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get(`/api/consultations/${consultationId}/vital-signs`);
      setConsultationVitalSigns(response.data);
    } catch (err: any) {
      console.error('❌ Error fetching consultation vital signs:', err);
      setError(err.message || 'Error fetching consultation vital signs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new vital sign
  const createVitalSign = useCallback(async (consultationId: string, vitalSignData: VitalSignFormData): Promise<ConsultationVitalSign> => {
    try {
      // Validate consultation ID
      if (!consultationId || consultationId === "temp_consultation" || isNaN(Number(consultationId))) {
        throw new Error("Invalid consultation ID. Please save the consultation first.");
      }
      
      const response = await apiService.post(`/api/consultations/${consultationId}/vital-signs`, vitalSignData);
      const newVitalSign = response.data;
      
      // Add to local state
      setConsultationVitalSigns(prev => [...prev, newVitalSign]);
      
      return newVitalSign;
    } catch (err: any) {
      console.error('❌ Error creating vital sign:', err);
      throw err;
    }
  }, []);

  // Update an existing vital sign
  const updateVitalSign = useCallback(async (consultationId: string, vitalSignId: number, vitalSignData: VitalSignFormData): Promise<ConsultationVitalSign> => {
    try {
      
      // Use POST endpoint which handles both create and update
      const response = await apiService.post(`/api/consultations/${consultationId}/vital-signs`, vitalSignData);
      const updatedVitalSign = response.data;
      
      // Update local state
      setConsultationVitalSigns(prev => 
        prev.map(vs => vs.id === vitalSignId ? updatedVitalSign : vs)
      );
      
      return updatedVitalSign;
    } catch (err: any) {
      console.error('❌ Error updating vital sign:', err);
      throw err;
    }
  }, []);

  // Delete a vital sign
  const deleteVitalSign = useCallback(async (consultationId: string, vitalSignId: number): Promise<void> => {
    try {
      
      await apiService.delete(`/api/consultations/${consultationId}/vital-signs/${vitalSignId}`);
      
      // Remove from local state
      setConsultationVitalSigns(prev => prev.filter(vs => vs.id !== vitalSignId));
      
    } catch (err: any) {
      console.error('❌ Error deleting vital sign:', err);
      throw err;
    }
  }, []);

  // Dialog management
  const openAddDialog = useCallback((vitalSign?: VitalSign) => {
    
    if (vitalSign) {
      setVitalSignFormData({
        vital_sign_id: vitalSign.id,
        value: '',
        unit: '',
        notes: ''
      });
    } else {
      setVitalSignFormData({
        vital_sign_id: 0,
        value: '',
        unit: '',
        notes: ''
      });
    }
    
    setIsEditingVitalSign(false);
    setSelectedVitalSign(null);
    setVitalSignDialogOpen(true);
    setError(null);
  }, [availableVitalSigns.length, vitalSignFormData]);

  const openEditDialog = useCallback((vitalSign: ConsultationVitalSign) => {
    
    setVitalSignFormData({
      vital_sign_id: vitalSign.vital_sign_id,
      value: vitalSign.value,
      unit: vitalSign.unit || '',
      notes: vitalSign.notes || ''
    });
    
    setIsEditingVitalSign(true);
    setSelectedVitalSign(vitalSign);
    setVitalSignDialogOpen(true);
    setError(null);
  }, [vitalSignDialogOpen, isEditingVitalSign]);

  const closeDialog = useCallback(() => {
    setVitalSignDialogOpen(false);
    setIsEditingVitalSign(false);
    setSelectedVitalSign(null);
    setError(null);
    resetForm();
  }, []);

  // Form management
  const updateFormData = useCallback((data: Partial<VitalSignFormData>) => {
    setVitalSignFormData(prev => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setVitalSignFormData({
      vital_sign_id: 0,
      value: '',
      unit: '',
      notes: ''
    });
  }, []);

  const submitForm = useCallback(async (consultationId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (consultationId === "temp_consultation") {
        // For new consultations, store temporarily
        if (isEditingVitalSign && selectedVitalSign) {
          // Update temporary vital sign
          setTemporaryVitalSigns(prev => 
            prev.map((vs, index) => 
              index === selectedVitalSign.id ? vitalSignFormData : vs
            )
          );
        } else {
          // Add new temporary vital sign
          setTemporaryVitalSigns(prev => [...prev, vitalSignFormData]);
        }
        closeDialog();
      } else {
        // For existing consultations, save to database
        if (isEditingVitalSign && selectedVitalSign) {
          await updateVitalSign(consultationId, selectedVitalSign.id, vitalSignFormData);
        } else {
          await createVitalSign(consultationId, vitalSignFormData);
        }
        closeDialog();
      }
    } catch (err: any) {
      console.error('❌ Error submitting vital sign form:', err);
      setError(err.message || 'Error saving vital sign');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingVitalSign, selectedVitalSign, vitalSignFormData, createVitalSign, updateVitalSign, closeDialog]);

  // Clear temporary vital signs (for new consultations)
  const clearTemporaryVitalSigns = useCallback(() => {
    setTemporaryVitalSigns([]);
  }, []);

  // Get all vital signs (both consultation and temporary)
  const getAllVitalSigns = useCallback(() => {
    if (consultationVitalSigns.length > 0) {
      return consultationVitalSigns;
    }
    // Convert temporary vital signs to display format
    return temporaryVitalSigns.map((vs, index) => ({
      id: index + 1000, // Temporary ID
      consultation_id: 0,
      vital_sign_id: vs.vital_sign_id,
      vital_sign_name: availableVitalSigns.find(v => v.id === vs.vital_sign_id)?.name || 'Signo Vital',
      value: vs.value,
      unit: vs.unit,
      notes: vs.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }, [consultationVitalSigns, temporaryVitalSigns, availableVitalSigns]);

  return {
    // State
    availableVitalSigns,
    consultationVitalSigns,
    temporaryVitalSigns,
    isLoading,
    error,
    vitalSignDialogOpen,
    isEditingVitalSign,
    selectedVitalSign,
    vitalSignFormData,
    isSubmitting,

    // Actions
    fetchAvailableVitalSigns,
    fetchConsultationVitalSigns,
    createVitalSign,
    updateVitalSign,
    deleteVitalSign,
    clearTemporaryVitalSigns,
    getAllVitalSigns,
    
    // Dialog management
    openAddDialog,
    openEditDialog,
    closeDialog,
    
    // Form management
    updateFormData,
    submitForm,
    resetForm
  };
};
