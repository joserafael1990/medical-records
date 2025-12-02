import { renderHook, act, waitFor } from '@testing-library/react';
import { usePatientForm } from '../usePatientForm';
import { apiService } from '../../services';
import { useToast } from '../../components/common/ToastNotification';

// Mock axios first
jest.mock('axios', () => require('../../__mocks__/axios'));

// Mock dependencies
jest.mock('../../services', () => ({
  apiService: {
    catalogs: {
      getEmergencyRelationships: jest.fn(),
      getCountries: jest.fn(),
      getStates: jest.fn()
    },
    patients: {
      getPatient: jest.fn(),
      getPatients: jest.fn(),
      createPatient: jest.fn()
    },
    documents: {
      getPersonDocuments: jest.fn(),
      savePersonDocument: jest.fn()
    }
  }
}));
jest.mock('../../components/common/ToastNotification');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));
jest.mock('../../utils/disablePaymentDetection', () => ({
  disablePaymentDetection: jest.fn()
}));
jest.mock('../../utils/countryCodes', () => ({
  extractCountryCode: jest.fn((phone) => ({
    countryCode: '+52',
    number: phone ? phone.replace('+52', '') : ''
  }))
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('usePatientForm', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError
    } as any);

    // Mock API services
    mockApiService.catalogs.getEmergencyRelationships = jest.fn().mockResolvedValue([
      { code: 'spouse', name: 'Cónyuge' },
      { code: 'parent', name: 'Padre/Madre' }
    ]);
    mockApiService.catalogs.getCountries = jest.fn().mockResolvedValue([
      { id: 1, name: 'México' },
      { id: 2, name: 'Estados Unidos' }
    ]);
    mockApiService.catalogs.getStates = jest.fn().mockResolvedValue([
      { id: 1, name: 'Puebla' },
      { id: 2, name: 'Ciudad de México' }
    ]);
    mockApiService.patients.getPatient = jest.fn().mockResolvedValue({
      id: '1',
      name: 'Juan Pérez',
      full_name: 'Juan Pérez',
      primary_phone: '+522221234567'
    });
    mockApiService.documents.getPersonDocuments = jest.fn().mockResolvedValue([]);
    mockApiService.patients.getPatients = jest.fn().mockResolvedValue([
      { id: '1', name: 'Juan Pérez', full_name: 'Juan Pérez' }
    ]);
    mockApiService.documents.savePersonDocument = jest.fn().mockResolvedValue({});
  });

  it('should initialize with empty form data for new patient', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.formData.name).toBe('');
      expect(result.current.isEditing).toBe(false);
    });
  });

  it('should load patient data when editing', async () => {
    const mockPatient = {
      id: '1',
      name: 'Juan Pérez',
      full_name: 'Juan Pérez',
      primary_phone: '+522221234567'
    } as any;

    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: mockPatient,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(mockApiService.patients.getPatient).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(result.current.formData.name).toBe('Juan Pérez');
      expect(result.current.isEditing).toBe(true);
    });
  });

  it('should load catalog data when dialog opens', async () => {
    renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(mockApiService.catalogs.getEmergencyRelationships).toHaveBeenCalled();
      expect(mockApiService.catalogs.getCountries).toHaveBeenCalled();
    });
  });

  it('should update form data on field change', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    act(() => {
      const handleChange = result.current.handleChange('name');
      handleChange({ target: { value: 'María García' } } as any);
    });

    expect(result.current.formData.name).toBe('María García');
  });

  it('should load states when country changes', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.countries.length).toBeGreaterThan(0);
    });

    await act(async () => {
      await result.current.handleCountryChange('address_country_id', '1');
    });

    await waitFor(() => {
      expect(mockApiService.catalogs.getStates).toHaveBeenCalledWith(1);
    });
  });

  it('should validate required fields on submit', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('El nombre completo es requerido');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should submit form when validation passes', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    // Fill required fields
    act(() => {
      const handleChange = result.current.handleChange('name');
      handleChange({ target: { value: 'Juan Pérez' } } as any);
    });

    act(() => {
      const handleChange = result.current.handleChange('gender');
      handleChange({ target: { value: 'Masculino' } } as any);
    });

    act(() => {
      result.current.handlePhoneChange('+52', '2221234567');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('should handle phone number changes correctly', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    act(() => {
      result.current.handlePhoneChange('+52', '2221234567');
    });

    expect(result.current.phoneCountryCode).toBe('+52');
    expect(result.current.phoneNumber).toBe('2221234567');
  });

  it('should handle personal documents management', async () => {
    const { result } = renderHook(() =>
      usePatientForm({
        open: true,
        patient: null,
        onSubmit: mockOnSubmit,
        onClose: mockOnClose
      })
    );

    await waitFor(() => {
      expect(result.current.personalDocuments).toBeDefined();
    });

    expect(result.current.personalDocuments.length).toBe(1);

    act(() => {
      result.current.setPersonalDocuments([
        { document_id: null, document_value: '' },
        { document_id: 1, document_value: 'ABC123' }
      ]);
    });

    expect(result.current.personalDocuments.length).toBe(2);
  });
});

