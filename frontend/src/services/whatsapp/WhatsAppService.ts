import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export class WhatsAppService extends ApiBase {
  /**
   * Send WhatsApp appointment reminder
   */
  async sendAppointmentReminder(appointmentId: number): Promise<any> {
    try {
      const response = await this.api.post(`/api/whatsapp/appointment-reminder/${appointmentId}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp appointment reminder', error, 'api');
      throw error;
    }
  }

  /**
   * Send WhatsApp study results
   */
  async sendStudyResults(studyId: number): Promise<any> {
    try {
      const response = await this.api.post(`/api/whatsapp/study-results/${studyId}`);
      return response.data;
    } catch (error) {
      logger.error('Error sending WhatsApp study results', error, 'api');
      throw error;
    }
  }
}

