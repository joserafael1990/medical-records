import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export interface DashboardMetrics {
  patients: {
    total: number;
    newThisMonth: number;
    active: number;
  };
  consultations: {
    total: number;
    thisMonth: number;
    averagePerDay: number;
    trend: number;
    byMonth: Array<{ month: string; count: number }>;
  };
  appointments: {
    today: number;
    thisWeek: number;
    completed: number;
    cancelled: number;
    pending: number;
    attendanceRate: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  occupation: {
    hoursWorkedThisMonth: number;
    appointmentsCompleted: number;
    occupancyRate: number;
  };
  appointmentFlow: {
    totalScheduled: number;
    completedConsultations: number;
    cancelledByDoctor: number;
    cancelledByPatient: number;
    pending: number;
    percentages: {
      completed: number;
      cancelledByDoctor: number;
      cancelledByPatient: number;
      pending: number;
    };
    sankeyData: {
      nodes: Array<{ id: string; label: string }>;
      links: Array<{
        source: string;
        target: string;
        value: number;
        percentage: number;
      }>;
    };
  };
  appointmentTrends: {
    data: Array<{
      month: string;
      scheduled: number;
      cancelledByPatient: number;
      consultations: number;
    }>;
  };
  appointmentTypeSummary: {
    newPatient: number;
    followUp: number;
    other: number;
  };
}

export class AnalyticsService extends ApiBase {
  /**
   * Get dashboard metrics for the authenticated doctor
   * @param dateFrom Optional start date (YYYY-MM-DD)
   * @param dateTo Optional end date (YYYY-MM-DD)
   * @returns Dashboard metrics object
   */
  async getDashboardMetrics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<DashboardMetrics> {
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await this.api.get<DashboardMetrics>(
        '/api/analytics/dashboard',
        { params }
      );
      
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch dashboard metrics', error, 'api');
      throw error;
    }
  }
}

