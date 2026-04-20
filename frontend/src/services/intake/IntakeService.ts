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
  patient_first_name: string;
  appointment_date?: string | null;
}

export interface IntakeAppointmentResponse {
  has_response: boolean;
  submitted: boolean;
  submitted_at?: string | null;
  answers?: Record<string, unknown> | null;
  questions: IntakeQuestion[];
  token?: string | null;
}

export interface SendIntakeResponse {
  sent: boolean;
  response_id?: number | null;
  message_id?: string | null;
  error?: string | null;
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
}
