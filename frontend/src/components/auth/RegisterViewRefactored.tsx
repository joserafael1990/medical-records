import React from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Save
} from '@mui/icons-material';

import { useRegisterForm } from '../../hooks/useRegisterForm';
import { AccountInfoStep } from './RegisterView/AccountInfoStep';
import { PersonalInfoStep } from './RegisterView/PersonalInfoStep';
import { ProfessionalInfoStep } from './RegisterView/ProfessionalInfoStep';
import { OfficeInfoStep } from './RegisterView/OfficeInfoStep';
import { ScheduleStep } from './RegisterView/ScheduleStep';
import CortexLogo from '../common/CortexLogo';

interface RegisterViewRefactoredProps {
  onBackToLogin: () => void;
}

const STEPS = [
  'Información de Cuenta',
  'Información Personal',
  'Información Profesional',
  'Datos del Consultorio',
  'Horario de Atención'
];

const RegisterViewRefactored: React.FC<RegisterViewRefactoredProps> = ({ onBackToLogin }) => {
  const {
    formData,
    activeStep,
    setActiveStep,
    visitedSteps,
    isLoading,
    error,
    setError,
    fieldErrors,
    passwordValidation,
    setPasswordValidation,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    specialties,
    countries,
    states,
    selectedOfficeCountry,
    setSelectedOfficeCountry,
    handleInputChange,
    handleScheduleChange,
    handleTimeBlockChange,
    handleAddTimeBlock,
    handleRemoveTimeBlock,
    handleNext,
    handleBack,
    handleSubmit,
    validateStep,
    errorRef
  } = useRegisterForm();

  const handleStepClick = (step: number) => {
    if (step <= activeStep || visitedSteps.has(step)) {
      setActiveStep(step);
    }
  };

  const isStepOptional = (step: number) => {
    return step === 4; // Schedule step is optional
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <AccountInfoStep
            formData={{
              email: formData.email,
              password: formData.password,
              confirmPassword: formData.confirmPassword
            }}
            onInputChange={handleInputChange}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            passwordValidation={passwordValidation}
            fieldErrors={fieldErrors}
          />
        );
      
      case 1:
        return (
          <PersonalInfoStep
            formData={{
              first_name: formData.first_name,
              paternal_surname: formData.paternal_surname,
              maternal_surname: formData.maternal_surname,
              curp: formData.curp,
              gender: formData.gender,
              birth_date: formData.birth_date,
              phone: formData.phone
            }}
            onInputChange={handleInputChange}
            fieldErrors={fieldErrors}
          />
        );
      
      case 2:
        return (
          <ProfessionalInfoStep
            formData={{
              title: formData.title,
              specialty: formData.specialty,
              university: formData.university,
              graduation_year: formData.graduation_year,
              professional_license: formData.professional_license
            }}
            onInputChange={handleInputChange}
            specialties={specialties}
            fieldErrors={fieldErrors}
          />
        );
      
      case 3:
        return (
          <OfficeInfoStep
            formData={{
              office_address: formData.office_address,
              office_country: formData.office_country,
              office_state_id: formData.office_state_id,
              office_city: formData.office_city,
              office_phone: formData.office_phone,
              appointment_duration: formData.appointment_duration
            }}
            onInputChange={handleInputChange}
            countries={countries}
            states={states}
            selectedOfficeCountry={selectedOfficeCountry}
            onCountryChange={setSelectedOfficeCountry}
            fieldErrors={fieldErrors}
          />
        );
      
      case 4:
        return (
          <ScheduleStep
            scheduleData={formData.scheduleData}
            onScheduleChange={handleScheduleChange}
            onTimeBlockChange={handleTimeBlockChange}
            onAddTimeBlock={handleAddTimeBlock}
            onRemoveTimeBlock={handleRemoveTimeBlock}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <CortexLogo variant="full" sx={{ mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Registro de Doctor
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Completa la información para crear tu cuenta profesional
          </Typography>
        </Box>

        {/* Back to Login Button */}
        <Box sx={{ mb: 3, alignSelf: 'flex-start' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={onBackToLogin}
            variant="outlined"
          >
            Volver al Login
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, width: '100%' }}
            ref={errorRef}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Registration Form */}
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {STEPS.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  optional={isStepOptional(index) ? 'Opcional' : undefined}
                  onClick={() => handleStepClick(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  {label}
                </StepLabel>
                <StepContent>
                  {renderStepContent(index)}
                  
                  {/* Step Actions */}
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={index === STEPS.length - 1 ? handleSubmit : handleNext}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : (index === STEPS.length - 1 ? <Save /> : undefined)}
                    >
                      {isLoading 
                        ? 'Procesando...' 
                        : index === STEPS.length - 1 
                          ? 'Completar Registro' 
                          : 'Siguiente'
                      }
                    </Button>
                    
                    {index > 0 && (
                      <Button
                        onClick={handleBack}
                        disabled={isLoading}
                      >
                        Anterior
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            ¿Ya tienes una cuenta?{' '}
            <Button
              variant="text"
              onClick={onBackToLogin}
              sx={{ textTransform: 'none' }}
            >
              Iniciar Sesión
            </Button>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterViewRefactored;
