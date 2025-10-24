import { useState, useEffect, useCallback } from 'react';
import { Office, OfficeCreate, OfficeUpdate } from '../types';
import { apiService } from '../services/api';

export const useOfficeManagement = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOffices = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiService.get<Office[]>('/api/offices');
      setOffices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar consultorios');
    } finally {
      setLoading(false);
    }
  }, []);

  const createOffice = useCallback(async (officeData: OfficeCreate): Promise<Office> => {
    try {
      const newOffice = await apiService.post<Office>('/api/offices', officeData);
      setOffices(prev => [...prev, newOffice]);
      return newOffice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear consultorio');
      throw err;
    }
  }, []);

  const updateOffice = useCallback(async (id: number, officeData: OfficeUpdate): Promise<Office> => {
    try {
      const updatedOffice = await apiService.put<Office>(`/api/offices/${id}`, officeData);
      setOffices(prev => prev.map(office => 
        office.id === id ? updatedOffice : office
      ));
      return updatedOffice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar consultorio');
      throw err;
    }
  }, []);

  const deleteOffice = useCallback(async (id: number): Promise<void> => {
    try {
      await apiService.delete(`/api/offices/${id}`);
      setOffices(prev => prev.filter(office => office.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar consultorio');
      throw err;
    }
  }, []);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  return {
    offices,
    loading,
    error,
    loadOffices,
    createOffice,
    updateOffice,
    deleteOffice
  };
};
