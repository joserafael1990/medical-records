/**
 * Custom hook for managing ARCO requests (Access, Rectification, Cancellation, Opposition)
 * Handles patient data rights according to LFPDPPP
 */

import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { ARCORequest, CreateARCORequestData, UpdateARCORequestData } from '../types';

interface UseARCORequestsReturn {
  arcoRequests: ARCORequest[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchARCORequests: (patientId: number) => Promise<void>;
  createARCORequest: (data: CreateARCORequestData) => Promise<void>;
  updateARCORequest: (requestId: number, data: UpdateARCORequestData) => Promise<void>;
  clearError: () => void;
  
  // Dialog state
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

export const useARCORequests = (): UseARCORequestsReturn => {
  const [arcoRequests, setARCORequests] = useState<ARCORequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /**
   * Fetch all ARCO requests for a patient
   */
  const fetchARCORequests = useCallback(async (patientId: number) => {
    console.log('📋 Fetching ARCO requests for patient:', patientId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.get(`/api/privacy/arco-requests/${patientId}`);
      console.log('✅ ARCO requests:', response);
      
      setARCORequests(response.arco_requests || []);
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al obtener las solicitudes ARCO';
      console.error('❌ Error fetching ARCO requests:', errorMsg);
      setError(errorMsg);
      setARCORequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new ARCO request
   */
  const createARCORequest = useCallback(async (data: CreateARCORequestData) => {
    console.log('📤 Creating ARCO request:', data);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/api/privacy/arco-request', data);
      console.log('✅ ARCO request created:', response);
      
      // Add to local state
      if (response.arco_request) {
        setARCORequests(prev => [response.arco_request, ...prev]);
      }
      
      return response;
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al crear la solicitud ARCO';
      console.error('❌ Error creating ARCO request:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update an existing ARCO request status
   */
  const updateARCORequest = useCallback(async (requestId: number, data: UpdateARCORequestData) => {
    console.log('🔄 Updating ARCO request:', requestId, data);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.put(`/api/privacy/arco-request/${requestId}`, data);
      console.log('✅ ARCO request updated:', response);
      
      // Update in local state
      setARCORequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, ...response.arco_request, updated_at: new Date().toISOString() }
            : req
        )
      );
      
      return response;
    } catch (err: any) {
      const errorMsg = err?.detail || err?.message || 'Error al actualizar la solicitud ARCO';
      console.error('❌ Error updating ARCO request:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Open dialog
   */
  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  /**
   * Close dialog
   */
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setError(null);
  }, []);

  return {
    arcoRequests,
    isLoading,
    error,
    fetchARCORequests,
    createARCORequest,
    updateARCORequest,
    clearError,
    isDialogOpen,
    openDialog,
    closeDialog
  };
};

