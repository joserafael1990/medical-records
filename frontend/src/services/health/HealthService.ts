import { ApiBase } from '../base/ApiBase';
import { API_CONFIG } from '../../constants';
import { logger } from '../../utils/logger';

export class HealthService extends ApiBase {
    async checkHealth(): Promise<{ status: string; service: string }> {
        try {
            const response = await this.api.get<{ status: string; service: string }>(API_CONFIG.ENDPOINTS.HEALTH);
            return response.data;
        } catch (error: any) {
            logger.error('Health check failed', error, 'api');
            throw error;
        }
    }

    async testConnection(): Promise<{ status: string; timestamp: string }> {
        try {
            // Test with a simple endpoint that doesn't require auth
            await this.api.get('/docs');
            return {
                status: 'connected',
                timestamp: new Date().toISOString()
            };
        } catch (error: any) {
            logger.error('Backend connectivity test failed', error, 'api');
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }

    async testBackendHealth(): Promise<{ status: string; error?: string }> {
        logger.debug('Testing backend health endpoint', undefined, 'api');
        try {
            await this.api.get('/health');
            return { status: 'healthy' };
        } catch (error: any) {
            return {
                status: 'unhealthy',
                error: error.detail || error.message
            };
        }
    }

    async testPatientsEndpoint(): Promise<{ status: string; authRequired: boolean }> {
        logger.debug('Testing patients endpoint specifically', undefined, 'api');
        try {
            // Test patients endpoint - should return 403 if not authenticated
            await this.api.get('/api/patients');
            return { status: 'accessible', authRequired: false };
        } catch (error: any) {
            if (error.response?.status === 403 || error.response?.status === 401) {
                logger.debug('Patients endpoint requires authentication (expected)', undefined, 'api');
                return { status: 'requires_auth', authRequired: true };
            } else {
                logger.error('Patients endpoint test failed', error, 'api');
                throw new Error(`Patients endpoint test failed: ${error.message}`);
            }
        }
    }
}
