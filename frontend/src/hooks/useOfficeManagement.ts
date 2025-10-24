import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

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
  timezone: string;
}

export const useOfficeManagement = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all offices for the current doctor
  const fetchOffices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🏢 Fetching offices...');
      const response = await apiService.get('/api/offices');
      console.log('🏢 Offices response:', response);
      const officesData = response.data || response;
      console.log('🏢 Offices data:', officesData);
      setOffices(officesData || []);
    } catch (err: any) {
      console.error('❌ Error fetching offices:', err);
      setError('Error al cargar los consultorios');
      setOffices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new office
  const createOffice = useCallback(async (officeData: OfficeFormData) => {
    try {
      console.log('🏢 Creating office:', officeData);
      const response = await apiService.post('/api/offices', officeData);
      console.log('🏢 Create office response:', response);
      const newOffice = response.data || response;
      setOffices(prev => [...prev, newOffice]);
      return newOffice;
    } catch (err: any) {
      console.error('❌ Error creating office:', err);
      throw err;
    }
  }, []);

  // Update existing office
  const updateOffice = useCallback(async (officeId: number, officeData: Partial<OfficeFormData>) => {
    try {
      console.log('🏢 Updating office:', officeId, officeData);
      const response = await apiService.put(`/api/offices/${officeId}`, officeData);
      console.log('🏢 Update office response:', response);
      const updatedOffice = response.data || response;
      setOffices(prev => prev.map(office => 
        office.id === officeId ? updatedOffice : office
      ));
      return updatedOffice;
    } catch (err: any) {
      console.error('❌ Error updating office:', err);
      throw err;
    }
  }, []);

  // Delete office
  const deleteOffice = useCallback(async (officeId: number) => {
    try {
      console.log('🏢 Deleting office:', officeId);
      await apiService.delete(`/api/offices/${officeId}`);
      console.log('🏢 Office deleted successfully');
      setOffices(prev => prev.filter(office => office.id !== officeId));
    } catch (err: any) {
      console.error('❌ Error deleting office:', err);
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