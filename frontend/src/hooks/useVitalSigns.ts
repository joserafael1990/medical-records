// ============================================================================
// VITAL SIGNS HOOK - Gestión de signos vitales
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
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
  temporaryVitalSigns: (VitalSignFormData & { id: number })[]; // For new consultations
  allVitalSigns: ConsultationVitalSign[]; // Reactive combined list
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
  const [temporaryVitalSigns, setTemporaryVitalSigns] = useState<(VitalSignFormData & { id: number })[]>([]);
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

  // Load available vital signs on initialization
  useEffect(() => {
    if (availableVitalSigns.length === 0) {
      fetchAvailableVitalSigns();
    }
  }, [fetchAvailableVitalSigns, availableVitalSigns.length]);

  // Fetch consultation vital signs
  const fetchConsultationVitalSigns = useCallback(async (consultationId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:120',message:'fetchConsultationVitalSigns called',data:{consultationId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (consultationId === 'temp_consultation') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.consultations.api.get(`/api/consultations/${consultationId}/vital-signs`);
      const vitalSignsData = response.data || response;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:131',message:'Before setConsultationVitalSigns (fetch)',data:{vitalSignsCount:vitalSignsData?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setConsultationVitalSigns(vitalSignsData);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:132',message:'After setConsultationVitalSigns (fetch)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:164',message:'createVitalSign called',data:{consultationId,vitalSignId:vitalSignData.vital_sign_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    try {
      // Validate consultation ID
      if (!consultationId || consultationId === "temp_consultation" || isNaN(Number(consultationId))) {
        throw new Error("Invalid consultation ID. Please save the consultation first.");
      }

      const response = await apiService.consultations.api.post(`/api/consultations/${consultationId}/vital-signs`, vitalSignData);
      const newVitalSign = response.data;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:172',message:'createVitalSign response received',data:{newVitalSignId:newVitalSign?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:187',message:'Before setConsultationVitalSigns',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      setConsultationVitalSigns(prev => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:189',message:'setConsultationVitalSigns callback',data:{prevLength:prev.length,newVitalSignId:newVitalSign?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        return [...prev, newVitalSign];
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:193',message:'After setConsultationVitalSigns',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion

      return newVitalSign;
    } catch (err: any) {
      logger.error('Error creating vital sign', err, 'api');
      throw err;
    }
  }, []);

  // Update an existing vital sign
  const updateVitalSign = useCallback(async (consultationId: string, vitalSignId: number, vitalSignData: VitalSignFormData): Promise<ConsultationVitalSign> => {
    try {
      // Handle temporary consultations (for new consultations)
      if (consultationId === 'temp_consultation' || consultationId === '0') {
        const matchingAvailable = availableVitalSigns.find(avs => avs.id === vitalSignData.vital_sign_id);
        const updatedTempVitalSign: ConsultationVitalSign = {
          id: vitalSignId,
          consultation_id: 0,
          vital_sign_id: vitalSignData.vital_sign_id,
          vital_sign_name: matchingAvailable?.name || 'Signo Vital',
          value: vitalSignData.value,
          unit: vitalSignData.unit || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setTemporaryVitalSigns(prev =>
          prev.map(vs => vs.id === vitalSignId ? { ...vs, ...vitalSignData } : vs)
        );

        return updatedTempVitalSign;
      }

      // For existing consultations, use POST endpoint which handles both create and update
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
  }, [availableVitalSigns]);

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
              vs.vital_sign_id === selectedVitalSign.vital_sign_id ? { ...vs, ...vitalSignFormData } : vs
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:451',message:'addTemporaryVitalSign called',data:{vitalSignId:vitalSignData.vital_sign_id,value:vitalSignData.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('[useVitalSigns] addTemporaryVitalSign called', vitalSignData);
    const newTempVitalSign = {
      ...vitalSignData,
      id: Date.now() + Math.random()
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:456',message:'Before setTemporaryVitalSigns',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setTemporaryVitalSigns(prev => {
      // Remove any existing temporary vital sign with the same vital_sign_id to avoid duplicates
      const filtered = prev.filter(vs => vs.vital_sign_id !== vitalSignData.vital_sign_id);
      const updated = [...filtered, newTempVitalSign];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:458',message:'setTemporaryVitalSigns callback',data:{prevLength:prev.length,filteredLength:filtered.length,updatedLength:updated.length,newVitalSignId:newTempVitalSign.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('[useVitalSigns] setTemporaryVitalSigns updating', {
        prevLength: prev.length,
        filteredLength: filtered.length,
        updatedLength: updated.length,
        newVitalSign: newTempVitalSign
      });
      return updated;
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:461',message:'After setTemporaryVitalSigns',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }, []);

  // Clear temporary vital signs (for new consultations)
  const clearTemporaryVitalSigns = useCallback(() => {
    setTemporaryVitalSigns([]);
  }, []);

  // Get all vital signs (both consultation and temporary) - memoized for reactivity
  const allVitalSigns = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:456',message:'allVitalSigns recomputing',data:{consultationVitalSignsLength:consultationVitalSigns?.length,temporaryVitalSignsLength:temporaryVitalSigns?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('[useVitalSigns] allVitalSigns recomputing', {
      consultationVitalSigns: consultationVitalSigns?.length,
      temporaryVitalSigns: temporaryVitalSigns?.length,
      availableVitalSigns: availableVitalSigns?.length,
      temporaryVitalSignsData: temporaryVitalSigns?.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value }))
    });

    // Always return both consultation and temporary vital signs
    // Create a completely new array to ensure React detects the change
    const combined: ConsultationVitalSign[] = [];

    // Add consultation vital signs
    if (consultationVitalSigns && consultationVitalSigns.length > 0) {
      combined.push(...consultationVitalSigns.map(vs => ({ ...vs })));
    }

    // Add temporary vital signs if any
    if (temporaryVitalSigns && temporaryVitalSigns.length > 0) {
      console.log('[useVitalSigns] Adding temporary vital signs:', temporaryVitalSigns);
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
      combined.push(...tempVitalSigns);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useVitalSigns.ts:476',message:'allVitalSigns result',data:{combinedLength:combined.length,combinedData:combined.map(vs=>({id:vs.id,vital_sign_id:vs.vital_sign_id,value:vs.value}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('[useVitalSigns] allVitalSigns result:', {
      length: combined.length,
      data: combined.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value }))
    });
    // Always return a new array reference
    return [...combined];
  }, [consultationVitalSigns, temporaryVitalSigns, availableVitalSigns]);

  // Keep the function for backwards compatibility
  const getAllVitalSigns = useCallback(() => {
    return allVitalSigns;
  }, [allVitalSigns]);

  return {
    // State
    availableVitalSigns,
    consultationVitalSigns,
    temporaryVitalSigns,
    allVitalSigns, // Reactive combined list
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
