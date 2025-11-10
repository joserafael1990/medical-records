/**
 * Custom hook for analytics dashboard
 * Manages loading and state for dashboard metrics
 */

import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services';
import type { DashboardMetrics } from '../services/analytics/AnalyticsService';
import { logger } from '../utils/logger';

interface UseAnalyticsReturn {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboardData: (dateFrom?: string, dateTo?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAnalytics = (
  dateFrom?: string,
  dateTo?: string
): UseAnalyticsReturn => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(
    async (from?: string, to?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        logger.debug('Fetching dashboard metrics', { from, to }, 'api');
        const data = await apiService.analytics.getDashboardMetrics(from, to);
        setMetrics(data);
        logger.debug('Dashboard metrics loaded successfully', undefined, 'api');
      } catch (err: any) {
        const errorMsg =
          err?.detail || err?.message || 'Error al cargar las métricas del dashboard';
        setError(errorMsg);
        logger.error('Failed to fetch dashboard metrics', err, 'api');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(() => {
    return fetchDashboardData(dateFrom, dateTo);
  }, [fetchDashboardData, dateFrom, dateTo]);

  // Auto-fetch on mount or when dates change
  useEffect(() => {
    fetchDashboardData(dateFrom, dateTo);
  }, [fetchDashboardData, dateFrom, dateTo]);

  return {
    metrics,
    isLoading,
    error,
    fetchDashboardData,
    refresh
  };
};

