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
        email: credentials.email,
        password: credentials.password
      });

      logger.auth.info('Login response received', {
        hasAccessToken: Boolean(response.data?.access_token),
        hasUser: Boolean(response.data?.user),
        userId: response.data?.user?.id
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      if (!response.data.user) {
        throw new Error('No user data in response');
      }

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('doctor_data', JSON.stringify(response.data.user));
      logger.auth.info('Login successful for:', credentials.email);

      return response.data;
    } catch (error: any) {
      logger.auth.error(`Login failed for: ${credentials.email}`, error);

      // Re-throw with more context if it's a response processing error
      if (error.message && (error.message.includes('No data') || error.message.includes('No access token') || error.message.includes('No user data'))) {
        logger.auth.error('Response processing error', {
          status: error.response?.status,
          endpoint: '/api/auth/login'
        });
      }

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
        logger.auth.info('Registration successful for:', registerData.email);
      }

      return response.data;
    } catch (error: any) {
      logger.auth.error(`Registration failed for: ${registerData.email}`, error);
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

      logger.auth.info('Logout successful');
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

  async requestPasswordReset(email: string): Promise<any> {
    try {
      logger.auth.info('Requesting password reset for:', email);
      const response = await this.api.post('/api/auth/password-reset/request', { email });
      logger.auth.info('Password reset requested successfully');
      return response.data;
    } catch (error: any) {
      logger.auth.error('Password reset request failed', error);
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string, confirmPassword: string): Promise<any> {
    try {
      logger.auth.info('Confirming password reset');
      const response = await this.api.post('/api/auth/password-reset/confirm', {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      logger.auth.info('Password reset confirmed successfully');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to confirm password reset', error, 'auth');
      throw error;
    }
  }

  async testAuth(): Promise<{ status: string; user?: any }> {
    logger.debug('Testing authentication', undefined, 'auth');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { status: 'no_token' };
      }

      // Try to get current user info to validate token
      const response = await this.api.get<{ data: any }>('/api/doctors/me/profile');
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

  async testTokenValidity(): Promise<{ status: string; error?: string; user?: any }> {
    logger.debug('Testing token validity', undefined, 'auth');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { status: 'no_token' };
      }

      logger.debug('Token format check', {
        hasThreeParts: token.split('.').length === 3,
        parts: token.split('.').map((part, i) => `Part ${i + 1}: ${part.length} chars`)
      });

      // Try to get current user info to validate token
      const response = await this.api.get<{ data: any }>('/api/doctors/me/profile');
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
}
