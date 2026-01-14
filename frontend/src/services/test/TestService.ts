import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export class TestService extends ApiBase {
    async testCreateMinimalPatient(): Promise<{ status: string; error?: string; details?: any }> {
        try {
            const minimalPatientData = {
                first_name: 'Test',
                paternal_surname: 'Patient',
                maternal_surname: null,
                email: null,
                date_of_birth: '1990-01-01',
                birth_date: '1990-01-01',
                gender: 'M',
                civil_status: null,
                primary_phone: '5551234567',
                phone: '5551234567',
                curp: null,
                rfc: null,
                person_type: 'patient'
            };

            const response = await this.api.post('/api/patients', minimalPatientData);
            return { status: 'success', error: undefined, details: response.data };
        } catch (error: any) {
            if (!error.response) {
                return {
                    status: 'network_error',
                    error: 'Error de red - no se recibió respuesta del servidor',
                    details: { originalError: error.message }
                };
            } else if (error.response.status >= 500) {
                return {
                    status: 'server_error',
                    error: `Error interno del servidor (${error.response.status})`,
                    details: error.response.data?.detail
                };
            } else if (error.response.status >= 400) {
                return {
                    status: 'validation_error',
                    error: `Error de validación (${error.response.status})`,
                    details: error.response.data?.detail
                };
            } else {
                return {
                    status: 'failed',
                    error: error.response.data?.detail || error.message || 'Error desconocido',
                    details: error.response.data?.detail
                };
            }
        }
    }

    async testGetPatients(): Promise<{ status: string; error?: string; count?: number }> {
        try {
            const response = await this.api.get('/api/patients');
            return {
                status: 'success',
                count: Array.isArray(response.data) ? response.data.length : 0
            };
        } catch (error: any) {
            return {
                status: 'failed',
                error: error.response?.data?.detail || error.message
            };
        }
    }

    async testSimplePatientCreation(): Promise<{ status: string; error?: string; response?: any }> {
        try {
            const response = await this.api.post('/api/test-patient-creation', {});
            return { status: 'success', response: response.data };
        } catch (error: any) {
            return {
                status: 'failed',
                error: error.response?.data?.detail || error.message,
                response: error.response?.data?.detail
            };
        }
    }

    async testRealPatientCreation(): Promise<{ status: string; error?: string; response?: any }> {
        try {
            const testPatientData = {
                first_name: 'TestReal',
                paternal_surname: 'Patient',
                maternal_surname: null,
                email: null,
                date_of_birth: '1990-01-01',
                birth_date: '1990-01-01',
                gender: 'M',
                civil_status: null,
                primary_phone: '5551234567',
                phone: '5551234567',
                curp: null,
                rfc: null,
                person_type: 'patient'
            };

            const response = await this.api.post('/api/patients', testPatientData);
            return { status: 'success', response: response.data };
        } catch (error: any) {
            return {
                status: 'failed',
                error: error.response?.data?.detail || error.message,
                response: error.response?.data?.detail
            };
        }
    }

    async testPostEmpty(): Promise<{ status: string; error?: string; details?: any }> {
        try {
            const response = await this.api.post('/api/patients', {});
            return { status: 'success', details: response.data };
        } catch (error: any) {
            return {
                status: 'failed',
                error: error.response?.data?.detail || error.message,
                details: error.response?.data?.detail
            };
        }
    }
}
