import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { PersonalInfoSection } from '../dialogs/PatientDialog/PersonalInfoSection';

const theme = createTheme();

const mockFormData = {
  first_name: '',
  paternal_surname: '',
  maternal_surname: '',
  birth_date: '',
  gender: '',
  curp: '',
  rfc: '',
  civil_status: ''
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PersonalInfoSection', () => {
  const mockOnInputChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form fields', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido Paterno')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido Materno')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de Nacimiento')).toBeInTheDocument();
    expect(screen.getByLabelText('Género')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado Civil')).toBeInTheDocument();
    expect(screen.getByLabelText('CURP')).toBeInTheDocument();
    expect(screen.getByLabelText('RFC')).toBeInTheDocument();
  });

  it('should display current form values', () => {
    const formDataWithValues = {
      first_name: 'John',
      paternal_surname: 'Doe',
      maternal_surname: 'Smith',
      birth_date: '1990-01-01',
      gender: 'M',
      curp: 'ABCD123456HDFGHG01',
      rfc: 'ABCD123456',
      civil_status: 'Soltero'
    };

    renderWithTheme(
      <PersonalInfoSection
        formData={formDataWithValues}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
  });

  it('should call onInputChange when inputs change', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    const firstNameField = screen.getByLabelText('Nombre');
    fireEvent.change(firstNameField, { target: { value: 'John' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('first_name', 'John');
  });

  it('should display field errors', () => {
    const fieldErrors = {
      first_name: 'Name is required',
      paternal_surname: 'Paternal surname is required',
      email: 'Email is required',
      curp: 'CURP is invalid'
    };

    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={fieldErrors}
      />
    );

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Paternal surname is required')).toBeInTheDocument();
    expect(screen.getByText('CURP is invalid')).toBeInTheDocument();
  });

  it('should have correct input types and attributes', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    const curpField = screen.getByLabelText('CURP');
    expect(curpField).toHaveAttribute('maxLength', '18');

    const rfcField = screen.getByLabelText('RFC');
    expect(rfcField).toHaveAttribute('maxLength', '13');
  });

  it('should show required field indicators', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    // Check for required fields
    const requiredFields = ['Nombre', 'Apellido Paterno', 'CURP'];
    requiredFields.forEach(fieldLabel => {
      const field = screen.getByLabelText(fieldLabel);
      expect(field).toHaveAttribute('required');
    });
  });

  it('should display helper text for CURP and RFC', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    expect(screen.getByText('Clave Única de Registro de Población')).toBeInTheDocument();
    expect(screen.getByText('Registro Federal de Contribuyentes')).toBeInTheDocument();
  });

  it('should handle gender selection', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    const genderSelect = screen.getByLabelText('Género');
    fireEvent.mouseDown(genderSelect);
    
    // Check if gender options are available
    expect(screen.getByText('Masculino')).toBeInTheDocument();
    expect(screen.getByText('Femenino')).toBeInTheDocument();
    expect(screen.getByText('Otro')).toBeInTheDocument();
  });

  it('should handle civil status selection', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    const civilStatusSelect = screen.getByLabelText('Estado Civil');
    fireEvent.mouseDown(civilStatusSelect);
    
    // Check if civil status options are available
    expect(screen.getByText('Soltero')).toBeInTheDocument();
    expect(screen.getByText('Casado')).toBeInTheDocument();
    expect(screen.getByText('Divorciado')).toBeInTheDocument();
    expect(screen.getByText('Viudo')).toBeInTheDocument();
    expect(screen.getByText('Unión libre')).toBeInTheDocument();
  });

  it('should convert CURP and RFC to uppercase', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    const curpField = screen.getByLabelText('CURP');
    fireEvent.change(curpField, { target: { value: 'abcd123456hdfghg01' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('curp', 'ABCD123456HDFGHG01');

    const rfcField = screen.getByLabelText('RFC');
    fireEvent.change(rfcField, { target: { value: 'abcd123456' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('rfc', 'ABCD123456');
  });

  it('should display section title and icon', () => {
    renderWithTheme(
      <PersonalInfoSection
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        errors={{}}
      />
    );

    expect(screen.getByText('Información Personal')).toBeInTheDocument();
  });
});
