import { PatientService } from '../patients/PatientService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PatientService', () => {
  let patientService: PatientService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create service instance
    patientService = new PatientService();
  });

  describe('getPatients', () => {
    it('should fetch all patients successfully', async () => {
      const mockPatients = [
        { id: '1', first_name: 'John', paternal_surname: 'Doe' },
        { id: '2', first_name: 'Jane', paternal_surname: 'Smith' }
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockPatients });

      const result = await patientService.getPatients();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/patients');
      expect(result).toEqual(mockPatients);
    });

    it('should handle fetch patients error', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(patientService.getPatients()).rejects.toThrow('Network error');
    });
  });

  describe('getPatientById', () => {
    it('should fetch patient by ID successfully', async () => {
      const mockPatient = {
        id: '1',
        first_name: 'John',
        paternal_surname: 'Doe',
        maternal_surname: 'Smith',
        birth_date: '1990-01-01',
        gender: 'M',
        primary_phone: '555-1234',
        email: 'john@example.com'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockPatient });

      const result = await patientService.getPatientById('1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/patients/1');
      expect(result).toEqual(mockPatient);
    });
  });

  describe('createPatient', () => {
    it('should create patient successfully', async () => {
      const patientData = {
        first_name: 'John',
        paternal_surname: 'Doe',
        maternal_surname: 'Smith',
        birth_date: '1990-01-01',
        gender: 'M',
        primary_phone: '555-1234',
        email: 'john@example.com'
      };

      const mockResponse = {
        id: '1',
        ...patientData
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await patientService.createPatient(patientData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/patients', {
        ...patientData,
        gender: 'Masculino' // Should be mapped to backend format
      });
      expect(result).toEqual(mockResponse);
    });

    it('should map gender to backend format', async () => {
      const patientData = {
        first_name: 'Jane',
        paternal_surname: 'Doe',
        maternal_surname: 'Smith',
        birth_date: '1990-01-01',
        gender: 'F',
        primary_phone: '555-1234',
        email: 'jane@example.com'
      };

      const mockResponse = { id: '1', ...patientData };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await patientService.createPatient(patientData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/patients', {
        ...patientData,
        gender: 'Femenino' // Should be mapped to backend format
      });
    });
  });

  describe('updatePatient', () => {
    it('should update patient successfully', async () => {
      const patientId = '1';
      const updateData = {
        first_name: 'John Updated',
        primary_phone: '555-9999'
      };

      const mockResponse = {
        id: patientId,
        ...updateData
      };

      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await patientService.updatePatient(patientId, updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/patients/1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deletePatient', () => {
    it('should delete patient successfully', async () => {
      const patientId = '1';

      mockAxiosInstance.delete.mockResolvedValue({});

      await patientService.deletePatient(patientId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/patients/1');
    });
  });

  describe('searchPatients', () => {
    it('should search patients successfully', async () => {
      const query = 'John';
      const mockResults = [
        { id: '1', first_name: 'John', paternal_surname: 'Doe' }
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockResults });

      const result = await patientService.searchPatients(query);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/patients/search?q=John');
      expect(result).toEqual(mockResults);
    });
  });

  describe('getPatientsByDoctor', () => {
    it('should fetch patients by doctor successfully', async () => {
      const doctorId = '1';
      const mockPatients = [
        { id: '1', first_name: 'John', doctor_id: doctorId }
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockPatients });

      const result = await patientService.getPatientsByDoctor(doctorId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/patients/doctor/1');
      expect(result).toEqual(mockPatients);
    });
  });

  describe('getPatientStatistics', () => {
    it('should fetch patient statistics successfully', async () => {
      const mockStats = {
        total: 100,
        active: 80,
        inactive: 20
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockStats });

      const result = await patientService.getPatientStatistics();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/patients/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('exportPatients', () => {
    it('should export patients successfully', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockAxiosInstance.get.mockResolvedValue({ data: mockBlob });

      const result = await patientService.exportPatients('csv');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/patients/export?format=csv', {
        responseType: 'blob'
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('importPatients', () => {
    it('should import patients successfully', async () => {
      const mockFile = new File(['csv data'], 'patients.csv', { type: 'text/csv' });
      const mockResponse = {
        success: 10,
        errors: []
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await patientService.importPatients(mockFile);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/patients/import',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validatePatientData', () => {
    it('should validate patient data successfully', async () => {
      const patientData = {
        first_name: 'John',
        paternal_surname: 'Doe',
        birth_date: '1990-01-01',
        gender: 'M'
      };

      const mockResponse = {
        valid: true,
        errors: []
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await patientService.validatePatientData(patientData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/patients/validate', patientData);
      expect(result).toEqual(mockResponse);
    });
  });
});
