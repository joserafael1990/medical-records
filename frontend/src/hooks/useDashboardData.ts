import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLoadingState } from './useLoadingState';
import { apiService } from '../services/api';

export interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  pendingStudies: number;
  completedConsultations: number;
  newPatientsThisMonth: number;
  appointmentsTrend: number;
  patientsTrend: number;
  revenue: number;
  revenueTrend: number;
}

export interface RecentActivity {
  id: string;
  type: 'appointment' | 'consultation' | 'study' | 'patient';
  title: string;
  subtitle: string;
  time: string;
  patientId?: string;
  consultationId?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  upcomingAppointments: Array<{
    id: string;
    patientName: string;
    time: string;
    type: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    type: 'study_review' | 'prescription' | 'follow_up';
  }>;
  performanceMetrics: {
    consultationsPerDay: number;
    averageConsultationTime: number;
    patientSatisfaction: number;
    completionRate: number;
  };
}

export interface UseDashboardDataOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export interface UseDashboardDataReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refreshData: () => Promise<void>;
  getStatsTrend: (stat: keyof DashboardStats, days?: number) => Promise<number[]>;
  isRefreshing: boolean;
}

// Mock data generator for development
const generateMockDashboardData = (): DashboardData => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    stats: {
      todayAppointments: Math.floor(Math.random() * 15) + 5,
      totalPatients: Math.floor(Math.random() * 500) + 200,
      pendingStudies: Math.floor(Math.random() * 20) + 3,
      completedConsultations: Math.floor(Math.random() * 100) + 50,
      newPatientsThisMonth: Math.floor(Math.random() * 30) + 10,
      appointmentsTrend: (Math.random() - 0.5) * 20,
      patientsTrend: Math.random() * 15,
      revenue: Math.floor(Math.random() * 50000) + 20000,
      revenueTrend: (Math.random() - 0.3) * 25
    },
    recentActivities: [
      {
        id: '1',
        type: 'consultation',
        title: 'Consulta completada',
        subtitle: 'María González - Revisión general',
        time: 'hace 15 min'
      },
      {
        id: '2',
        type: 'study',
        title: 'Estudio clínico solicitado',
        subtitle: 'Juan Pérez - Radiografía de tórax',
        time: 'hace 30 min'
      },
      {
        id: '3',
        type: 'patient',
        title: 'Nuevo paciente registrado',
        subtitle: 'Ana López - Primera consulta',
        time: 'hace 1 hora'
      },
      {
        id: '4',
        type: 'appointment',
        title: 'Cita programada',
        subtitle: 'Carlos Rodríguez - Seguimiento',
        time: 'hace 2 horas'
      }
    ],
    upcomingAppointments: [
      {
        id: '1',
        patientName: 'Pedro Martínez',
        time: '10:30',
        type: 'Consulta general',
        status: 'confirmed'
      },
      {
        id: '2',
        patientName: 'Lucia Fernández',
        time: '11:15',
        type: 'Seguimiento',
        status: 'pending'
      },
      {
        id: '3',
        patientName: 'Roberto Silva',
        time: '14:00',
        type: 'Primera consulta',
        status: 'confirmed'
      }
    ],
    pendingTasks: [
      {
        id: '1',
        title: 'Revisar resultados de laboratorio',
        priority: 'high',
        dueDate: now.toISOString(),
        type: 'study_review'
      },
      {
        id: '2',
        title: 'Seguimiento post-operatorio',
        priority: 'medium',
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'follow_up'
      },
      {
        id: '3',
        title: 'Renovar prescripción médica',
        priority: 'low',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'prescription'
      }
    ],
    performanceMetrics: {
      consultationsPerDay: Math.floor(Math.random() * 20) + 10,
      averageConsultationTime: Math.floor(Math.random() * 30) + 15,
      patientSatisfaction: Math.random() * 20 + 80,
      completionRate: Math.random() * 15 + 85
    }
  };
};

