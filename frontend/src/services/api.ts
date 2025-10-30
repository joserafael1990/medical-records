// ============================================================================
// API SERVICES - Capa de servicios para comunicación con backend
// ============================================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, ERROR_MESSAGES, FEATURE_FLAGS, isProduction } from '../constants';
import { logger } from '../utils/logger';
import type { 
  Patient, 
  Consultation, 
  Appointment, 
  DashboardData, 
  CompletePatientData,
  PatientFormData,
  AppointmentFormData,
  AppointmentUpdateData,
  ApiError,
  Office,
  OfficeCreate,
  OfficeUpdate,
  AppointmentType
} from '../types';
import type { ConsultationFormData } from '../components/dialogs/ConsultationDialog';

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================

class ApiService {
  private api: AxiosInstance;

  // Helper method to map frontend gender values to backend format
  private mapGenderToBackend(gender: string): string | null {
    if (!gender || gender.trim() === '') {
      return null;
    }
    const genderMap: { [key: string]: string } = {
      'Masculino': 'Masculino',
      'Femenino': 'Femenino',
      'M': 'Masculino',
      'F': 'Femenino',
      'masculino': 'Masculino',
      'femenino': 'Femenino'
    };
    return genderMap[gender] || gender;
  }

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          logger.api.request(config.url || '', config.method?.toUpperCase() || '');
          logger.auth.info(`Token present: ${token ? 'YES' : 'NO'}`);
          if (token) {
            logger.auth.info(`Token preview: ${token.substring(0, 20)}...`);
          }
        }
        return config;
      },
      (error) => {
        logger.api.error('request', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          logger.api.response(response.config.url || '', response.status);
        }
        return response;
      },
      (error: AxiosError) => {
        
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          logger.api.error(error.config?.url || 'unknown', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
        
        // Handle specific error cases
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Handle unauthorized/forbidden - clear auth data
          logger.auth.sessionExpired();
          localStorage.removeItem('token');
          localStorage.removeItem('doctor_data');
          
          // Dispatch a custom event to notify the auth context
          // This avoids forced page reloads that cause blinking
          window.dispatchEvent(new CustomEvent('auth-expired'));
        }
        
        // Send to error monitoring in production
        if (FEATURE_FLAGS.ENABLE_ERROR_MONITORING && isProduction) {
          this.sendToErrorMonitoring(error);
        }
        
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError): ApiError {
    if (error.code === 'ECONNABORTED') {
      return {
        detail: ERROR_MESSAGES.TIMEOUT,
        status: 408
      };
    }

    if (error.code === 'ERR_NETWORK') {
      return {
        detail: ERROR_MESSAGES.NETWORK,
        status: 0
      };
    }

    if (error.response) {
      return {
        detail: this.getErrorMessage(error),
        status: error.response.status
      };
    }

    return {
      detail: ERROR_MESSAGES.GENERIC,
      status: 0
    };
  }

  private getErrorMessage(error: AxiosError): string {
    console.log('🔍 getErrorMessage called with:', {
      hasResponse: !!error.response,
      hasData: !!error.response?.data,
      data: error.response?.data,
      detail: error.response?.data?.detail
    });
    
    // Check for specific error messages from backend
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      if (data.detail) {
        if (typeof data.detail === 'string') {
          console.log('🔍 Returning string detail:', data.detail);
          return data.detail;
        } else if (Array.isArray(data.detail)) {
          // Handle Pydantic validation errors
          return data.detail.map((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0] || 'Campo';
            let message = err.msg || 'Error de validación';
            
            // Clean up common Pydantic error prefixes
            if (message.startsWith('Value error, ')) {
              message = message.replace('Value error, ', '');
            }
            
            return `${field}: ${message}`;
          }).join(', ');
        }
      }
    }

    // Default error messages by status code
    switch (error.response?.status) {
      case 400:
        // For 400 errors, try to get the specific message from backend first
        if (error.response?.data?.detail) {
          return error.response.data.detail;
        }
        return 'Solicitud inválida. Verifica los datos enviados.';
      case 401:
        return 'No autorizado. Por favor, inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'Recurso no encontrado.';
      case 408:
        return 'Tiempo de espera agotado. Intenta nuevamente.';
      case 422:
        return 'Datos inválidos. Verifica la información ingresada.';
      case 500:
        return 'Error interno del servidor. El equipo técnico ha sido notificado.';
      case 502:
      case 503:
      case 504:
        return 'Servicio no disponible temporalmente. Intenta más tarde.';
      default:
        return ERROR_MESSAGES.GENERIC;
    }
  }

  private sendToErrorMonitoring(error: AxiosError): void {
    // In a real application, you would send to Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      data: error.response?.data
    };

    // For now, just log it (in production you'd send to monitoring service)
    if (!isProduction) {
      console.error('🔴 Error Report for Monitoring:', errorReport);
    }
    
    // Example: Sentry.captureException(error, { extra: errorReport });
  }

  // ============================================================================
  // GENERIC HTTP METHODS
  // ============================================================================

  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<T>(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<{ data: T }> {
    const response = await this.api.post<T>(url, data);
    return response;
  }

  async put<T = any>(url: string, data?: any): Promise<{ data: T }> {
    const response = await this.api.put<T>(url, data);
    return response;
  }

  async delete<T = any>(url: string): Promise<{ data: T }> {
    const response = await this.api.delete<T>(url);
    return response;
  }

  async patch<T = any>(url: string, data?: any): Promise<{ data: T }> {
    const response = await this.api.patch<T>(url, data);
    return response;
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async checkHealth(): Promise<{ status: string; service: string }> {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.HEALTH);
    return response.data;
  }

  // ============================================================================
  // TEST & CONNECTIVITY SERVICES
  // ============================================================================

  async testConnection(): Promise<{ status: string; timestamp: string }> {
    try {
      // Test with a simple endpoint that doesn't require auth
      const response = await this.api.get('/docs');
      return { 
        status: 'connected', 
        timestamp: new Date().toISOString() 
      };
    } catch (error: any) {
      console.error('❌ Backend connectivity test failed:', error);
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async testPatientsEndpoint(): Promise<{ status: string; authRequired: boolean }> {
    console.log('🏥 Testing patients endpoint specifically...');
    try {
      // Test patients endpoint - should return 403 if not authenticated
      await this.api.get('/api/patients');
      return { status: 'accessible', authRequired: false };
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('🔒 Patients endpoint requires authentication (expected)');
        return { status: 'requires_auth', authRequired: true };
      } else {
        console.error('❌ Patients endpoint test failed:', error);
        throw new Error(`Patients endpoint test failed: ${error.message}`);
      }
    }
  }

  async testAuth(): Promise<{ status: string; user?: any }> {
    console.log('🔐 Testing authentication...');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { status: 'no_token' };
      }

      // Try to get current user info to validate token
      const response = await this.api.get('/api/doctors/me/profile');
      return { status: 'valid', user: response.data };
    } catch (error: any) {

      if (error.response?.status === 401) {
        return { status: 'expired' };
      } else if (error.response?.status === 403) {
        return { status: 'forbidden' };
      } else {
        return { status: 'error' };
      }
    }
  }

  async testBackendHealth(): Promise<{ status: string; error?: string }> {
    console.log('🏥 Testing backend health endpoint...');
    try {
      const response = await this.api.get('/health');
      return { status: 'healthy' };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.response?.data?.detail || error.message
      };
    }
  }

  async testTokenValidity(): Promise<{ status: string; error?: string; user?: any }> {
    console.log('🔐 Testing token validity...');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { status: 'no_token' };
      }

      console.log('🔐 Token format check:', {
        hasThreeParts: token.split('.').length === 3,
        parts: token.split('.').map((part, i) => `Part ${i + 1}: ${part.length} chars`)
      });

      // Try to get current user info to validate token
      const response = await this.api.get('/api/doctors/me/profile');
      return { status: 'valid', user: response.data };
    } catch (error: any) {

      if (error.response?.status === 401) {
        return { status: 'expired_or_invalid' };
      } else if (error.response?.status === 403) {
        return { status: 'forbidden' };
      } else {
        return { status: 'error', error: error.message };
      }
    }
  }

  async testCreateMinimalPatient(): Promise<{ status: string; error?: string; details?: any }> {
    console.log('🧪 Testing patient creation with minimal valid data...');

    try {
      // Create minimal valid patient data
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

      console.log('🧪 Minimal patient data:', minimalPatientData);
      const token = localStorage.getItem('token');
      console.log('🧪 Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.substring(0, 20)}...`
      });
      console.log('🧪 Full token info:', {
        exists: !!token,
        length: token?.length || 0,
        isValidFormat: token ? token.split('.').length === 3 : false
      });

      const response = await this.api.post('/api/patients', minimalPatientData);
      return { status: 'success', error: undefined, details: response.data };
    } catch (error: any) {
      console.error('❌ Minimal patient creation failed - Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });

      // Enhanced error analysis
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
          details: error.response.data
        };
      } else if (error.response.status >= 400) {
        return {
          status: 'validation_error',
          error: `Error de validación (${error.response.status})`,
          details: error.response.data
        };
      } else {
        return {
          status: 'failed',
          error: error.response?.data?.detail || error.message || 'Error desconocido',
          details: error.response?.data
        };
      }
    }
  }

  async testGetPatients(): Promise<{ status: string; error?: string; count?: number }> {
    console.log('📋 Testing GET patients endpoint...');
    try {
      const response = await this.api.get('/api/patients');
      return {
        status: 'success',
        count: Array.isArray(response.data) ? response.data.length : 0
      };
    } catch (error: any) {
      console.error('❌ GET patients failed:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message
      });
      return {
        status: 'failed',
        error: error.response?.data?.detail || error.message
      };
    }
  }

  async testSimplePatientCreation(): Promise<{ status: string; error?: string; response?: any }> {
    console.log('🧪 Testing simple patient creation endpoint...');
    try {
      const response = await this.api.post('/api/test-patient-creation', {});
      return { status: 'success', response: response.data };
    } catch (error: any) {
      console.error('❌ Simple patient creation test failed:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
        data: error.response?.data
      });
      return {
        status: 'failed',
        error: error.response?.data?.detail || error.message,
        response: error.response?.data
      };
    }
  }

  async testRealPatientCreation(): Promise<{ status: string; error?: string; response?: any }> {
    console.log('🏥 Testing REAL patient creation endpoint with minimal data...');
    try {
      // Test with the actual patient creation endpoint
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

      console.log('🏥 Real patient data:', testPatientData);

      const token = localStorage.getItem('token');
      console.log('🏥 Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.substring(0, 20)}...`
      });
      console.log('🏥 Full token info:', {
        exists: !!token,
        length: token?.length || 0,
        isValidFormat: token ? token.split('.').length === 3 : false
      });

      const response = await this.api.post('/api/patients', testPatientData);
      return { status: 'success', response: response.data };
    } catch (error: any) {
      console.error('❌ REAL patient creation failed - Full analysis:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });

      // Enhanced error analysis
      if (!error.response) {
        return {
          status: 'network_error',
          error: 'Error de red - no se recibió respuesta del servidor',
          response: { originalError: error.message }
        };
      } else if (error.response.status === 500) {
        console.error('🚨 SERVER ERROR 500 - Full response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          config: error.config
        });

        // Try to get more specific error information
        let errorDetail = 'Error interno del servidor (500)';
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorDetail = error.response.data;
          } else if (error.response.data.detail) {
            errorDetail = error.response.data.detail;
          } else if (error.response.data.message) {
            errorDetail = error.response.data.message;
          } else {
            errorDetail = `Error 500: ${JSON.stringify(error.response.data)}`;
          }
        }

        return {
          status: 'server_error_500',
          error: errorDetail,
          response: error.response.data
        };
      } else if (error.response.status === 422) {
        return {
          status: 'validation_error',
          error: `Error de validación (${error.response.status})`,
          response: error.response.data
        };
      } else if (error.response.status === 401) {
        return {
          status: 'authentication_error',
          error: `Error de autenticación (${error.response.status})`,
          response: error.response.data
        };
      } else if (error.response.status === 403) {
        return {
          status: 'authorization_error',
          error: `Error de autorización (${error.response.status})`,
          response: error.response.data
        };
      } else {
        return {
          status: 'failed',
          error: `Error ${error.response?.status}: ${error.response?.data?.detail || error.message}`,
          response: error.response?.data
        };
      }
    }
  }

  async testPostEmpty(): Promise<{ status: string; error?: string; details?: any }> {
    console.log('🆕 Testing POST patients with empty data...');
    try {
      const response = await this.api.post('/api/patients', {});
      return { status: 'success', details: response.data };
    } catch (error: any) {
      console.error('❌ POST empty failed - Detailed analysis:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });
      return {
        status: 'failed',
        error: error.response?.data?.detail || error.message,
        details: error.response?.data
      };
    }
  }

  // ============================================================================
  // PATIENT SERVICES
  // ============================================================================

  async getPatients(search?: string): Promise<Patient[]> {
    const params = search ? { search } : {};
    const response = await this.api.get<Patient[]>(API_CONFIG.ENDPOINTS.PATIENTS, { params });
    
    
    return Array.isArray(response.data) ? response.data : [];
  }

  async getPatient(id: string): Promise<Patient> {
    const response = await this.api.get<Patient>(`${API_CONFIG.ENDPOINTS.PATIENTS}/${id}`);
    return response.data;
  }

  async createPatient(patientData: PatientFormData): Promise<Patient> {
    
    // Validate required fields
    if (!patientData.first_name || !patientData.paternal_surname) {
      throw new Error('El nombre y apellido paterno son requeridos');
    }
    
    // Validate CURP format if provided
    if (patientData.curp && patientData.curp.length !== 18) {
      throw new Error('El CURP debe tener exactamente 18 caracteres');
    }
    
    // Validate RFC format if provided
    if (patientData.rfc && patientData.rfc.length < 10) {
      throw new Error('El RFC debe tener al menos 10 caracteres');
    }
    
    // Validate email format if provided
    if (patientData.email && patientData.email !== '' && !patientData.email.includes('@')) {
      throw new Error('El email debe tener un formato válido');
    }
    
    // Clean the data before sending to ensure proper format
    const cleanedData: any = {
      // Required fields - don't convert to null
      person_type: 'patient',
      first_name: patientData.first_name || '',
      paternal_surname: patientData.paternal_surname || '',
      gender: this.mapGenderToBackend(patientData.gender || ''),
      
      // Optional fields - can be null
      maternal_surname: patientData.maternal_surname || '',
      email: patientData.email || '',
      primary_phone: patientData.primary_phone || '',
      curp: patientData.curp || '',
      rfc: patientData.rfc || '',
      birth_city: patientData.birth_city || '',
      birth_state_id: patientData.birth_state_id ? parseInt(patientData.birth_state_id) : null,
      birth_country_id: patientData.birth_country_id ? parseInt(patientData.birth_country_id) : null,
      civil_status: patientData.civil_status || '',
      
      // Address fields
      home_address: patientData.home_address || '',
      address_city: patientData.address_city || patientData.city || '',
      address_state_id: patientData.address_state_id ? parseInt(patientData.address_state_id) : null,
      address_country_id: patientData.address_country_id ? parseInt(patientData.address_country_id) : null,
      address_postal_code: patientData.address_postal_code || '',
      
      // Default values
      
      // Medical fields
      insurance_provider: patientData.insurance_provider || '',
      insurance_number: patientData.insurance_number || '',
      
      // Emergency contact fields
      emergency_contact_name: patientData.emergency_contact_name || '',
      emergency_contact_phone: patientData.emergency_contact_phone || '',
      emergency_contact_relationship: patientData.emergency_contact_relationship || ''
    };
    
    // Only include birth_date if it has a valid value
    const birthDate = patientData.birth_date || patientData.date_of_birth;
    if (birthDate) {
      cleanedData.birth_date = birthDate;
    }
    
    try {
      const response = await this.api.post<Patient>(API_CONFIG.ENDPOINTS.PATIENTS, cleanedData);
    return response.data;
    } catch (error: any) {
      // Enhanced error handling for patient creation
      if (error.response?.status === 409) {
        // Conflict - patient already exists
        const detail = error.response.data?.detail || 'El paciente ya existe en el sistema';
        throw new Error(detail);
      } else if (error.response?.status === 422) {
        // Validation errors
        const detail = error.response.data?.detail;
        console.log('🚨 422 Validation Error Details:', detail);
        console.log('🚨 Full error response:', error.response.data);
        console.log('🚨 Error response status:', error.response.status);
        console.log('🚨 Error response headers:', error.response.headers);
        if (Array.isArray(detail)) {
          // Field validation errors
          const fieldErrors = detail.map((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0];
            return `${field}: ${err.msg}`;
          }).join(', ');
          throw new Error(`Errores de validación: ${fieldErrors}`);
        } else {
          throw new Error(detail || 'Error de validación en los datos del paciente');
        }
      } else if (error.response?.status === 400) {
        // Bad request
        throw new Error(error.response.data?.detail || 'Datos del paciente inválidos');
      } else if (error.response?.status >= 500) {
        // Server errors
        throw new Error('Error interno del servidor. Por favor, contacte al administrador del sistema');
      } else if (!error.response) {
        // Network error
        throw new Error('Error de conexión. Verifique su conexión a internet e intente nuevamente');
      } else {
        // Other errors - including 422
        console.log('🚨 Other Error Details:', error.response.data);
        console.log('🚨 Error response status:', error.response.status);
        console.log('🚨 Full error response:', error.response.data);
        if (error.response.status === 422) {
          const detail = error.response.data?.detail;
          console.log('🚨 422 Validation Error Details:', detail);
          if (Array.isArray(detail)) {
            const fieldErrors = detail.map((err: any) => {
              const field = err.loc?.[1] || err.loc?.[0];
              return `${field}: ${err.msg}`;
            }).join(', ');
            throw new Error(`Errores de validación: ${fieldErrors}`);
          }
        }
        throw new Error(error.response.data?.detail || 'Error inesperado al crear el paciente');
      }
    }
  }

  async updatePatient(id: string, patientData: Partial<PatientFormData>): Promise<Patient> {
    
    // Clean the data before sending to ensure proper format
    const cleanedData: any = {
      // Required fields with proper mapping
      first_name: patientData.first_name || '',
      paternal_surname: patientData.paternal_surname || '',
      gender: this.mapGenderToBackend(patientData.gender || ''),
      
      // Optional fields - can be null
      maternal_surname: patientData.maternal_surname || '',
      email: patientData.email || '',
      primary_phone: patientData.primary_phone || '',
      curp: patientData.curp || '',
      rfc: patientData.rfc || '',
      birth_city: patientData.birth_city || '',
      birth_state_id: patientData.birth_state_id ? parseInt(patientData.birth_state_id) : null,
      birth_country_id: patientData.birth_country_id ? parseInt(patientData.birth_country_id) : null,
      civil_status: patientData.civil_status || '',
      
      // Address fields
      home_address: patientData.home_address || '',
      address_city: patientData.address_city || patientData.city || '',
      address_state_id: patientData.address_state_id ? parseInt(patientData.address_state_id) : null,
      address_country_id: patientData.address_country_id ? parseInt(patientData.address_country_id) : null,
      address_postal_code: patientData.address_postal_code || '',
      
      // Default values
      
      // Medical fields
      insurance_provider: patientData.insurance_provider || '',
      insurance_number: patientData.insurance_number || '',
      
      // Emergency contact fields
      emergency_contact_name: patientData.emergency_contact_name || '',
      emergency_contact_phone: patientData.emergency_contact_phone || '',
      emergency_contact_relationship: patientData.emergency_contact_relationship || '',
    };
    
    // Only include birth_date if it has a valid value
    const birthDate = patientData.birth_date || patientData.date_of_birth;
    if (birthDate) {
      cleanedData.birth_date = birthDate;
    }
    
    const response = await this.api.put<Patient>(`${API_CONFIG.ENDPOINTS.PATIENTS}/${id}`, cleanedData);
    return response.data;
  }

  async deletePatient(id: string): Promise<void> {
    await this.api.delete(`${API_CONFIG.ENDPOINTS.PATIENTS}/${id}`);
  }

  async getCompletePatientInfo(id: string): Promise<CompletePatientData> {
    const response = await this.api.get<CompletePatientData>(`${API_CONFIG.ENDPOINTS.PATIENTS}/${id}/complete`);
    return response.data;
  }

  // ============================================================================
  // CONSULTATION SERVICES
  // ============================================================================

  async getConsultations(filters?: {
    patient_search?: string;
    date_from?: string;
    date_to?: string;
    doctor_name?: string;
  }): Promise<Consultation[]> {
    const response = await this.api.get<Consultation[]>(API_CONFIG.ENDPOINTS.CONSULTATIONS, { 
      params: filters 
    });
    return response.data;
  }

  async getPatientConsultations(patientId: string): Promise<Consultation[]> {
    const response = await this.api.get<Consultation[]>(`${API_CONFIG.ENDPOINTS.PATIENTS}/${patientId}/medical-history`);
    return response.data;
  }

  async getConsultation(id: string): Promise<Consultation> {
    const response = await this.api.get<Consultation>(`/api/medical-history/${id}`);
    return response.data;
  }

  async createConsultation(patientId: string, consultationData: ConsultationFormData): Promise<Consultation> {
    // Extract only the fields needed by the backend, exclude doctor-related fields
    const { doctor_name, doctor_professional_license, doctor_specialty, ...cleanData } = consultationData;
    
    const payload = {
      ...cleanData,
      patient_id: patientId, // Ensure patient_id is included
      // Use the date from formData directly (already in CDMX format)
      // Note: doctor fields and created_by are now assigned by the backend
    };
    
    
    const response = await this.api.post<Consultation>(
      API_CONFIG.ENDPOINTS.CONSULTATIONS, 
      payload
    );
    return response.data;
  }

  async updateConsultation(id: string, consultationData: Partial<ConsultationFormData>): Promise<Consultation> {
    const payload = {
      ...consultationData,
      updated_at: new Date().toISOString()
    };
    
    const response = await this.api.put<Consultation>(`/api/consultations/${id}`, payload);
    return response.data;
  }

  async deleteConsultation(id: string): Promise<void> {
    await this.api.delete(`/api/medical-history/${id}`);
  }

  // ============================================================================
  // APPOINTMENT SERVICES
  // ============================================================================

  async getAppointments(filters?: {
    date?: string;
    status?: string;
    available_for_consultation?: boolean;
  }): Promise<Appointment[]> {
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.APPOINTMENTS, { 
      params: filters 
    });
    return response.data;
  }

  async getAppointment(appointmentId: number): Promise<Appointment> {
    const response = await this.api.get<Appointment>(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${appointmentId}`);
    return response.data;
  }

  async getPatientAppointments(patientId: string, status?: string): Promise<Appointment[]> {
    const params = status ? { status } : {};
    const response = await this.api.get<Appointment[]>(
      `${API_CONFIG.ENDPOINTS.PATIENTS}/${patientId}/appointments`, 
      { params }
    );
    return response.data;
  }

  async getAvailableSlots(targetDate: string): Promise<any[]> {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.DAILY_AGENDA, {
      params: { target_date: targetDate, doctor_id: 42 }
    });
    return response.data;
  }

  async getAvailableTimesForBooking(date: string): Promise<any> {
    const response = await this.api.get('/api/schedule/available-times', {
      params: { date }
    });
    return response.data;
  }

  // Agenda-specific methods
  async getDailyAgenda(targetDate?: string): Promise<Appointment[]> {
    // If no target date provided, use today's date
    const dateToUse = targetDate || new Date().toISOString().split('T')[0];
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.DAILY_AGENDA, {
      params: { date: dateToUse }
    });
    
    // Transform backend appointment_date to frontend date_time for compatibility
    const transformedData = response.data.map(appointment => ({
      ...appointment,
      date_time: appointment.appointment_date || appointment.date_time, // Map appointment_date to date_time
      patient_name: appointment.patient ? 
        `${appointment.patient.first_name} ${appointment.patient.paternal_surname}` : 
        appointment.patient_name
    }));
    
    return transformedData;
  }

  async getWeeklyAgenda(startDate?: string, endDate?: string): Promise<Appointment[]> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.WEEKLY_AGENDA, {
      params
    });
    
    // Transform backend appointment_date to frontend date_time for compatibility
    const transformedData = response.data.map(appointment => ({
      ...appointment,
      date_time: appointment.appointment_date || appointment.date_time, // Map appointment_date to date_time
      patient_name: appointment.patient ? 
        `${appointment.patient.first_name} ${appointment.patient.paternal_surname}` : 
        appointment.patient_name
    }));
    
    return transformedData;
  }

  async getMonthlyAgenda(startDate?: string, endDate?: string): Promise<Appointment[]> {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.DAILY_AGENDA, {
      params
    });
    
    // Transform backend appointment_date to frontend date_time for compatibility
    const transformedData = response.data.map(appointment => ({
      ...appointment,
      date_time: appointment.appointment_date || appointment.date_time, // Map appointment_date to date_time
      patient_name: appointment.patient ? 
        `${appointment.patient.first_name} ${appointment.patient.paternal_surname}` : 
        appointment.patient_name
    }));
    
    return transformedData;
  }

  async createAgendaAppointment(appointmentData: any): Promise<any> {
    const response = await this.api.post('/api/appointments', appointmentData);
    return response.data;
  }

  async updateAgendaAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
    return response.data;
  }

  async deleteAgendaAppointment(id: string): Promise<void> {
    await this.api.delete(`/api/appointments/${id}`);
  }

  async createAppointment(patientId: string, appointmentData: AppointmentFormData): Promise<Appointment> {
    const response = await this.api.post<Appointment>(
      `${API_CONFIG.ENDPOINTS.PATIENTS}/${patientId}/appointments`, 
      appointmentData
    );
    return response.data;
  }

  async updateAppointment(id: string, appointmentData: AppointmentUpdateData): Promise<Appointment> {
    const response = await this.api.put<Appointment>(`/api/appointments/${id}`, appointmentData);
    return response.data;
  }

  async getAppointment(id: string): Promise<Appointment> {
    const response = await this.api.get<Appointment>(`/api/appointments/${id}`);
    return response.data as unknown as Appointment;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    const response = await this.api.put<Appointment>(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}`, { status });
    return response.data;
  }

  async cancelAppointment(id: string): Promise<void> {
    await this.api.delete(`${API_CONFIG.ENDPOINTS.APPOINTMENTS}/${id}`);
  }

  async bulkUpdateAppointments(updates: any[]): Promise<any> {
    const response = await this.api.post('/api/appointments/bulk-update', { updates });
    return response.data;
  }

  // ============================================================================
  // DOCTOR PROFILE SERVICES
  // ============================================================================

  async getDoctorProfile(): Promise<any> {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.DOCTOR_PROFILE);
    return response.data;
  }

  async createDoctorProfile(profileData: any): Promise<any> {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.DOCTOR_PROFILE, profileData);
    return response.data;
  }

  async updateDoctorProfile(profileData: any): Promise<any> {
    const response = await this.api.put(API_CONFIG.ENDPOINTS.DOCTOR_PROFILE, profileData);
    return response.data;
  }

  // ============================================================================
  // CATALOG SERVICES
  // ============================================================================

  async getSpecialties(): Promise<any[]> {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.SPECIALTIES);
    return response.data;
  }

  async getCountries(): Promise<Array<{id: number, name: string}>> {
    const response = await this.api.get('/api/catalogs/countries');
    return response.data;
  }

  async getStates(countryId?: number): Promise<Array<{id: number, name: string}>> {
    const url = countryId ? `/api/catalogs/states?country_id=${countryId}` : '/api/catalogs/states';
    const response = await this.api.get(url);
    return response.data;
  }

  async getEmergencyRelationships(): Promise<Array<{code: string, name: string}>> {
    const response = await this.api.get('/api/catalogs/emergency-relationships');
    return response.data;
  }

  async getTimezones(): Promise<Array<{value: string, label: string}>> {
    const response = await this.api.get('/api/catalogs/timezones');
    return response.data;
  }

  // ============================================================================
  // AUTHENTICATION SERVICES
  // ============================================================================

  async login(email: string, password: string): Promise<any> {
    const response = await this.api.post('/api/auth/login', { email, password });
    return response.data;
  }

  async register(userData: any): Promise<any> {
    const response = await this.api.post('/api/auth/register', userData);
    return response.data;
  }

  async requestPasswordReset(email: string): Promise<any> {
    const response = await this.api.post('/api/auth/password-reset/request', { email });
    return response.data;
  }

  async confirmPasswordReset(token: string, newPassword: string, confirmPassword: string): Promise<any> {
    const response = await this.api.post('/api/auth/password-reset/confirm', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  }

  // ============================================================================
  // DASHBOARD SERVICES
  // ============================================================================

  async getDashboardData(): Promise<DashboardData> {
    const response = await this.api.get<DashboardData>(API_CONFIG.ENDPOINTS.DASHBOARD);
    return response.data;
  }

  // ============================================================================
  // RETRY MECHANISM
  // ============================================================================

  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      }
    }
    
    throw lastError;
  }

  // ============================================================================
  // CLINICAL STUDIES SERVICES - Estudios Clínicos
  // ============================================================================

  async createClinicalStudy(studyData: any): Promise<any> {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.CLINICAL_STUDIES, studyData);
    return response.data;
  }

  async getClinicalStudiesByConsultation(consultationId: string): Promise<any[]> {
    const response = await this.api.get(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/consultation/${consultationId}`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async getClinicalStudiesByPatient(patientId: string): Promise<any[]> {
    const response = await this.api.get(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async updateClinicalStudy(studyId: string, updateData: any): Promise<any> {
    const response = await this.api.put(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}`, updateData);
    return response.data;
  }

  async uploadClinicalStudyFile(studyId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.put(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async deleteClinicalStudy(studyId: string): Promise<void> {
    await this.api.delete(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}`);
  }

  // ============================================================================
  // WHATSAPP API - Notificaciones WhatsApp
  // ============================================================================

  async sendWhatsAppAppointmentReminder(appointmentId: number): Promise<any> {
    const response = await this.api.post(`/api/whatsapp/appointment-reminder/${appointmentId}`);
    return response.data;
  }

  async sendWhatsAppStudyResults(studyId: number): Promise<any> {
    const response = await this.api.post(`/api/whatsapp/study-results/${studyId}`);
    return response.data;
  }

  // ============================================================================
  // OFFICE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Get all offices for the current doctor
   */
  async getOffices(doctorId?: number): Promise<Office[]> {
    const url = doctorId ? `/api/offices?doctor_id=${doctorId}` : '/api/offices';
    const response = await this.api.get(url);
    return response.data;
  }

  /**
   * Get a specific office by ID
   */
  async getOffice(officeId: number): Promise<Office> {
    const response = await this.api.get(`/api/offices/${officeId}`);
    return response.data;
  }

  /**
   * Create a new office
   */
  async createOffice(office: OfficeCreate): Promise<Office> {
    const response = await this.api.post('/api/offices', office);
    return response.data;
  }

  /**
   * Update an office
   */
  async updateOffice(id: number, office: OfficeUpdate): Promise<Office> {
    const response = await this.api.put(`/api/offices/${id}`, office);
    return response.data;
  }

  /**
   * Delete an office
   */
  async deleteOffice(id: number): Promise<void> {
    await this.api.delete(`/api/offices/${id}`);
  }

  // ============================================================================
  // APPOINTMENT TYPES METHODS
  // ============================================================================

  /**
   * Get all appointment types
   */
  async getAppointmentTypes(): Promise<AppointmentType[]> {
    const response = await this.api.get('/api/appointment-types');
    return response.data;
  }

}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const apiService = new ApiService();

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const {
  checkHealth,
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getCompletePatientInfo,
  getConsultations,
  getPatientConsultations,
  getConsultation,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  createClinicalStudy,
  getClinicalStudiesByConsultation,
  getClinicalStudiesByPatient,
  updateClinicalStudy,
  deleteClinicalStudy,
  getAppointments,
  getPatientAppointments,
  getDailyAgenda,
  getWeeklyAgenda,
  getMonthlyAgenda,
  getAvailableSlots,
  getAvailableTimesForBooking,
  createAppointment,
  createAgendaAppointment,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  bulkUpdateAppointments,
  getDoctorProfile,
  createDoctorProfile,
  updateDoctorProfile,
  getSpecialties,
  getCountries,
  getStates,
  getEmergencyRelationships,
  getTimezones,
  login,
  register,
  getDashboardData,
  withRetry
} = apiService;
