// ============================================================================
// API SERVICES - Capa de servicios para comunicación con backend
// ============================================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG, ERROR_MESSAGES, FEATURE_FLAGS, isProduction } from '../constants';
import type { 
  Patient, 
  Consultation, 
  Appointment, 
  DashboardData, 
  CompletePatientData,
  PatientFormData,
  ConsultationFormData,
  AppointmentFormData,
  MedicalOrder,
  MedicalOrderFormData,
  OrderStatus,
  ApiError
} from '../types';

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================

class ApiService {
  private api: AxiosInstance;

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
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
          console.log(`🔑 Token present: ${token ? 'YES' : 'NO'}`);
          if (token) {
            console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);
          }
        }
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error: AxiosError) => {
        if (FEATURE_FLAGS.ENABLE_DEBUG_LOGS) {
          console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
          console.error('❌ Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers
          });
        }
        
        // Handle specific error cases
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Handle unauthorized/forbidden - clear auth data
          console.log('🔄 Session expired or unauthorized, clearing authentication...');
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
    // Check for specific error messages from backend
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      if (data.detail) {
        if (typeof data.detail === 'string') {
          return data.detail;
        } else if (Array.isArray(data.detail)) {
          // Handle Pydantic validation errors
          return data.detail.map((err: any) => {
            const field = err.loc?.[1] || err.loc?.[0] || 'Campo';
            return `${field}: ${err.msg}`;
          }).join(', ');
        }
      }
    }

    // Default error messages by status code
    switch (error.response?.status) {
      case 400:
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

  async get<T = any>(url: string, params?: any): Promise<{ data: T }> {
    const response = await this.api.get<T>(url, { params });
    return response;
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
    const response = await this.api.post<Patient>(API_CONFIG.ENDPOINTS.PATIENTS, patientData);
    return response.data;
  }

  async updatePatient(id: string, patientData: Partial<PatientFormData>): Promise<Patient> {
    const response = await this.api.put<Patient>(`${API_CONFIG.ENDPOINTS.PATIENTS}/${id}`, patientData);
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
    
    // Create Mexico City timezone date with year correction
    const getCurrentMexicoCityDateTime = () => {
      const now = new Date();
      // Get Mexico City time (UTC-6 standard, UTC-5 daylight saving)
      const mexicoCityTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
      
      // Temporary fix: If system reports 2025, correct it to 2024
      if (mexicoCityTime.getFullYear() === 2025) {
        mexicoCityTime.setFullYear(2024);
      }
      
      return mexicoCityTime.toISOString();
    };
    
    const payload = {
      ...cleanData,
      patient_id: patientId, // Ensure patient_id is included
      date: getCurrentMexicoCityDateTime()
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
    
    const response = await this.api.put<Consultation>(`/api/medical-history/${id}`, payload);
    return response.data;
  }

  async deleteConsultation(id: string): Promise<void> {
    await this.api.delete(`/api/medical-history/${id}`);
  }

  // ============================================================================
  // MEDICAL ORDERS API - Órdenes Médicas
  // ============================================================================

  async createMedicalOrder(orderData: MedicalOrderFormData): Promise<MedicalOrder> {
    const response = await this.api.post<MedicalOrder>('/api/medical-orders', orderData);
    return response.data;
  }

  async getMedicalOrdersByConsultation(consultationId: string): Promise<MedicalOrder[]> {
    const response = await this.api.get<MedicalOrder[]>(`/api/medical-orders/consultation/${consultationId}`);
    return response.data;
  }

  async getMedicalOrdersByPatient(patientId: string): Promise<MedicalOrder[]> {
    const response = await this.api.get<MedicalOrder[]>(`/api/medical-orders/patient/${patientId}`);
    return response.data;
  }

  async updateMedicalOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await this.api.patch(`/api/medical-orders/${orderId}/status`, { status });
  }

  // ============================================================================
  // APPOINTMENT SERVICES
  // ============================================================================

  async getAppointments(filters?: {
    date?: string;
    status?: string;
  }): Promise<Appointment[]> {
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.APPOINTMENTS, { 
      params: filters 
    });
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

  async getAvailableSlots(targetDate: string, durationMinutes = 30): Promise<any[]> {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.AGENDA.AVAILABLE_SLOTS, {
      params: { target_date: targetDate, duration_minutes: durationMinutes }
    });
    return response.data;
  }

  // Agenda-specific methods
  async getDailyAgenda(targetDate?: string): Promise<Appointment[]> {
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.AGENDA.DAILY, {
      params: targetDate ? { target_date: targetDate } : {}
    });
    return response.data;
  }

  async getWeeklyAgenda(startDate?: string): Promise<Appointment[]> {
    const response = await this.api.get<Appointment[]>(API_CONFIG.ENDPOINTS.AGENDA.WEEKLY, {
      params: startDate ? { start_date: startDate } : {}
    });
    return response.data;
  }

  async createAgendaAppointment(appointmentData: any): Promise<any> {
    const response = await this.api.post('/api/agenda/appointments', appointmentData);
    return response.data;
  }

  async updateAgendaAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    const response = await this.api.put<Appointment>(`/api/agenda/appointments/${id}`, appointmentData);
    return response.data;
  }

  async deleteAgendaAppointment(id: string): Promise<void> {
    await this.api.delete(`/api/agenda/appointments/${id}`);
  }

  async createAppointment(patientId: string, appointmentData: AppointmentFormData): Promise<Appointment> {
    const response = await this.api.post<Appointment>(
      `${API_CONFIG.ENDPOINTS.PATIENTS}/${patientId}/appointments`, 
      appointmentData
    );
    return response.data;
  }



  async updateAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<Appointment> {
    const response = await this.api.put<Appointment>(`/api/agenda/appointments/${id}`, appointmentData);
    return response.data;
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

  async getStates(): Promise<Array<{id: number, name: string}>> {
    const response = await this.api.get('/api/catalogs/states');
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

  async withRetry<T>(operation: () => Promise<T>, maxRetries = API_CONFIG.RETRY_ATTEMPTS): Promise<T> {
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

  async deleteClinicalStudy(studyId: string): Promise<void> {
    await this.api.delete(`${API_CONFIG.ENDPOINTS.CLINICAL_STUDIES}/${studyId}`);
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
  createMedicalOrder,
  getMedicalOrdersByConsultation,
  getMedicalOrdersByPatient,
  updateMedicalOrderStatus,
  createClinicalStudy,
  getClinicalStudiesByConsultation,
  getClinicalStudiesByPatient,
  updateClinicalStudy,
  deleteClinicalStudy,
  getAppointments,
  getPatientAppointments,
  getDailyAgenda,
  getWeeklyAgenda,
  getAvailableSlots,
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
  getStates,
  login,
  register,
  getDashboardData,
  withRetry
} = apiService;
