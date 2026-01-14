import { renderHook, act } from '@testing-library/react';
import { useRegisterForm } from '../useRegisterForm';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../contexts/AuthContext');
jest.mock('../useCatalogs');
jest.mock('../useScrollToError');

describe('useRegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty form data', () => {
    const { result } = renderHook(() => useRegisterForm());

    expect(result.current.formData.email).toBe('');
    expect(result.current.formData.password).toBe('');
    expect(result.current.formData.first_name).toBe(''); // Still uses first_name for form, but combines to name on submit
    expect(result.current.activeStep).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should handle input changes', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleInputChange('email', 'test@example.com');
    });

    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('should validate password correctly', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Test weak password
    let validation = result.current.validatePassword('weak');
    expect(validation.minLength).toBe(false);
    expect(validation.hasUppercase).toBe(false);
    expect(validation.hasLowercase).toBe(true);
    expect(validation.hasNumbers).toBe(false);
    expect(validation.hasSpecialChars).toBe(false);

    // Test strong password
    validation = result.current.validatePassword('StrongPass123!');
    expect(validation.minLength).toBe(true);
    expect(validation.hasUppercase).toBe(true);
    expect(validation.hasLowercase).toBe(true);
    expect(validation.hasNumbers).toBe(true);
    expect(validation.hasSpecialChars).toBe(true);
  });

  it('should validate email correctly', () => {
    const { result } = renderHook(() => useRegisterForm());

    expect(result.current.validateEmail('test@example.com')).toBe(true);
    expect(result.current.validateEmail('invalid-email')).toBe(false);
    expect(result.current.validateEmail('test@')).toBe(false);
    expect(result.current.validateEmail('@example.com')).toBe(false);
  });

  it('should validate step 0 (Account Info)', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Test with empty form
    let isValid = result.current.validateStep(0);
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.email).toBe('El email es obligatorio');

    // Fill required fields with valid data
    act(() => {
      result.current.handleInputChange('email', 'test@example.com');
      result.current.handleInputChange('password', 'StrongPass123!');
      result.current.handleInputChange('confirmPassword', 'StrongPass123!');
    });

    isValid = result.current.validateStep(0);
    expect(isValid).toBe(true);
    expect(Object.keys(result.current.fieldErrors)).toHaveLength(0);
  });

  it('should validate step 1 (Personal Info)', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Test with empty form
    let isValid = result.current.validateStep(1);
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.first_name).toBe('El nombre es obligatorio'); // Form still uses first_name

    // Fill required fields
    act(() => {
      result.current.handleInputChange('first_name', 'Juan');
      result.current.handleInputChange('paternal_surname', 'Pérez');
      result.current.handleInputChange('gender', 'M');
      result.current.handleInputChange('birth_date', '1990-01-01');
      result.current.handleInputChange('phone', '555-1234');
    });

    isValid = result.current.validateStep(1);
    expect(isValid).toBe(true);
  });

  it('should validate step 2 (Professional Info)', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Test with empty form
    let isValid = result.current.validateStep(2);
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.title).toBe('El título es obligatorio');

    // Fill required fields
    act(() => {
      result.current.handleInputChange('title', 'Dr.');
      result.current.handleInputChange('specialty', 'Cardiología');
      result.current.handleInputChange('university', 'UNAM');
      result.current.handleInputChange('graduation_year', '2015');
      result.current.handleInputChange('professional_license', '12345678');
    });

    isValid = result.current.validateStep(2);
    expect(isValid).toBe(true);
  });

  it('should validate step 3 (Office Info)', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Test with empty form
    let isValid = result.current.validateStep(3);
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.office_address).toBe('La dirección del consultorio es obligatoria');

    // Fill required fields
    act(() => {
      result.current.handleInputChange('office_address', 'Calle 123, Col. Centro');
      result.current.handleInputChange('office_city', 'Ciudad de México');
      result.current.handleInputChange('office_phone', '555-5678');
      result.current.handleInputChange('appointment_duration', '30');
    });

    isValid = result.current.validateStep(3);
    expect(isValid).toBe(true);
  });

  it('should handle next step', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Fill step 0 data
    act(() => {
      result.current.handleInputChange('email', 'test@example.com');
      result.current.handleInputChange('password', 'StrongPass123!');
      result.current.handleInputChange('confirmPassword', 'StrongPass123!');
    });

    act(() => {
      result.current.handleNext();
    });

    expect(result.current.activeStep).toBe(1);
    expect(result.current.visitedSteps.has(1)).toBe(true);
  });

  it('should handle back step', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Set active step to 1
    act(() => {
      result.current.setActiveStep(1);
    });

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.activeStep).toBe(0);
  });

  it('should handle schedule changes', () => {
    const { result } = renderHook(() => useRegisterForm());

    const mockSchedule = {
      day_of_week: 0,
      is_active: true,
      time_blocks: [{ start_time: '09:00', end_time: '17:00' }]
    };

    act(() => {
      result.current.handleScheduleChange('monday', mockSchedule);
    });

    expect(result.current.formData.scheduleData.monday).toEqual(mockSchedule);
  });

  it('should handle time block changes', () => {
    const { result } = renderHook(() => useRegisterForm());

    // First set up a schedule with a time block
    act(() => {
      result.current.handleScheduleChange('monday', {
        day_of_week: 0,
        is_active: true,
        time_blocks: [{ start_time: '09:00', end_time: '17:00' }]
      });
    });

    // Then modify the time block
    act(() => {
      result.current.handleTimeBlockChange('monday', 0, 'start_time', '08:00');
    });

    expect(result.current.formData.scheduleData.monday?.time_blocks[0].start_time).toBe('08:00');
  });

  it('should handle add time block', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Set up initial schedule
    act(() => {
      result.current.handleScheduleChange('monday', {
        day_of_week: 0,
        is_active: true,
        time_blocks: [{ start_time: '09:00', end_time: '17:00' }]
      });
    });

    // Add new time block
    act(() => {
      result.current.handleAddTimeBlock('monday');
    });

    expect(result.current.formData.scheduleData.monday?.time_blocks).toHaveLength(2);
    expect(result.current.formData.scheduleData.monday?.time_blocks[1]).toEqual({
      start_time: '09:00',
      end_time: '17:00'
    });
  });

  it('should handle remove time block', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Set up schedule with multiple time blocks
    act(() => {
      result.current.handleScheduleChange('monday', {
        day_of_week: 0,
        is_active: true,
        time_blocks: [
          { start_time: '09:00', end_time: '12:00' },
          { start_time: '14:00', end_time: '17:00' }
        ]
      });
    });

    // Remove first time block
    act(() => {
      result.current.handleRemoveTimeBlock('monday', 0);
    });

    expect(result.current.formData.scheduleData.monday?.time_blocks).toHaveLength(1);
    expect(result.current.formData.scheduleData.monday?.time_blocks[0]).toEqual({
      start_time: '14:00',
      end_time: '17:00'
    });
  });

  it('should clear field errors when input changes', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Set a field error
    act(() => {
      result.current.setFieldErrors({ email: 'Email is required' });
    });

    expect(result.current.fieldErrors.email).toBe('Email is required');

    // Change the input
    act(() => {
      result.current.handleInputChange('email', 'test@example.com');
    });

    expect(result.current.fieldErrors.email).toBe('');
  });

  it('should update password validation when password changes', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleInputChange('password', 'StrongPass123!');
    });

    expect(result.current.passwordValidation.minLength).toBe(true);
    expect(result.current.passwordValidation.hasUppercase).toBe(true);
    expect(result.current.passwordValidation.hasLowercase).toBe(true);
    expect(result.current.passwordValidation.hasNumbers).toBe(true);
    expect(result.current.passwordValidation.hasSpecialChars).toBe(true);
  });
});
