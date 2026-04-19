import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';
import type { ExpedienteCompletoPayload } from '../pdf/generators/ExpedienteCompletoGenerator';

export class ExpedienteService extends ApiBase {
  async getFullExpediente(patientId: number): Promise<ExpedienteCompletoPayload> {
    try {
      const response = await this.api.get<ExpedienteCompletoPayload>(
        `/api/patients/${patientId}/expediente/full`
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching full expediente', error, 'api');
      throw error;
    }
  }
}
