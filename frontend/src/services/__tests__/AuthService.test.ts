import { AuthService } from '../auth/AuthService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create service instance
    authService = new AuthService();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse = {
        data: {
          access_token: 'mock-token',
          token_type: 'Bearer',
          user: {
            id: 1,
            email: 'test@example.com',
            person_type: 'doctor',
            title: 'Dr.',
            first_name: 'John',
            paternal_surname: 'Doe',
            maternal_surname: 'Smith'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/login', {
        username: credentials.email,
        password: credentials.password
      });
      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('token')).toBe('mock-token');
      expect(localStorage.getItem('doctor_data')).toBe(JSON.stringify(mockResponse.data.user));
    });

    it('should handle login failure', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const error = new Error('Invalid credentials');
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        first_name: 'Jane',
        paternal_surname: 'Doe',
        maternal_surname: 'Smith',
        curp: 'ABCD123456HDFGHG01',
        gender: 'F',
        birth_date: '1990-01-01',
        phone: '555-1234',
        title: 'Dra.',
        specialty: 'Cardiología',
        university: 'UNAM',
        graduation_year: '2015',
        professional_license: '12345678',
        office_address: 'Calle 123',
        office_country: 'México',
        office_state_id: '1',
        office_city: 'Ciudad de México',
        office_phone: '555-5678',
        appointment_duration: '30',
        scheduleData: {}
      };

      const mockResponse = {
        data: {
          access_token: 'mock-token',
          token_type: 'Bearer',
          user: {
            id: 2,
            email: 'new@example.com',
            person_type: 'doctor',
            title: 'Dra.',
            first_name: 'Jane',
            paternal_surname: 'Doe',
            maternal_surname: 'Smith'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authService.register(registerData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/register', registerData);
      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('token')).toBe('mock-token');
    });

    it('should handle registration failure', async () => {
      const registerData = {
        email: 'invalid@example.com',
        password: 'password123',
        first_name: 'Jane',
        paternal_surname: 'Doe',
        maternal_surname: 'Smith',
        curp: 'INVALID',
        gender: 'F',
        birth_date: '1990-01-01',
        phone: '555-1234',
        title: 'Dra.',
        specialty: 'Cardiología',
        university: 'UNAM',
        graduation_year: '2015',
        professional_license: '12345678',
        office_address: 'Calle 123',
        office_country: 'México',
        office_state_id: '1',
        office_city: 'Ciudad de México',
        office_phone: '555-5678',
        appointment_duration: '30',
        scheduleData: {}
      };

      const error = new Error('Registration failed');
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(authService.register(registerData)).rejects.toThrow('Registration failed');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set up localStorage
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('doctor_data', JSON.stringify({ id: 1, name: 'John' }));

      await authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('doctor_data')).toBeNull();
    });

    it('should clear localStorage even if logout fails', async () => {
      // Set up localStorage
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('doctor_data', JSON.stringify({ id: 1, name: 'John' }));

      // Mock axios to throw an error
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('doctor_data')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        person_type: 'doctor'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-token',
          token_type: 'Bearer',
          user: {
            id: 1,
            email: 'test@example.com',
            person_type: 'doctor'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/auth/refresh');
      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('token')).toBe('new-token');
    });
  });

  describe('authentication helpers', () => {
    it('should check if user is authenticated', () => {
      // Test with no token
      expect(authService.isAuthenticated()).toBe(false);

      // Test with token
      localStorage.setItem('token', 'mock-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should get token from localStorage', () => {
      localStorage.setItem('token', 'mock-token');
      expect(authService.getToken()).toBe('mock-token');
    });

    it('should get doctor data from localStorage', () => {
      const doctorData = { id: 1, name: 'John' };
      localStorage.setItem('doctor_data', JSON.stringify(doctorData));
      expect(authService.getDoctorData()).toEqual(doctorData);
    });

    it('should return null for doctor data if not set', () => {
      expect(authService.getDoctorData()).toBeNull();
    });
  });
});
