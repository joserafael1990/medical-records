import { renderHook, act } from '@testing-library/react';
import { useConsultationDialog } from '../useConsultationDialog';

// Mock dependencies
jest.mock('../useConsultationManagement');
jest.mock('../useStudyCatalog');
jest.mock('../usePatientManagement');
jest.mock('../useAppointmentManager');
jest.mock('../useScrollToError');
jest.mock('../../components/common/ToastNotification');

describe('useConsultationDialog', () => {
  const mockConsultation = {
    id: '1',
    patient_id: 'patient-1',
    chief_complaint: 'Dolor de cabeza',
    physical_examination: 'Examen normal',
    primary_diagnosis: 'Cefalea tensional',
    treatment_plan: 'Analgésicos'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty form data', () => {
    const { result } = renderHook(() => useConsultationDialog());

    expect(result.current.formData.patient_id).toBe('');
    expect(result.current.formData.chief_complaint).toBe('');
    expect(result.current.formData.clinical_studies).toEqual([]);
    expect(result.current.formData.prescriptions).toEqual([]);
  });

  it('should populate form when consultation is provided', () => {
    const { result } = renderHook(() => useConsultationDialog(mockConsultation));

    expect(result.current.formData.patient_id).toBe('patient-1');
    expect(result.current.formData.chief_complaint).toBe('Dolor de cabeza');
    expect(result.current.formData.physical_examination).toBe('Examen normal');
    expect(result.current.formData.primary_diagnosis).toBe('Cefalea tensional');
    expect(result.current.formData.treatment_plan).toBe('Analgésicos');
  });

  it('should handle input changes', () => {
    const { result } = renderHook(() => useConsultationDialog());

    act(() => {
      result.current.handleInputChange('chief_complaint', 'Nuevo motivo');
    });

    expect(result.current.formData.chief_complaint).toBe('Nuevo motivo');
  });

  it('should handle vital signs changes', () => {
    const { result } = renderHook(() => useConsultationDialog());

    act(() => {
      result.current.handleVitalSignsChange('heart_rate', 80);
    });

    expect(result.current.formData.vital_signs.heart_rate).toBe(80);
  });

  it('should calculate BMI when weight or height changes', () => {
    const { result } = renderHook(() => useConsultationDialog());

    act(() => {
      result.current.handleVitalSignsChange('weight', 70);
      result.current.handleVitalSignsChange('height', 175);
    });

    expect(result.current.formData.vital_signs.weight).toBe(70);
    expect(result.current.formData.vital_signs.height).toBe(175);
    expect(result.current.formData.vital_signs.bmi).toBe(22.9);
  });

  it('should add clinical studies', () => {
    const { result } = renderHook(() => useConsultationDialog());

    const newStudy = {
      name: 'Hemograma',
      category: 'Laboratorio',
      description: 'Análisis de sangre completo'
    };

    act(() => {
      result.current.handleAddStudy(newStudy);
    });

    expect(result.current.formData.clinical_studies).toHaveLength(1);
    expect(result.current.formData.clinical_studies[0].study_name).toBe('Hemograma');
    expect(result.current.formData.clinical_studies[0].is_temporary).toBe(true);
  });

  it('should remove clinical studies', () => {
    const { result } = renderHook(() => useConsultationDialog());

    // Add a study first
    act(() => {
      result.current.handleAddStudy({
        name: 'Hemograma',
        category: 'Laboratorio'
      });
    });

    expect(result.current.formData.clinical_studies).toHaveLength(1);

    // Remove the study
    act(() => {
      result.current.handleRemoveStudy(result.current.formData.clinical_studies[0].id);
    });

    expect(result.current.formData.clinical_studies).toHaveLength(0);
  });

  it('should add prescriptions', () => {
    const { result } = renderHook(() => useConsultationDialog());

    const newPrescription = {
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'Cada 8 horas',
      duration: '7 días'
    };

    act(() => {
      result.current.handleAddPrescription(newPrescription);
    });

    expect(result.current.formData.prescriptions).toHaveLength(1);
    expect(result.current.formData.prescriptions[0].medication_name).toBe('Paracetamol');
  });

  it('should remove prescriptions', () => {
    const { result } = renderHook(() => useConsultationDialog());

    // Add a prescription first
    act(() => {
      result.current.handleAddPrescription({
        name: 'Paracetamol',
        dosage: '500mg'
      });
    });

    expect(result.current.formData.prescriptions).toHaveLength(1);

    // Remove the prescription
    act(() => {
      result.current.handleRemovePrescription(result.current.formData.prescriptions[0].id);
    });

    expect(result.current.formData.prescriptions).toHaveLength(0);
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => useConsultationDialog());

    // Test with empty form
    let isValid = result.current.validateForm();
    expect(isValid).toBe(false);
    expect(result.current.errors.patient_id).toBe('El paciente es obligatorio');
    expect(result.current.errors.chief_complaint).toBe('El motivo de consulta es obligatorio');

    // Fill required fields
    act(() => {
      result.current.handleInputChange('patient_id', 'patient-1');
      result.current.handleInputChange('chief_complaint', 'Dolor de cabeza');
      result.current.handleInputChange('physical_examination', 'Examen normal');
      result.current.handleInputChange('primary_diagnosis', 'Cefalea');
      result.current.handleInputChange('treatment_plan', 'Analgésicos');
    });

    isValid = result.current.validateForm();
    expect(isValid).toBe(true);
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('should reset form data', () => {
    const { result } = renderHook(() => useConsultationDialog());

    // Fill some data
    act(() => {
      result.current.handleInputChange('chief_complaint', 'Dolor de cabeza');
      result.current.handleAddStudy({ name: 'Hemograma', category: 'Lab' });
    });

    expect(result.current.formData.chief_complaint).toBe('Dolor de cabeza');
    expect(result.current.formData.clinical_studies).toHaveLength(1);

    // Reset form
    act(() => {
      result.current.handleReset();
    });

    expect(result.current.formData.chief_complaint).toBe('');
    expect(result.current.formData.clinical_studies).toHaveLength(0);
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });
});
