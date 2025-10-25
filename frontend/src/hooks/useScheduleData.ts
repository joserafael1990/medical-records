import { useState, useEffect } from 'react';

interface TimeBlock {
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ScheduleTemplate {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  consultation_duration: number;
  break_duration: number;
  lunch_start: string | null;
  lunch_end: string | null;
  is_active: boolean;
  time_blocks: TimeBlock[];
}

interface WeeklySchedule {
  monday: ScheduleTemplate | null;
  tuesday: ScheduleTemplate | null;
  wednesday: ScheduleTemplate | null;
  thursday: ScheduleTemplate | null;
  friday: ScheduleTemplate | null;
  saturday: ScheduleTemplate | null;
  sunday: ScheduleTemplate | null;
}

export const useScheduleData = () => {
  const [scheduleData, setScheduleData] = useState<WeeklySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:8000/api/schedule/templates/weekly', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        
        if (response.status === 401) {
          // For 401, show empty schedule instead of error
          setScheduleData({
            monday: null,
            tuesday: null,
            wednesday: null,
            thursday: null,
            friday: null,
            saturday: null,
            sunday: null
          });
          return;
        } else if (response.status === 404) {
          throw new Error('Endpoint no encontrado');
        } else {
          throw new Error(`Error del servidor: ${response.status}`);
        }
      }

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('El servidor devolvió HTML en lugar de JSON. Verifica la configuración del backend.');
      }

      const data = await response.json();
      
      // Check if we have any schedule data
      const hasScheduleData = Object.values(data).some(day => day && day.is_active);
      
      if (hasScheduleData) {
        setScheduleData(data);
      } else {
        // No schedule data, set to empty object
        setScheduleData({
          monday: null,
          tuesday: null,
          wednesday: null,
          thursday: null,
          friday: null,
          saturday: null,
          sunday: null
        });
      }
    } catch (err) {
      console.error('Error fetching schedule data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  return {
    scheduleData,
    loading,
    error,
    refetch: fetchScheduleData,
  };
};
