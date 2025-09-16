import { useState, useEffect } from 'react';
import { API_CONFIG } from '../constants';

export interface EmergencyRelationship {
  code: string;
  name: string;
  active: boolean;
  created_at: string;
}

export const useEmergencyRelationships = () => {
  const [relationships, setRelationships] = useState<EmergencyRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMERGENCY_RELATIONSHIPS}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRelationships(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error fetching emergency relationships:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, []);

  return {
    relationships,
    isLoading,
    error,
    refetch: fetchRelationships
  };
};
