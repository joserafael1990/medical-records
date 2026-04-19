import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export interface PracticeKPIs {
  current_month: string;
  consultations_this_month: number;
  consultations_last_month: number;
  consultations_delta_pct: number | null;
  new_patients_this_month: number;
  avg_consultation_duration_minutes: number | null;
}

export interface MonthBucket {
  month: string;
  count: number;
}

export interface DiagnosisRow {
  diagnosis: string;
  count: number;
}

export interface HeatmapRow {
  weekday: string;
  hour: number;
  count: number;
}

export interface DemographicsPayload {
  total_patients: number;
  by_gender: Array<{ gender: string; count: number }>;
  by_age_bucket: Array<{ bucket: string; count: number }>;
}

export interface PracticeSummary {
  kpis: PracticeKPIs;
  consultations_by_month: MonthBucket[];
  top_diagnoses: DiagnosisRow[];
  busy_heatmap: HeatmapRow[];
  demographics: DemographicsPayload;
  studies_by_month: MonthBucket[];
  generated_at: string;
  scope: 'doctor' | 'admin';
}

export class PracticeAnalyticsService extends ApiBase {
  async getPracticeSummary(): Promise<PracticeSummary> {
    try {
      const response = await this.api.get<PracticeSummary>(
        '/api/analytics/practice-summary'
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching practice summary', error, 'api');
      throw error;
    }
  }
}
