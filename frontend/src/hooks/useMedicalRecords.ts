/**
 * Medical Records Management Hook
 * Centralized hook for all medical record-related operations
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';
import type { MedicalRecord, MedicalRecordFormData } from '../types';

interface MedicalRecordsState {
  medicalRecords: MedicalRecord[];
  selectedRecord: MedicalRecord | null;
  detailView: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
}

interface MedicalRecordsActions {
  // Data operations
  fetchMedicalRecords: (patientId?: number) => Promise<void>;
  createMedicalRecord: (data: MedicalRecordFormData) => Promise<MedicalRecord>;
  updateMedicalRecord: (id: number, data: MedicalRecordFormData) => Promise<MedicalRecord>;
  deleteMedicalRecord: (id: number) => Promise<void>;
  
  // UI state management
  setSelectedRecord: (record: MedicalRecord | null) => void;
  setDetailView: (view: boolean) => void;
  viewRecord: (record: MedicalRecord) => void;
  backFromDetail: () => void;
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  clearMessages: () => void;
}

type UseMedicalRecordsReturn = MedicalRecordsState & MedicalRecordsActions;

export const useMedicalRecords = (): UseMedicalRecordsReturn => {
  // State
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [detailView, setDetailView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch medical records
  const fetchMedicalRecords = useCallback(async (patientId?: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = patientId ? `?patient_id=${patientId}` : '';
      const response = await apiService.get(`/api/medical-records${params}`);
      
      // Ensure we always have an array
      let records = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          records = response.data.data;
        }
      }
      
      setMedicalRecords(records);
    } catch (err: any) {
      console.error('Error loading medical records:', err);
      setError(err.message || 'Error al cargar expedientes médicos');
      setMedicalRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create medical record
  const createMedicalRecord = useCallback(async (data: MedicalRecordFormData): Promise<MedicalRecord> => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await apiService.post('/api/medical-records', data);
      const newRecord = response.data;
      
      setMedicalRecords(prev => [newRecord, ...prev]);
      setSuccessMessage('Expediente médico creado exitosamente');
      
      return newRecord;
    } catch (err: any) {
      console.error('Error creating medical record:', err);
      setError(err.message || 'Error al crear expediente médico');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Update medical record
  const updateMedicalRecord = useCallback(async (id: number, data: MedicalRecordFormData): Promise<MedicalRecord> => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await apiService.put(`/api/medical-records/${id}`, data);
      const updatedRecord = response.data;
      
      setMedicalRecords(prev => 
        prev.map(record => record.id === id ? updatedRecord : record)
      );
      setSuccessMessage('Expediente médico actualizado exitosamente');
      
      return updatedRecord;
    } catch (err: any) {
      console.error('Error updating medical record:', err);
      setError(err.message || 'Error al actualizar expediente médico');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Delete medical record
  const deleteMedicalRecord = useCallback(async (id: number): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await apiService.delete(`/api/medical-records/${id}`);
      
      setMedicalRecords(prev => prev.filter(record => record.id !== id));
      setSuccessMessage('Expediente médico eliminado exitosamente');
    } catch (err: any) {
      console.error('Error deleting medical record:', err);
      setError(err.message || 'Error al eliminar expediente médico');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // View record
  const viewRecord = useCallback((record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailView(true);
  }, []);

  // Back from detail view
  const backFromDetail = useCallback(() => {
    setDetailView(false);
    setSelectedRecord(null);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return {
    // State
    medicalRecords,
    selectedRecord,
    detailView,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    
    // Actions
    fetchMedicalRecords,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    setSelectedRecord,
    setDetailView,
    viewRecord,
    backFromDetail,
    setError,
    setSuccessMessage,
    clearMessages
  };
};
