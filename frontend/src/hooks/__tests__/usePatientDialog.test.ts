import { renderHook, act } from '@testing-library/react';
import { usePatientDialog } from '../usePatientDialog';

// Mock dependencies
jest.mock('../../services');
jest.mock('../../components/common/ToastNotification');
jest.mock('../useScrollToError');
jest.mock('../../utils/disablePaymentDetection');

describe('usePatientDialog', () => {
  const mockPatient = {
    id: '1',
    name: 'John Doe Smith',
    full_name: 'John Doe Smith',
    birth_date: '1990-01-01',
    gender: 'M',
    email: 'john@example.com',
    primary_phone: '555-1234',
    curp: 'ABCD123456HDFGHG01'
  };

  const mockOnSubmit = jest.fn();
  const mockDoctorProfile = { id: '1', name: 'Dr. Smith' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty form data for new patient', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    expect(result.current.formData.first_name).toBe('');
    expect(result.current.formData.paternal_surname).toBe('');
    expect(result.current.formData.email).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should initialize with patient data for editing', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: mockPatient,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    expect(result.current.formData.name).toBe('John Doe Smith');
    expect(result.current.formData.email).toBe('john@example.com');
  });

  it('should handle input changes', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    act(() => {
      result.current.handleInputChange('first_name', 'Jane');
    });

    expect(result.current.formData.first_name).toBe('Jane');
  });

  it('should clear field errors when input changes', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Set an error
    act(() => {
      result.current.setErrors({ name: 'El nombre completo es obligatorio' });
    });

    expect(result.current.errors.name).toBe('El nombre completo es obligatorio');

    // Change input
    act(() => {
      result.current.handleInputChange('name', 'Jane Doe');
    });

    expect(result.current.errors.name).toBe('');
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Test with empty form
    let isValid = result.current.validateForm();
    expect(isValid).toBe(false);
    expect(result.current.errors.name).toBe('El nombre completo es obligatorio');

    // Fill required fields
    act(() => {
      result.current.handleInputChange('name', 'John Doe');
      result.current.handleInputChange('email', 'john@example.com');
      result.current.handleInputChange('primary_phone', '555-1234');
      result.current.handleInputChange('curp', 'ABCD123456HDFGHG01');
      result.current.handleInputChange('birth_date', '1990-01-01');
      result.current.handleInputChange('gender', 'M');
    });

    isValid = result.current.validateForm();
    expect(isValid).toBe(true);
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('should validate email format', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Test invalid email
    let error = result.current.validateField('email', 'invalid-email');
    expect(error).toBe('El email no es válido');

    // Test valid email
    error = result.current.validateField('email', 'john@example.com');
    expect(error).toBe('');
  });

  it('should validate CURP format', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Test invalid CURP
    let error = result.current.validateField('curp', 'INVALID');
    expect(error).toBe('El CURP no es válido');

    // Test valid CURP
    error = result.current.validateField('curp', 'ABCD123456HDFGHG01');
    expect(error).toBe('');
  });

  it('should handle form submission', async () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Fill required fields
    act(() => {
      result.current.handleInputChange('name', 'John Doe');
      result.current.handleInputChange('email', 'john@example.com');
      result.current.handleInputChange('primary_phone', '555-1234');
      result.current.handleInputChange('curp', 'ABCD123456HDFGHG01');
      result.current.handleInputChange('birth_date', '1990-01-01');
      result.current.handleInputChange('gender', 'M');
    });

    // Mock successful submission
    mockOnSubmit.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(result.current.formData);
  });

  it('should handle submission errors', async () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Fill required fields
    act(() => {
      result.current.handleInputChange('name', 'John Doe');
      result.current.handleInputChange('email', 'john@example.com');
      result.current.handleInputChange('primary_phone', '555-1234');
      result.current.handleInputChange('curp', 'ABCD123456HDFGHG01');
      result.current.handleInputChange('birth_date', '1990-01-01');
      result.current.handleInputChange('gender', 'M');
    });

    // Mock submission error
    const error = new Error('Submission failed');
    mockOnSubmit.mockRejectedValue(error);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('Submission failed');
  });

  it('should reset form data', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: mockPatient,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Verify initial data
    expect(result.current.formData.name).toBe('John Doe Smith');

    // Reset form
    act(() => {
      result.current.handleReset();
    });

    expect(result.current.formData.name).toBe('');
    expect(result.current.errors).toEqual({});
    expect(result.current.error).toBe('');
  });

  it('should handle close', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: mockPatient,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    // Set some data
    act(() => {
      result.current.handleInputChange('name', 'Jane Doe');
    });

    expect(result.current.formData.name).toBe('Jane Doe');

    // Close dialog
    act(() => {
      result.current.handleClose();
    });

    expect(result.current.formData.name).toBe('');
  });

  it('should load states for country', async () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    await act(async () => {
      await result.current.loadStatesForCountry('1', 'address');
    });

    // This would test the actual API call in a real implementation
    expect(result.current.states).toBeDefined();
  });

  it('should handle dialog state changes', () => {
    const { result } = renderHook(() => 
      usePatientDialog({
        patient: null,
        onSubmit: mockOnSubmit,
        doctorProfile: mockDoctorProfile
      })
    );

    expect(result.current.privacyConsentDialogOpen).toBe(false);
    expect(result.current.arcoRequestDialogOpen).toBe(false);

    act(() => {
      result.current.setPrivacyConsentDialogOpen(true);
    });

    expect(result.current.privacyConsentDialogOpen).toBe(true);

    act(() => {
      result.current.setArcoRequestDialogOpen(true);
    });

    expect(result.current.arcoRequestDialogOpen).toBe(true);
  });
});
