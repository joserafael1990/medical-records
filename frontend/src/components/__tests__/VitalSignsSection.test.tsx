import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { VitalSignsSection } from '../dialogs/ConsultationDialog/VitalSignsSection';

const theme = createTheme();

const mockVitalSigns = {
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80,
  heart_rate: 72,
  temperature: 36.5,
  weight: 70,
  height: 175,
  bmi: 22.9
};

const mockOnVitalSignsChange = jest.fn();
const mockErrors = {};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('VitalSignsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all vital signs fields', () => {
    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    expect(screen.getByLabelText('Presión Sistólica')).toBeInTheDocument();
    expect(screen.getByLabelText('Presión Diastólica')).toBeInTheDocument();
    expect(screen.getByLabelText('Frecuencia Cardíaca')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperatura (°C)')).toBeInTheDocument();
    expect(screen.getByLabelText('Peso (kg)')).toBeInTheDocument();
    expect(screen.getByLabelText('Estatura (cm)')).toBeInTheDocument();
    expect(screen.getByLabelText('IMC')).toBeInTheDocument();
  });

  it('should display current vital signs values', () => {
    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80')).toBeInTheDocument();
    expect(screen.getByDisplayValue('72')).toBeInTheDocument();
    expect(screen.getByDisplayValue('36.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('70')).toBeInTheDocument();
    expect(screen.getByDisplayValue('175')).toBeInTheDocument();
    expect(screen.getByDisplayValue('22.9')).toBeInTheDocument();
  });

  it('should call onVitalSignsChange when values change', () => {
    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    const heartRateField = screen.getByLabelText('Frecuencia Cardíaca');
    fireEvent.change(heartRateField, { target: { value: '75' } });

    expect(mockOnVitalSignsChange).toHaveBeenCalledWith('heart_rate', 75);
  });

  it('should display errors when provided', () => {
    const errorsWithHeartRate = {
      heart_rate: 'Valor fuera del rango normal'
    };

    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={errorsWithHeartRate}
      />
    );

    expect(screen.getByText('Valor fuera del rango normal')).toBeInTheDocument();
  });

  it('should have correct field types', () => {
    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    const heartRateField = screen.getByLabelText('Frecuencia Cardíaca');
    expect(heartRateField).toHaveAttribute('type', 'number');

    const temperatureField = screen.getByLabelText('Temperatura (°C)');
    expect(temperatureField).toHaveAttribute('type', 'number');

    const weightField = screen.getByLabelText('Peso (kg)');
    expect(weightField).toHaveAttribute('type', 'number');
  });

  it('should have BMI field as read-only', () => {
    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    const bmiField = screen.getByLabelText('IMC');
    expect(bmiField).toHaveAttribute('readonly');
  });

  it('should display BMI helper text', () => {
    renderWithTheme(
      <VitalSignsSection
        vitalSigns={mockVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    expect(screen.getByText('Calculado automáticamente')).toBeInTheDocument();
  });

  it('should handle empty values gracefully', () => {
    const emptyVitalSigns = {
      blood_pressure_systolic: 0,
      blood_pressure_diastolic: 0,
      heart_rate: 0,
      temperature: 0,
      weight: 0,
      height: 0,
      bmi: 0
    };

    renderWithTheme(
      <VitalSignsSection
        vitalSigns={emptyVitalSigns}
        onVitalSignsChange={mockOnVitalSignsChange}
        errors={mockErrors}
      />
    );

    // Should not crash and should display empty fields
    expect(screen.getByLabelText('Presión Sistólica')).toBeInTheDocument();
    expect(screen.getByLabelText('Presión Diastólica')).toBeInTheDocument();
  });
});
