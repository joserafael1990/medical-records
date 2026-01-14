import { ApiBase } from '../base/ApiBase';
import { DashboardData } from '../../types';
import { logger } from '../../utils/logger';

export class DashboardService extends ApiBase {
    async getDashboardData(): Promise<DashboardData> {
        try {
            const response = await this.api.get<DashboardData>('/api/dashboard');
            return response.data;
        } catch (error: any) {
            logger.error('Failed to fetch dashboard data', error, 'api');
            throw error;
        }
    }
}
