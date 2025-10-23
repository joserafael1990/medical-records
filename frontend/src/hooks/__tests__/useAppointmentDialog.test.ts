import { renderHook, act } from '@testing-library/react';
import { useAppointmentDialog } from '../useAppointmentDialog';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../components/common/ToastNotification');
jest.mock('../useScrollToError');

describe('useAppointmentDialog', () => {
  const mockFormData = {
    patient_id: '',
    date_time: '',
    time: '',
    appointment_type: '',
    notes: ''
  };

  const mockPatients = [
    {
      id: '1',
      first_name: 'Juan',
      paternal_surname: 'Pérez',
      maternal_surname: 'García',
      birth_date: '1990-01-01',
      primary_phone: '555-1234',
      email: 'juan@example.com'
    }
  ];

  const mockDoctorProfile = {
    id: '1',
    consultation_duration: 30
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with provided form data', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    expect(result.current.localFormData).toEqual(mockFormData);
    expect(result.current.selectedPatient).toBeNull();
    expect(result.current.selectedDate).toBe('');
    expect(result.current.selectedTime).toBe('');
  });

  it('should handle date change', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    act(() => {
      result.current.handleDateChange('2024-01-15');
    });

    expect(result.current.selectedDate).toBe('2024-01-15');
    expect(result.current.localFormData.date_time).toBe('2024-01-15');
  });

  it('should handle time change', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    act(() => {
      result.current.handleTimeChange('10:30');
    });

    expect(result.current.selectedTime).toBe('10:30');
    expect(result.current.localFormData.time).toBe('10:30');
  });

  it('should handle patient change', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    const patient = mockPatients[0];

    act(() => {
      result.current.handlePatientChange(patient);
    });

    expect(result.current.selectedPatient).toBe(patient);
    expect(result.current.localFormData.patient_id).toBe(patient.id);
  });

  it('should handle input change', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    act(() => {
      result.current.handleInputChange('appointment_type', 'Consulta General');
    });

    expect(result.current.localFormData.appointment_type).toBe('Consulta General');
  });

  it('should format time to AM/PM correctly', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    expect(result.current.formatTimeToAMPM('09:30')).toBe('9:30 AM');
    expect(result.current.formatTimeToAMPM('14:45')).toBe('2:45 PM');
    expect(result.current.formatTimeToAMPM('00:00')).toBe('12:00 AM');
    expect(result.current.formatTimeToAMPM('12:00')).toBe('12:00 PM');
  });

  it('should format patient name with age', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    const patient = mockPatients[0];
    const formattedName = result.current.formatPatientNameWithAge(patient);
    
    expect(formattedName).toContain('Juan Pérez García');
    expect(formattedName).toContain('años');
  });

  it('should calculate age correctly', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    const age = result.current.calculateAge('1990-01-01');
    const currentYear = new Date().getFullYear();
    const expectedAge = currentYear - 1990;
    
    expect(age).toBe(expectedAge);
  });

  it('should validate form correctly', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    // Test with empty form
    act(() => {
      result.current.handleSubmit(jest.fn());
    });

    expect(result.current.validationError).toBe('Debe seleccionar un paciente');

    // Fill required fields
    act(() => {
      result.current.handlePatientChange(mockPatients[0]);
      result.current.handleDateChange('2024-01-15');
      result.current.handleTimeChange('10:30');
      result.current.handleInputChange('appointment_type', 'Consulta General');
    });

    // Clear validation error
    act(() => {
      result.current.setValidationError('');
    });

    expect(result.current.validationError).toBe('');
  });

  it('should reset form data', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    // Fill some data
    act(() => {
      result.current.handlePatientChange(mockPatients[0]);
      result.current.handleDateChange('2024-01-15');
      result.current.handleInputChange('notes', 'Test notes');
    });

    expect(result.current.selectedPatient).toBe(mockPatients[0]);
    expect(result.current.selectedDate).toBe('2024-01-15');
    expect(result.current.localFormData.notes).toBe('Test notes');

    // Reset form
    act(() => {
      result.current.handleReset();
    });

    expect(result.current.selectedPatient).toBeNull();
    expect(result.current.selectedDate).toBe('');
    expect(result.current.localFormData.notes).toBe('');
    expect(result.current.validationError).toBe('');
  });

  it('should handle new patient input change', () => {
    const { result } = renderHook(() => 
      useAppointmentDialog({
        formData: mockFormData,
        patients: mockPatients,
        isEditing: false,
        doctorProfile: mockDoctorProfile
      })
    );

    act(() => {
      result.current.handleNewPatientInputChange('first_name', 'María');
    });

    expect(result.current.newPatientData.first_name).toBe('María');
  });
});
