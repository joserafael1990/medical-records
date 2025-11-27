// ============================================================================
// VITAL SIGNS HOOK - Gestión de signos vitales
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { VitalSign, ConsultationVitalSign, VitalSignFormData } from '../types';
import { apiService } from '../services';
import { logger } from '../utils/logger';

export interface PatientVitalSignsHistory {
  patient_id: number;
  patient_name: string;
  vital_signs_history: Array<{
    vital_sign_id: number;
    vital_sign_name: string;
    data: Array<{
      value: number | null;
      unit: string;
      date: string | null;
      consultation_id: number;
    }>;
  }>;
}

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
  fetchPatientVitalSignsHistory: (patientId: number) => Promise<PatientVitalSignsHistory>;
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
  
  // BMI calculation
  calculateBMI: (weight: number, height: number) => number;
  
  // Direct add method (no dialog)
  addTemporaryVitalSign: (vitalSignData: VitalSignFormData & { vital_sign_name: string }) => void;
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
    unit: ''
  });

  // Fetch available vital signs
  const fetchAvailableVitalSigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.consultations.api.get('/api/vital-signs');
      
      // Handle different response structures
      let vitalSignsData = [];
      if (Array.isArray(response.data)) {
        vitalSignsData = response.data;
      } else if (Array.isArray(response)) {
        vitalSignsData = response;
      } else if (response && Array.isArray(response)) {
        vitalSignsData = response;
      }
      
      setAvailableVitalSigns(vitalSignsData);
    } catch (err: any) {
      logger.error('Error fetching available vital signs', err, 'api');
      setError(err.message || 'Error fetching available vital signs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load available vital signs when dialog opens (only once)
  useEffect(() => {
    if (vitalSignDialogOpen && availableVitalSigns.length === 0) {
      fetchAvailableVitalSigns();
    }
  }, [vitalSignDialogOpen]); // Removed availableVitalSigns and fetchAvailableVitalSigns from dependencies

  // Fetch consultation vital signs
  const fetchConsultationVitalSigns = useCallback(async (consultationId: string) => {
    if (consultationId === 'temp_consultation') {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.consultations.api.get(`/api/consultations/${consultationId}/vital-signs`);
      const vitalSignsData = response.data || response;
      setConsultationVitalSigns(vitalSignsData);
    } catch (err: any) {
      logger.error('Error fetching consultation vital signs', err, 'api');
      setError(err.message || 'Error fetching consultation vital signs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch patient vital signs history
  const fetchPatientVitalSignsHistory = useCallback(async (patientId: number): Promise<PatientVitalSignsHistory> => {
    try {
      const response = await apiService.consultations.api.get(`/api/patients/${patientId}/vital-signs/history`);
      
      // Track vital signs viewed
      try {
        const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
        trackAmplitudeEvent('vital_signs_viewed', {
          patient_id: patientId,
          has_history: !!(response.data || response)
        });
      } catch (e) {
        // Silently fail
      }
      
      return response.data || response;
    } catch (err: any) {
      logger.error('Error fetching patient vital signs history', err, 'api');
      throw err;
    }
  }, []);

  // Create a new vital sign
  const createVitalSign = useCallback(async (consultationId: string, vitalSignData: VitalSignFormData): Promise<ConsultationVitalSign> => {
    try {
      // Validate consultation ID
      if (!consultationId || consultationId === "temp_consultation" || isNaN(Number(consultationId))) {
        throw new Error("Invalid consultation ID. Please save the consultation first.");
      }
      
      const response = await apiService.consultations.api.post(`/api/consultations/${consultationId}/vital-signs`, vitalSignData);
      const newVitalSign = response.data;
      
      // Track vital signs recorded
      try {
        const { trackAmplitudeEvent } = require('../utils/amplitudeHelper');
        trackAmplitudeEvent('vital_signs_recorded', {
          vital_sign_id: vitalSignData.vital_sign_id,
          has_value: !!vitalSignData.value,
          has_unit: !!vitalSignData.unit
        });
      } catch (e) {
        // Silently fail
      }
      
      // Add to local state
      setConsultationVitalSigns(prev => [...prev, newVitalSign]);
      
      return newVitalSign;
    } catch (err: any) {
      logger.error('Error creating vital sign', err, 'api');
      throw err;
    }
  }, []);

  // Update an existing vital sign
  const updateVitalSign = useCallback(async (consultationId: string, vitalSignId: number, vitalSignData: VitalSignFormData): Promise<ConsultationVitalSign> => {
    try {
      
      // Use POST endpoint which handles both create and update
      const response = await apiService.consultations.api.post(`/api/consultations/${consultationId}/vital-signs`, vitalSignData);
      const updatedVitalSign = response.data;
      
      // Update local state
      setConsultationVitalSigns(prev => 
        prev.map(vs => vs.id === vitalSignId ? updatedVitalSign : vs)
      );
      
      return updatedVitalSign;
    } catch (err: any) {
      logger.error('Error updating vital sign', err, 'api');
      throw err;
    }
  }, []);

  // Delete a vital sign
  const deleteVitalSign = useCallback(async (consultationId: string, vitalSignId: number): Promise<void> => {
    try {
      if (consultationId === "temp_consultation") {
        // For temporary vital signs, remove by id
        setTemporaryVitalSigns(prev => {
          const filtered = prev.filter(vs => vs.id !== vitalSignId);
          return filtered;
        });
      } else {
        await apiService.consultations.api.delete(`/api/consultations/${consultationId}/vital-signs/${vitalSignId}`);
        
        // Remove from local state
        setConsultationVitalSigns(prev => prev.filter(vs => vs.id !== vitalSignId));
      }
    } catch (err: any) {
      logger.error('Error deleting vital sign', err, 'api');
      throw err;
    }
  }, []);

  // Dialog management
  const openAddDialog = useCallback((vitalSign?: VitalSign) => {
    
    if (vitalSign) {
      setVitalSignFormData({
        vital_sign_id: vitalSign.id,
        value: '',
        unit: ''
      });
    } else {
      setVitalSignFormData({
        vital_sign_id: 0,
        value: '',
        unit: ''
      });
    }
    
    setIsEditingVitalSign(false);
    setSelectedVitalSign(null);
    setVitalSignDialogOpen(true);
    setError(null);
  }, [availableVitalSigns]);

  const openEditDialog = useCallback((vitalSign: ConsultationVitalSign) => {
    
    setVitalSignFormData({
      vital_sign_id: vitalSign.vital_sign_id,
      value: vitalSign.value,
      unit: vitalSign.unit || ''
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
      unit: ''
    });
  }, []);

  const submitForm = useCallback(async (consultationId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (consultationId === "temp_consultation") {
        // For new consultations, store temporarily
        if (isEditingVitalSign && selectedVitalSign) {
          // Update temporary vital sign - find by vital_sign_id instead of index
          setTemporaryVitalSigns(prev => 
            prev.map((vs) => 
              vs.vital_sign_id === selectedVitalSign.vital_sign_id ? vitalSignFormData : vs
            )
          );
        } else {
          // Add new temporary vital sign with unique ID
          const newVitalSign = {
            ...vitalSignFormData,
            id: Date.now() + Math.random() // Generate unique ID
          };
          setTemporaryVitalSigns(prev => [...prev, newVitalSign]);
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
      logger.error('Error submitting vital sign form', err, 'api');
      setError(err.message || 'Error saving vital sign');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditingVitalSign, selectedVitalSign, vitalSignFormData, createVitalSign, updateVitalSign, closeDialog]);

  // Auto-calculate BMI when weight or height is added/updated
  const calculateBMI = useCallback((weight: number, height: number): number => {
    if (weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    return 0;
  }, []);

  const autoCalculateBMI = useCallback(() => {
    const allVitalSigns = [...consultationVitalSigns, ...temporaryVitalSigns];
    
    // Find weight and height signs
    const weightSign = allVitalSigns.find(vs => {
      const vitalSign = availableVitalSigns.find(avs => avs.id === vs.vital_sign_id);
      return vitalSign && vitalSign.name.toLowerCase().includes('peso');
    });
    
    const heightSign = allVitalSigns.find(vs => {
      const vitalSign = availableVitalSigns.find(avs => avs.id === vs.vital_sign_id);
      return vitalSign && (vitalSign.name.toLowerCase().includes('estatura') || vitalSign.name.toLowerCase().includes('altura'));
    });
    
    
    // Find BMI sign
    const bmiSign = allVitalSigns.find(vs => {
      const vitalSign = availableVitalSigns.find(avs => avs.id === vs.vital_sign_id);
      return vitalSign && (vitalSign.name.toLowerCase().includes('imc') || vitalSign.name.toLowerCase().includes('índice de masa corporal') || vitalSign.name.toLowerCase().includes('bmi'));
    });
    
    
    if (weightSign && heightSign && bmiSign) {
      const weight = parseFloat(weightSign.value);
      const height = parseFloat(heightSign.value);
      
      
      if (!isNaN(weight) && !isNaN(height) && height > 0) {
        const bmi = calculateBMI(weight, height);
        
        // Only auto-update BMI if it's empty or very close to the calculated value (allowing for small manual adjustments)
        const currentBMI = parseFloat(bmiSign.value);
        const isBMICloseToCalculated = Math.abs(currentBMI - bmi) < 0.1; // Allow 0.1 difference
        
        
        if (!bmiSign.value || bmiSign.value.trim() === '' || isBMICloseToCalculated) {
          // For temp consultations, update in local state only
        if (bmiSign.id && typeof bmiSign.id === 'number' && bmiSign.id > 0) {
          // This is a saved vital sign - skip auto-update for now
          // Auto-update only works for temporary vital signs
        } else {
          // Update temporary BMI sign in local state
          setTemporaryVitalSigns(prev => 
            prev.map(vs => 
              vs.vital_sign_id === bmiSign.vital_sign_id 
                ? { ...vs, value: bmi.toString() }
                : vs
            )
          );
        }
        }
      }
    }
  }, [consultationVitalSigns, temporaryVitalSigns, availableVitalSigns, calculateBMI, updateVitalSign]);

  // Auto-calculate BMI when vital signs change
  useEffect(() => {
    autoCalculateBMI();
  }, [consultationVitalSigns, temporaryVitalSigns, autoCalculateBMI]);

  // Direct add method for temporary vital signs (no dialog)
  const addTemporaryVitalSign = useCallback((vitalSignData: VitalSignFormData & { vital_sign_name: string }) => {
    const newTempVitalSign = {
      ...vitalSignData,
      id: Date.now() + Math.random()
    };
    setTemporaryVitalSigns(prev => [...prev, newTempVitalSign]);
  }, []);

  // Clear temporary vital signs (for new consultations)
  const clearTemporaryVitalSigns = useCallback(() => {
    setTemporaryVitalSigns([]);
  }, []);

  // Get all vital signs (both consultation and temporary)
  const getAllVitalSigns = useCallback(() => {
    // Always return both consultation and temporary vital signs
    const allVitalSigns = [...(consultationVitalSigns || [])];
    
    // Add temporary vital signs if any
    if (temporaryVitalSigns && temporaryVitalSigns.length > 0) {
      const tempVitalSigns = (temporaryVitalSigns || []).map((vs) => ({
        id: vs.id, // Use the actual ID from temporary vital sign
        consultation_id: 0,
        vital_sign_id: vs.vital_sign_id,
        vital_sign_name: ((availableVitalSigns || []).find(v => v.id === vs.vital_sign_id) || {}).name || 'Signo Vital',
        value: vs.value,
        unit: vs.unit,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      allVitalSigns.push(...tempVitalSigns);
    }
    
    return allVitalSigns;
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
    fetchPatientVitalSignsHistory,
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
    resetForm,
    
    // BMI calculation
    calculateBMI,
    
    // Direct add method
    addTemporaryVitalSign
  };
};
