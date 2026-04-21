import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export type IntakeQuestionType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'yes_no'
  | 'scale_1_10';

export interface IntakeSelectOption {
  value: string;
  label: string;
}

export interface IntakeQuestion {
  id: string;
  label: string;
  type: IntakeQuestionType;
  section?: string;
  required?: boolean;
  max_length?: number;
  help_text?: string;
  options?: IntakeSelectOption[];
  followup?: {
    label: string;
    type: IntakeQuestionType;
    max_length?: number;
  };
}

export interface PublicIntakePayload {
  questions: IntakeQuestion[];
  section_labels?: Record<string, string>;
  section_order?: string[];
  patient_first_name: string;
  appointment_date?: string | null;
}

export interface IntakeAppointmentResponse {
  has_response: boolean;
  submitted: boolean;
  submitted_at?: string | null;
  answers?: Record<string, unknown> | null;
  questions: IntakeQuestion[];
  section_labels?: Record<string, string>;
  section_order?: string[];
  token?: string | null;
}

export interface SendIntakeResponse {
  sent: boolean;
  response_id?: number | null;
  message_id?: string | null;
  error?: string | null;
}

export interface IntakePreferencesResponse {
  excluded_ids: string[];
  questions: IntakeQuestion[];
  section_labels: Record<string, string>;
  section_order: string[];
}

export class IntakeService extends ApiBase {
  async sendToAppointment(appointmentId: number): Promise<SendIntakeResponse> {
    try {
      const response = await this.api.post<SendIntakeResponse>(
        `/api/intake/send/${appointmentId}`
      );
      return response.data;
    } catch (error) {
      logger.error('Error sending intake questionnaire', error, 'api');
      throw error;
    }
  }

  async getForAppointment(appointmentId: number): Promise<IntakeAppointmentResponse> {
    try {
      const response = await this.api.get<IntakeAppointmentResponse>(
        `/api/intake/appointment/${appointmentId}`
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching intake for appointment', error, 'api');
      throw error;
    }
  }

  async loadPublic(token: string): Promise<PublicIntakePayload> {
    const response = await this.api.get<PublicIntakePayload>(
      `/api/intake/public/${token}`
    );
    return response.data;
  }

  async submitPublic(
    token: string,
    answers: Record<string, unknown>
  ): Promise<{ submitted: boolean }> {
    const response = await this.api.post<{ submitted: boolean }>(
      `/api/intake/public/${token}`,
      { answers }
    );
    return response.data;
  }

  async getPreferences(): Promise<IntakePreferencesResponse> {
    try {
      const response = await this.api.get<IntakePreferencesResponse>(
        '/api/intake/preferences'
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching intake preferences', error, 'api');
      throw error;
    }
  }

  async updatePreferences(
    excludedIds: string[]
  ): Promise<IntakePreferencesResponse> {
    try {
      const response = await this.api.put<IntakePreferencesResponse>(
        '/api/intake/preferences',
        { excluded_ids: excludedIds }
      );
      return response.data;
    } catch (error) {
      logger.error('Error updating intake preferences', error, 'api');
      throw error;
    }
  }
}
