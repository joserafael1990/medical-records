import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { PatientSelector } from '../dialogs/AppointmentDialog/PatientSelector';

const theme = createTheme();

const mockPatients = [
  {
    id: '1',
    first_name: 'Juan',
    paternal_surname: 'Pérez',
    maternal_surname: 'García',
    birth_date: '1990-01-01',
    primary_phone: '555-1234',
    email: 'juan@example.com',
    medical_conditions: 'Diabetes',
    allergies: 'Penicilina'
  },
  {
    id: '2',
    first_name: 'María',
    paternal_surname: 'López',
    maternal_surname: 'Martínez',
    birth_date: '1985-05-15',
    primary_phone: '555-5678',
    email: 'maria@example.com'
  }
];

const mockFormatPatientNameWithAge = (patient: any) => {
  const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear();
  return `${patient.first_name} ${patient.paternal_surname} ${patient.maternal_surname} (${age} años)`;
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PatientSelector', () => {
  const mockOnPatientChange = jest.fn();
  const mockOnNewPatient = jest.fn();
  const mockOnEditPatient = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render patient selector with search field', () => {
    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={null}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    expect(screen.getByLabelText('Buscar paciente')).toBeInTheDocument();
    expect(screen.getByText('Seleccionar Paciente')).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('should display patients in autocomplete', () => {
    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={null}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    const searchField = screen.getByLabelText('Buscar paciente');
    fireEvent.click(searchField);

    // Check if patients are displayed
    expect(screen.getByText(/Juan Pérez García/)).toBeInTheDocument();
    expect(screen.getByText(/María López Martínez/)).toBeInTheDocument();
  });

  it('should call onPatientChange when patient is selected', () => {
    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={null}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    const searchField = screen.getByLabelText('Buscar paciente');
    fireEvent.click(searchField);
    
    const patientOption = screen.getByText(/Juan Pérez García/);
    fireEvent.click(patientOption);

    expect(mockOnPatientChange).toHaveBeenCalledWith(mockPatients[0]);
  });

  it('should call onNewPatient when new button is clicked', () => {
    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={null}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    const newButton = screen.getByText('Nuevo');
    fireEvent.click(newButton);

    expect(mockOnNewPatient).toHaveBeenCalled();
  });

  it('should display selected patient information', () => {
    const selectedPatient = mockPatients[0];

    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={selectedPatient}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    expect(screen.getByText(/Juan Pérez García/)).toBeInTheDocument();
    expect(screen.getByText('555-1234 • juan@example.com')).toBeInTheDocument();
    expect(screen.getByText('Condiciones médicas: Diabetes')).toBeInTheDocument();
    expect(screen.getByText('Alergias: Penicilina')).toBeInTheDocument();
  });

  it('should display edit button for selected patient', () => {
    const selectedPatient = mockPatients[0];

    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={selectedPatient}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    const editButton = screen.getByText('Editar');
    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton);
    expect(mockOnEditPatient).toHaveBeenCalledWith(selectedPatient);
  });

  it('should not display edit button when onEditPatient is not provided', () => {
    const selectedPatient = mockPatients[0];

    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={selectedPatient}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('should display error message when provided', () => {
    const errors = { patient_id: 'Debe seleccionar un paciente' };

    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={null}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={errors}
      />
    );

    expect(screen.getByText('Debe seleccionar un paciente')).toBeInTheDocument();
  });

  it('should handle empty patients list', () => {
    renderWithTheme(
      <PatientSelector
        patients={[]}
        selectedPatient={null}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    expect(screen.getByLabelText('Buscar paciente')).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('should display patient avatar with first letter', () => {
    const selectedPatient = mockPatients[0];

    renderWithTheme(
      <PatientSelector
        patients={mockPatients}
        selectedPatient={selectedPatient}
        onPatientChange={mockOnPatientChange}
        onNewPatient={mockOnNewPatient}
        onEditPatient={mockOnEditPatient}
        formatPatientNameWithAge={mockFormatPatientNameWithAge}
        errors={{}}
      />
    );

    // Check if avatar is displayed (it should contain the first letter 'J')
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});
