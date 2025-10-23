import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { AccountInfoStep } from '../auth/RegisterView/AccountInfoStep';

const theme = createTheme();

const mockFormData = {
  email: '',
  password: '',
  confirmPassword: ''
};

const mockPasswordValidation = {
  minLength: false,
  hasUppercase: false,
  hasLowercase: false,
  hasNumbers: false,
  hasSpecialChars: false
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AccountInfoStep', () => {
  const mockOnInputChange = jest.fn();
  const mockSetShowPassword = jest.fn();
  const mockSetShowConfirmPassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form fields', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    expect(screen.getByLabelText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar Contraseña')).toBeInTheDocument();
  });

  it('should display current form values', () => {
    const formDataWithValues = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    renderWithTheme(
      <AccountInfoStep
        formData={formDataWithValues}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('password123')).toBeInTheDocument();
  });

  it('should call onInputChange when inputs change', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    const emailField = screen.getByLabelText('Correo Electrónico');
    fireEvent.change(emailField, { target: { value: 'test@example.com' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('should toggle password visibility', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    const passwordToggle = screen.getByLabelText('toggle password visibility');
    fireEvent.click(passwordToggle);

    expect(mockSetShowPassword).toHaveBeenCalledWith(true);
  });

  it('should toggle confirm password visibility', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    const confirmPasswordToggle = screen.getByLabelText('toggle password visibility');
    fireEvent.click(confirmPasswordToggle);

    expect(mockSetShowConfirmPassword).toHaveBeenCalledWith(true);
  });

  it('should display field errors', () => {
    const fieldErrors = {
      email: 'Email is required',
      password: 'Password is too weak',
      confirmPassword: 'Passwords do not match'
    };

    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={fieldErrors}
      />
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is too weak')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('should display password requirements', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={{ ...mockFormData, password: 'test' }}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    expect(screen.getByText('Requisitos de la contraseña:')).toBeInTheDocument();
    expect(screen.getByText('Al menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Al menos una mayúscula')).toBeInTheDocument();
    expect(screen.getByText('Al menos una minúscula')).toBeInTheDocument();
    expect(screen.getByText('Al menos un número')).toBeInTheDocument();
    expect(screen.getByText('Al menos un carácter especial')).toBeInTheDocument();
  });

  it('should show password strength indicator', () => {
    const strongPasswordValidation = {
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumbers: true,
      hasSpecialChars: true
    };

    renderWithTheme(
      <AccountInfoStep
        formData={{ ...mockFormData, password: 'StrongPass123!' }}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={strongPasswordValidation}
        fieldErrors={{}}
      />
    );

    expect(screen.getByText(/Fortaleza de la contraseña: 100%/)).toBeInTheDocument();
  });

  it('should show password match indicator', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={{
          email: '',
          password: 'password123',
          confirmPassword: 'password123'
        }}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    expect(screen.getByText('Las contraseñas coinciden')).toBeInTheDocument();
  });

  it('should show password mismatch indicator', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={{
          email: '',
          password: 'password123',
          confirmPassword: 'different123'
        }}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('should have correct input types', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={false}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    const emailField = screen.getByLabelText('Correo Electrónico');
    expect(emailField).toHaveAttribute('type', 'email');

    const passwordField = screen.getByLabelText('Contraseña');
    expect(passwordField).toHaveAttribute('type', 'password');

    const confirmPasswordField = screen.getByLabelText('Confirmar Contraseña');
    expect(confirmPasswordField).toHaveAttribute('type', 'password');
  });

  it('should show password as text when showPassword is true', () => {
    renderWithTheme(
      <AccountInfoStep
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        showPassword={true}
        setShowPassword={mockSetShowPassword}
        showConfirmPassword={false}
        setShowConfirmPassword={mockSetShowConfirmPassword}
        passwordValidation={mockPasswordValidation}
        fieldErrors={{}}
      />
    );

    const passwordField = screen.getByLabelText('Contraseña');
    expect(passwordField).toHaveAttribute('type', 'text');
  });
});
