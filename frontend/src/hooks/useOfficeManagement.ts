import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';

export interface Office {
  id: number;
  doctor_id: number;
  name: string;
  address?: string;
  city?: string;
  state_id?: number;
  state_name?: string;
  country_id?: number;
  country_name?: string;
  phone?: string;
  maps_url?: string;
  virtual_url?: string;
  is_active: boolean;
  is_virtual: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface OfficeFormData {
  name: string;
  address: string;
  city: string;
  state_id: number | null;
  country_id: number | null;
  phone: string;
  maps_url: string;
  virtual_url: string;
  is_virtual: boolean;
  timezone: string;
}

export const useOfficeManagement = (doctorId?: number) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all offices for the current doctor
  const fetchOffices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const officesData = await apiService.offices.getOffices(doctorId);
      setOffices(officesData || []);
    } catch (err: any) {
      logger.error('Error fetching offices', err, 'api');
      setError('Error al cargar los consultorios');
      setOffices([]);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Create new office
  const createOffice = useCallback(async (officeData: OfficeFormData) => {
    try {
      const newOffice = await apiService.offices.createOffice(officeData);
      setOffices(prev => [...prev, newOffice]);
      return newOffice;
    } catch (err: any) {
      logger.error('Error creating office', err, 'api');
      throw err;
    }
  }, []);

  // Update existing office
  const updateOffice = useCallback(async (officeId: number, officeData: Partial<OfficeFormData>) => {
    try {
      const updatedOffice = await apiService.offices.updateOffice(officeId, officeData);
      setOffices(prev => prev.map(office => 
        office.id === officeId ? updatedOffice : office
      ));
      return updatedOffice;
    } catch (err: any) {
      logger.error('Error updating office', err, 'api');
      throw err;
    }
  }, []);

  // Delete office
  const deleteOffice = useCallback(async (officeId: number) => {
    try {
      await apiService.offices.deleteOffice(officeId);
      setOffices(prev => prev.filter(office => office.id !== officeId));
    } catch (err: any) {
      logger.error('Error deleting office', err, 'api');
      throw err;
    }
  }, []);

  // Load offices on mount
  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  return {
    offices,
    isLoading,
    error,
    fetchOffices,
    createOffice,
    updateOffice,
    deleteOffice
  };
};