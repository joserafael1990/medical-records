import { ApiBase, ApiResponse } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  curp: string;
  gender: string;
  birth_date: string;
  phone: string;
  title: string;
  specialty: string;
  university: string;
  graduation_year: string;
  professional_license: string;
  office_address: string;
  office_country: string;
  office_state_id: string;
  office_city: string;
  office_phone: string;
  appointment_duration: string;
  scheduleData: any;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    person_type: string;
    title: string;
    first_name: string;
    paternal_surname: string;
    maternal_surname: string;
  };
}

export class AuthService extends ApiBase {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      logger.auth.info('Attempting login for:', credentials.email);
      
      const response = await this.api.post<AuthResponse>('/api/auth/login', {
        username: credentials.email,
        password: credentials.password
      });

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('doctor_data', JSON.stringify(response.data.user));
        logger.auth.success('Login successful for:', credentials.email);
      }

      return response.data;
    } catch (error: any) {
      logger.auth.error('Login failed for:', credentials.email, error);
      throw error;
    }
  }

  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      logger.auth.info('Attempting registration for:', registerData.email);
      
      const response = await this.api.post<AuthResponse>('/api/auth/register', registerData);

      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('doctor_data', JSON.stringify(response.data.user));
        logger.auth.success('Registration successful for:', registerData.email);
      }

      return response.data;
    } catch (error: any) {
      logger.auth.error('Registration failed for:', registerData.email, error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      logger.auth.info('Logging out user');
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('doctor_data');
      
      // Optionally call backend logout endpoint
      // await this.api.post('/api/auth/logout');
      
      logger.auth.success('Logout successful');
    } catch (error: any) {
      logger.auth.error('Logout error:', error);
      // Even if logout fails, clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('doctor_data');
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data;
    } catch (error: any) {
      logger.auth.error('Get current user failed:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/refresh');
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('doctor_data', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      logger.auth.error('Token refresh failed:', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getDoctorData(): any | null {
    const doctorData = localStorage.getItem('doctor_data');
    return doctorData ? JSON.parse(doctorData) : null;
  }
}