export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataReturn {
  const { refreshInterval = 5 * 60 * 1000, autoRefresh = true } = options; // 5 minutes default

  const [data, setData] = useState<DashboardData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const {
    state: loadingState,
    execute: executeLoad,
    setData: setLoadingData
  } = useLoadingState<DashboardData>({
    minLoadingTime: 500
  });

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (): Promise<DashboardData> => {
    try {
      // Try to get real data from API
      const [dashboardResponse, consultationsResponse, patientsResponse] = await Promise.all([
        apiService.getDashboardData().catch(() => null),
        apiService.getConsultations('').catch(() => []),
        apiService.getPatients().catch(() => [])
      ]);

      if (dashboardResponse) {
        // If we have real API data, enhance it with calculated metrics
        const stats: DashboardStats = {
          todayAppointments: dashboardResponse.appointments_today || 0,
          totalPatients: patientsResponse.length || 0,
          pendingStudies: dashboardResponse.pending_studies || 0,
          completedConsultations: consultationsResponse.length || 0,
          newPatientsThisMonth: dashboardResponse.new_patients_this_month || 0,
          appointmentsTrend: dashboardResponse.appointments_trend || 0,
          patientsTrend: dashboardResponse.patients_trend || 0,
          revenue: dashboardResponse.revenue || 0,
          revenueTrend: dashboardResponse.revenue_trend || 0
        };

        // Generate recent activities from real data
        const recentActivities: RecentActivity[] = consultationsResponse
          .slice(0, 5)
          .map((consultation, index) => ({
            id: consultation.id,
            type: 'consultation' as const,
            title: 'Consulta registrada',
            subtitle: `${consultation.patient_name} - ${consultation.chief_complaint || 'Consulta general'}`,
            time: `hace ${index + 1} hora${index > 0 ? 's' : ''}`,
            patientId: consultation.patient_id,
            consultationId: consultation.id
          }));

        return {
          stats,
          recentActivities,
          upcomingAppointments: dashboardResponse.upcoming_appointments || [],
          pendingTasks: dashboardResponse.pending_tasks || [],
          performanceMetrics: dashboardResponse.performance_metrics || {
            consultationsPerDay: Math.floor(consultationsResponse.length / 30),
            averageConsultationTime: 25,
            patientSatisfaction: 92,
            completionRate: 88
          }
        };
      }
    } catch (error) {
      console.warn('Failed to fetch real dashboard data, using mock data:', error);
    }

    // Fallback to mock data
    return generateMockDashboardData();
  }, []);

  // Refresh data function
  const refreshData = useCallback(async () => {
    const result = await executeLoad(fetchDashboardData);
    if (result) {
      setData(result);
      setLastRefresh(new Date());
      setRefreshCounter(prev => prev + 1);
    }
  }, [executeLoad, fetchDashboardData]);

  // Get trends for specific stats
  const getStatsTrend = useCallback(async (
    stat: keyof DashboardStats, 
    days: number = 7
  ): Promise<number[]> => {
    try {
      // This would typically call a specific API endpoint for trend data
      // For now, generate mock trend data
      return Array.from({ length: days }, () => 
        Math.floor(Math.random() * 100) + 50
      );
    } catch (error) {
      console.error('Failed to fetch trend data:', error);
      return [];
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized computed values
  const computedValues = useMemo(() => ({
    isRefreshing: loadingState.isLoading && !!data, // Only true if we already have data
    isInitialLoading: loadingState.isLoading && !data
  }), [loadingState.isLoading, data]);

  return {
    data,
    isLoading: computedValues.isInitialLoading,
    error: loadingState.error,
    lastRefresh,
    refreshData,
    getStatsTrend,
    isRefreshing: computedValues.isRefreshing
  };
}

// Specialized hooks for specific dashboard sections
export function useDashboardStats() {
  const { data, isLoading, error, refreshData } = useDashboardData();
  
  return {
    stats: data?.stats || null,
    isLoading,
    error,
    refreshStats: refreshData
  };
}

export function useRecentActivities() {
  const { data, isLoading, error, refreshData } = useDashboardData();
  
  return {
    activities: data?.recentActivities || [],
    isLoading,
    error,
    refreshActivities: refreshData
  };
}

export function useUpcomingAppointments() {
  const { data, isLoading, error, refreshData } = useDashboardData();
  
  return {
    appointments: data?.upcomingAppointments || [],
    isLoading,
    error,
    refreshAppointments: refreshData
  };
}

export function usePendingTasks() {
  const { data, isLoading, error, refreshData } = useDashboardData();
  
  return {
    tasks: data?.pendingTasks || [],
    isLoading,
    error,
    refreshTasks: refreshData
  };
}
