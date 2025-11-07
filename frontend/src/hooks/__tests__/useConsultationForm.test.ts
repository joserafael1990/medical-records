import { renderHook, act, waitFor } from '@testing-library/react';
import { useConsultationForm } from '../useConsultationForm';
import { apiService } from '../../services';
import { useToast } from '../../components/common/ToastNotification';

// Mock axios first
jest.mock('axios', () => require('../../__mocks__/axios'));

// Mock dependencies
jest.mock('../../services', () => ({
  apiService: {
    catalogs: {
      getCountries: jest.fn(),
      getStates: jest.fn(),
      getEmergencyRelationships: jest.fn()
    },
    patients: {
      getPatients: jest.fn(),
      getPatient: jest.fn()
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
jest.mock('../useScrollToError', () => ({
  useScrollToErrorInDialog: jest.fn(() => ({ errorRef: { current: null } }))
}));
jest.mock('../useClinicalStudies', () => ({
  useClinicalStudies: jest.fn(() => ({
    clinicalStudies: [],
    studies: [],
    loading: false,
    addStudy: jest.fn(),
    removeStudy: jest.fn(),
    fetchStudies: jest.fn(),
    clearTemporaryStudies: jest.fn(),
    createStudy: jest.fn(),
    clinicalStudyDialogOpen: false
  }))
}));
jest.mock('../useVitalSigns', () => ({
  useVitalSigns: jest.fn(() => ({
    vitalSigns: [],
    loading: false,
    addVitalSign: jest.fn(),
    removeVitalSign: jest.fn(),
    fetchConsultationVitalSigns: jest.fn(),
    fetchAvailableVitalSigns: jest.fn(),
    clearTemporaryVitalSigns: jest.fn(),
    temporaryVitalSigns: [],
    createVitalSign: jest.fn(),
    vitalSignDialogOpen: false
  }))
}));
jest.mock('../usePrescriptions', () => ({
  usePrescriptions: jest.fn(() => ({
    prescriptions: [],
    loading: false,
    addPrescription: jest.fn(),
    removePrescription: jest.fn()
  }))
}));
jest.mock('../useDiagnosisManagement', () => ({
  useDiagnosisManagement: jest.fn(() => ({
    diagnoses: [],
    addDiagnosis: jest.fn(),
    removeDiagnosis: jest.fn()
  }))
}));
jest.mock('../usePatientPreviousStudies', () => ({
  usePatientPreviousStudies: jest.fn(() => ({
    patientPreviousStudies: [],
    loadingPreviousStudies: false,
    loadPatientPreviousStudies: jest.fn()
  }))
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('useConsultationForm', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockPatients = [
    {
      id: 1,
      first_name: 'Juan',
      paternal_surname: 'Pérez',
      birth_date: '1990-01-01'
    }
  ];

  const mockDoctorProfile = {
    id: 1,
    first_name: 'Juan',
    last_name: 'Médico',
    paternal_surname: 'Médico',
    title: 'Dr.',
    professional_license: '12345',
    specialty: 'Cardiología'
  };

  const mockClinicalStudiesHook = {
    clinicalStudies: [],
    studies: [],
    loading: false,
    addStudy: jest.fn(),
    removeStudy: jest.fn(),
    fetchStudies: jest.fn(),
    clearTemporaryStudies: jest.fn(),
    createStudy: jest.fn(),
    clinicalStudyDialogOpen: false
  };

  const mockVitalSignsHook = {
    vitalSigns: [],
    loading: false,
    addVitalSign: jest.fn(),
    removeVitalSign: jest.fn(),
    fetchConsultationVitalSigns: jest.fn(),
    fetchAvailableVitalSigns: jest.fn(),
    clearTemporaryVitalSigns: jest.fn(),
    temporaryVitalSigns: [],
    createVitalSign: jest.fn(),
    vitalSignDialogOpen: false
  };

  const mockPrescriptionsHook = {
    prescriptions: [],
    loading: false,
    addPrescription: jest.fn(),
    removePrescription: jest.fn(),
    clearTemporaryPrescriptions: jest.fn(),
    temporaryPrescriptions: [],
    fetchPrescriptions: jest.fn(),
    createPrescription: jest.fn()
  };

  const mockPrimaryDiagnosesHook = {
    diagnoses: [],
    addDiagnosis: jest.fn(),
    removeDiagnosis: jest.fn(),
    clearDiagnoses: jest.fn(),
    loadDiagnoses: jest.fn()
  };

  const mockSecondaryDiagnosesHook = {
    diagnoses: [],
    addDiagnosis: jest.fn(),
    removeDiagnosis: jest.fn(),
    clearDiagnoses: jest.fn(),
    loadDiagnoses: jest.fn()
  };

  const defaultProps = {
    open: true,
    consultation: null,
    doctorProfile: mockDoctorProfile,
    patients: mockPatients,
    appointments: [],
    onSubmit: mockOnSubmit,
    onSuccess: mockOnSuccess,
    primaryDiagnosesHook: mockPrimaryDiagnosesHook,
    secondaryDiagnosesHook: mockSecondaryDiagnosesHook,
    clinicalStudiesHook: mockClinicalStudiesHook,
    vitalSignsHook: mockVitalSignsHook,
    prescriptionsHook: mockPrescriptionsHook
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError
    } as any);

    // Mock API services
    mockApiService.catalogs.getCountries = jest.fn().mockResolvedValue([
      { id: 1, name: 'México' }
    ]);
    mockApiService.catalogs.getStates = jest.fn().mockResolvedValue([
      { id: 1, name: 'Puebla' }
    ]);
    mockApiService.catalogs.getEmergencyRelationships = jest.fn().mockResolvedValue([]);
    mockApiService.patients.getPatients = jest.fn().mockResolvedValue(mockPatients);
    mockApiService.patients.getPatient = jest.fn().mockResolvedValue(mockPatients[0]);
  });

  it('should initialize with default form data', async () => {
    const { result } = renderHook(() =>
      useConsultationForm(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
      expect(result.current.formData.doctor_name).toContain('Dr. Juan');
    });
  });

  it('should load patient data when patient is selected', async () => {
    const { result } = renderHook(() =>
      useConsultationForm(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    await act(async () => {
      await result.current.handlePatientChange(mockPatients[0] as any);
    });

    expect(result.current.selectedPatient).toEqual(mockPatients[0]);
  });

  it('should update form data on field change', async () => {
    const { result } = renderHook(() =>
      useConsultationForm(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    act(() => {
      result.current.handleChange({
        target: { name: 'chief_complaint', value: 'Dolor de cabeza' }
      } as any);
    });

    expect(result.current.formData.chief_complaint).toBe('Dolor de cabeza');
  });

  it('should handle date change', async () => {
    const { result } = renderHook(() =>
      useConsultationForm(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.formData).toBeDefined();
    });

    const testDate = new Date('2024-01-15');
    act(() => {
      result.current.handleDateChange(testDate);
    });

    expect(result.current.formData.date).toBeDefined();
  });

  it('should load catalog data when dialog opens', async () => {
    renderHook(() =>
      useConsultationForm(defaultProps)
    );

    await waitFor(() => {
      expect(mockApiService.catalogs.getCountries).toHaveBeenCalled();
      expect(mockApiService.catalogs.getEmergencyRelationships).toHaveBeenCalled();
    });
  });

  it('should handle country change and load states', async () => {
    const { result } = renderHook(() =>
      useConsultationForm(defaultProps)
    );

    await waitFor(() => {
      expect(result.current.countries).toBeDefined();
    });

    await act(async () => {
      await result.current.handleCountryChange('address_country_id', '1');
    });

    await waitFor(() => {
      expect(mockApiService.catalogs.getStates).toHaveBeenCalledWith(1);
    });
  });
});
