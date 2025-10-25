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

      const response = await fetch('/api/schedule/templates/weekly', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setScheduleData(data);
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
