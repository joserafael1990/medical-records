/**
 * Ejemplo de PatientDialog mejorado con el nuevo sistema UX de errores
 * Demuestra la integración de todas las mejoras implementadas
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon
} from '@mui/icons-material';

import { EnhancedErrorDisplay } from '../common/EnhancedErrorDisplay';
import { LoadingStateDisplay, PatientListSkeleton } from '../common/LoadingStates';
import { 
  useLoadingStates, 
  useRealTimeValidation, 
  useFormErrorNavigation,
  useEmergencyRelationships 
} from '../../hooks';
import { PatientFormData } from '../../types';

interface EnhancedPatientDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PatientFormData) => Promise<void>;
  isEditing?: boolean;
  initialData?: Partial<PatientFormData>;
}

const FORM_STEPS = [
  'Información Personal',
  'Datos de Contacto', 
  'Información Médica',
  'Contacto de Emergencia'
];

export const EnhancedPatientDialog: React.FC<EnhancedPatientDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isEditing = false,
  initialData = {}
}) => {
  // Estados locales
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    civil_status: '',
    curp: '',
    rfc: '',
    primary_phone: '',
    email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    ...initialData
  } as PatientFormData);

  // Hooks personalizados mejorados
  const { 
    loadingStates, 
    startLoading, 
    finishLoading,
    isAnyLoading 
  } = useLoadingStates();

  const {
    fieldValidations,
    validateOnChange,
    validateOnBlur,
    hasAnyErrors,
    getErrorCount
  } = useRealTimeValidation({
    curp: { required: true, format: true },
    rfc: { required: true, format: true },
    phone: { required: true, format: 'mexico' },
    email: { required: true, format: true }
  }, {
    debounceMs: 300,
    validateOnChange: true,
    showSuccessMessages: true
  });

  const {
    registerField,
    scrollToFirstError,
    getErrorSummary,
    createStepNavigation
  } = useFormErrorNavigation({
    scrollBehavior: 'smooth',
    focusElement: true,
    groupBySection: true
  });

  const { 
    relationships, 
    isLoading: relationshipsLoading 
  } = useEmergencyRelationships();

  // Navegación de pasos con validación
  const stepNavigation = createStepNavigation(FORM_STEPS);

  // Manejadores de campo mejorados
  const handleFieldChange = useCallback((fieldName: keyof PatientFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Validación en tiempo real
    validateOnChange(fieldName, value, {
      patientAge: formData.birth_date ? 
        new Date().getFullYear() - new Date(formData.birth_date).getFullYear() : 
        undefined
    });
  }, [formData.birth_date, validateOnChange]);

  const handleFieldBlur = useCallback((fieldName: keyof PatientFormData, value: any) => {
    validateOnBlur(fieldName, value);
  }, [validateOnBlur]);

  // Navegación de pasos con validación
  const handleNext = useCallback(() => {
    // Validar campos del paso actual antes de continuar
    const currentStepFields = getFieldsForStep(activeStep);
    const stepErrors: Record<string, string> = {};
    
    currentStepFields.forEach(field => {
      const validation = fieldValidations[field];
      if (validation && !validation.isValid) {
        stepErrors[field] = validation.message;
      }
    });

    if (Object.keys(stepErrors).length > 0) {
      scrollToFirstError(stepErrors);
      return;
    }

    if (activeStep < FORM_STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, fieldValidations, scrollToFirstError]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  }, [activeStep]);

  // Envío del formulario mejorado
  const handleSubmit = useCallback(async () => {
    startLoading('creatingPatient', 
      isEditing ? 'Actualizando información del paciente...' : 'Creando nuevo paciente...'
    );

    try {
      // Validar todo el formulario
      if (hasAnyErrors()) {
        const errorSummary = getErrorSummary({}, fieldValidations);
        if (errorSummary.firstError) {
          scrollToFirstError({}, fieldValidations);
        }
        throw new Error(`${getErrorCount()} campos requieren corrección`);
      }

      await onSubmit(formData);
      
      finishLoading('creatingPatient', true, 
        isEditing ? '¡Paciente actualizado exitosamente!' : '¡Paciente creado exitosamente!'
      );
      
      // Cerrar después de un breve delay para mostrar el éxito
      setTimeout(onClose, 1500);
      
    } catch (error: any) {
      // Enhanced error handling for EnhancedPatientDialog
      let errorMessage = 'Error desconocido';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : 'Error de validación en el formulario';
      } else if (error.response?.status === 409) {
        errorMessage = 'El paciente ya existe en el sistema';
      } else if (error.response?.status === 422) {
        errorMessage = 'Los datos proporcionados no son válidos';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Error interno del servidor';
      } else if (!error.response) {
        errorMessage = 'Error de conexión. Verifique su internet';
      }
      
      finishLoading('creatingPatient', false, errorMessage);
      console.error('Error en envío de formulario:', error);
    }
  }, [
    formData, 
    onSubmit, 
    isEditing,
    hasAnyErrors,
    getErrorCount,
    getErrorSummary,
    fieldValidations,
    scrollToFirstError,
    startLoading,
    finishLoading,
    onClose
  ]);

  // Funciones auxiliares
  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0: return ['first_name', 'paternal_surname', 'maternal_surname', 'birth_date', 'gender', 'civil_status'];
      case 1: return ['primary_phone', 'email', 'curp', 'rfc'];
      case 2: return ['blood_type', 'allergies', 'chronic_conditions'];
      case 3: return ['emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'];
      default: return [];
    }
  };

  const isStepValid = (step: number): boolean => {
    const stepFields = getFieldsForStep(step);
    return stepFields.every(field => {
      const validation = fieldValidations[field];
      return !validation || validation.isValid;
    });
  };

  // Renderizar contenido del paso
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderContactInfo();
      case 2:
        return renderMedicalInfo();
      case 3:
        return renderEmergencyContact();
      default:
        return null;
    }
  };

  const renderPersonalInfo = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
      <TextField
        fullWidth
        label="Nombre(s)"
        value={formData.first_name}
        onChange={(e) => handleFieldChange('first_name', e.target.value)}
        onBlur={(e) => handleFieldBlur('first_name', e.target.value)}
        error={fieldValidations.first_name && !fieldValidations.first_name.isValid}
        helperText={fieldValidations.first_name?.message}
        required
        inputRef={(ref) => ref && registerField('first_name', ref)}
        data-field="first_name"
        data-form-section="personal"
      />
      
      <TextField
        fullWidth
        label="Apellido Paterno"
        value={formData.paternal_surname}
        onChange={(e) => handleFieldChange('paternal_surname', e.target.value)}
        required
        inputRef={(ref) => ref && registerField('paternal_surname', ref)}
        data-field="paternal_surname"
        data-form-section="personal"
      />
      
      <TextField
        fullWidth
        label="Apellido Materno"
        value={formData.maternal_surname}
        onChange={(e) => handleFieldChange('maternal_surname', e.target.value)}
        inputRef={(ref) => ref && registerField('maternal_surname', ref)}
        data-field="maternal_surname"
        data-form-section="personal"
      />
      
      <TextField
        fullWidth
        label="Fecha de Nacimiento"
        type="date"
        value={formData.birth_date}
        onChange={(e) => handleFieldChange('birth_date', e.target.value)}
        InputLabelProps={{ shrink: true }}
        required
        inputRef={(ref) => ref && registerField('birth_date', ref)}
        data-field="birth_date"
        data-form-section="personal"
      />
      
      <FormControl fullWidth>
        <InputLabel>Género</InputLabel>
        <Select
          value={formData.gender}
          onChange={(e) => handleFieldChange('gender', e.target.value)}
          label="Género"
          data-field="gender"
          data-form-section="personal"
        >
          <MenuItem value="M">Masculino</MenuItem>
          <MenuItem value="F">Femenino</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl fullWidth>
        <InputLabel>Estado Civil</InputLabel>
        <Select
          value={formData.civil_status}
          onChange={(e) => handleFieldChange('civil_status', e.target.value)}
          label="Estado Civil"
          data-field="civil_status"
          data-form-section="personal"
        >
          <MenuItem value="">--Seleccionar--</MenuItem>
          <MenuItem value="Soltero(a)">Soltero(a)</MenuItem>
          <MenuItem value="Casado(a)">Casado(a)</MenuItem>
          <MenuItem value="Divorciado(a)">Divorciado(a)</MenuItem>
          <MenuItem value="Viudo(a)">Viudo(a)</MenuItem>
          <MenuItem value="Unión libre">Unión libre</MenuItem>
          <MenuItem value="Separado(a)">Separado(a)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const renderContactInfo = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
      <TextField
        fullWidth
        label="CURP"
        value={formData.curp}
        onChange={(e) => handleFieldChange('curp', e.target.value.toUpperCase())}
        onBlur={(e) => handleFieldBlur('curp', e.target.value)}
        error={fieldValidations.curp && !fieldValidations.curp.isValid}
        helperText={fieldValidations.curp?.message || fieldValidations.curp?.suggestions?.join(', ')}
        className={
          fieldValidations.curp?.isChecking ? 'realtime-validation-checking' :
          fieldValidations.curp?.isValid ? 'realtime-validation-success' :
          fieldValidations.curp && !fieldValidations.curp.isValid ? 'form-error-highlight' : ''
        }
        inputRef={(ref) => ref && registerField('curp', ref)}
        data-field="curp"
        data-form-section="contact"
      />
      
      <TextField
        fullWidth
        label="RFC"
        value={formData.rfc}
        onChange={(e) => handleFieldChange('rfc', e.target.value.toUpperCase())}
        onBlur={(e) => handleFieldBlur('rfc', e.target.value)}
        error={fieldValidations.rfc && !fieldValidations.rfc.isValid}
        helperText={fieldValidations.rfc?.message}
        className={
          fieldValidations.rfc?.isValid ? 'realtime-validation-success' :
          fieldValidations.rfc && !fieldValidations.rfc.isValid ? 'form-error-highlight' : ''
        }
        inputRef={(ref) => ref && registerField('rfc', ref)}
        data-field="rfc"
        data-form-section="contact"
      />
      
      <TextField
        fullWidth
        label="Teléfono"
        value={formData.primary_phone}
        onChange={(e) => {
          // Solo permitir números
          const value = e.target.value.replace(/[^0-9]/g, '');
          handleFieldChange('primary_phone', value);
        }}
        onBlur={(e) => {
          const value = e.target.value.replace(/[^0-9]/g, '');
          handleFieldBlur('primary_phone', value);
        }}
        error={fieldValidations.primary_phone && !fieldValidations.primary_phone.isValid}
        helperText={fieldValidations.primary_phone?.message || "Solo números (10 dígitos mínimo)"}
        placeholder="5551234567"
        className={
          fieldValidations.primary_phone?.isValid ? 'realtime-validation-success' :
          fieldValidations.primary_phone && !fieldValidations.primary_phone.isValid ? 'form-error-highlight' : ''
        }
        inputRef={(ref) => ref && registerField('primary_phone', ref)}
        data-field="primary_phone"
        inputProps={{ maxLength: 15 }}
        data-form-section="contact"
      />
      
      <TextField
        fullWidth
        label="Correo Electrónico"
        type="email"
        value={formData.email}
        onChange={(e) => handleFieldChange('email', e.target.value)}
        inputRef={(ref) => ref && registerField('email', ref)}
        data-field="email"
        data-form-section="contact"
      />
    </Box>
  );

  const renderMedicalInfo = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
      <TextField
        fullWidth
        label="Tipo de Sangre"
        value={formData.blood_type || ''}
        onChange={(e) => handleFieldChange('blood_type', e.target.value)}
        data-field="blood_type"
        data-form-section="medical"
      />
      
      <TextField
        fullWidth
        label="Alergias"
        multiline
        rows={3}
        value={formData.allergies || ''}
        onChange={(e) => handleFieldChange('allergies', e.target.value)}
        data-field="allergies"
        data-form-section="medical"
      />
      
      <TextField
        fullWidth
        label="Condiciones Crónicas"
        multiline
        rows={3}
        value={formData.chronic_conditions || ''}
        onChange={(e) => handleFieldChange('chronic_conditions', e.target.value)}
        data-field="chronic_conditions"
        data-form-section="medical"
      />
    </Box>
  );

  const renderEmergencyContact = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
      <TextField
        fullWidth
        label="Nombre del Contacto"
        value={formData.emergency_contact_name || ''}
        onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
        data-field="emergency_contact_name"
        data-form-section="emergency"
      />
      
      <TextField
        fullWidth
        label="Teléfono de Emergencia"
        value={formData.emergency_contact_phone || ''}
        onChange={(e) => handleFieldChange('emergency_contact_phone', e.target.value)}
        onBlur={(e) => handleFieldBlur('emergency_contact_phone', e.target.value)}
        error={fieldValidations.emergency_contact_phone && !fieldValidations.emergency_contact_phone.isValid}
        helperText={fieldValidations.emergency_contact_phone?.message}
        data-field="emergency_contact_phone"
        data-form-section="emergency"
      />
      
      <FormControl fullWidth>
        <InputLabel>Relación</InputLabel>
        <Select
          value={formData.emergency_contact_relationship || ''}
          onChange={(e) => handleFieldChange('emergency_contact_relationship', e.target.value)}
          label="Relación"
          disabled={relationshipsLoading}
          data-field="emergency_contact_relationship"
          data-form-section="emergency"
        >
          {relationships.map((relationship) => (
            <MenuItem key={relationship.code} value={relationship.code}>
              {relationship.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">
            {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Paso {activeStep + 1} de {FORM_STEPS.length}: {FORM_STEPS[activeStep]}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 0 }}>
        {/* Sistema de errores mejorado */}
        <EnhancedErrorDisplay
          fieldErrors={{}}
          validationErrors={fieldValidations}
          loadingContext="creatingPatient"
          loadingStates={loadingStates}
          showNavigation={true}
          showProgress={true}
          autoNavigateToError={true}
          medicalContext="patient_care"
          userRole="doctor"
          patientPresent={false}
          isUrgent={false}
          onRetry={() => window.location.reload()}
        />

        {/* Stepper mejorado */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {FORM_STEPS.map((label, index) => (
            <Step key={label} completed={isStepValid(index)}>
              <StepLabel
                error={index <= activeStep && !isStepValid(index)}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Contenido del formulario */}
        <Box data-step={activeStep}>
          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || isAnyLoading()}
          startIcon={<BackIcon />}
        >
          Anterior
        </Button>

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {getErrorCount() > 0 && (
            <Typography variant="caption" color="error">
              {getErrorCount()} campo{getErrorCount() !== 1 ? 's' : ''} requiere{getErrorCount() === 1 ? '' : 'n'} atención
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep < FORM_STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              variant="contained"
              endIcon={<NextIcon />}
              disabled={!isStepValid(activeStep)}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={hasAnyErrors() || isAnyLoading()}
            >
              {isEditing ? 'Actualizar' : 'Crear'} Paciente
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedPatientDialog;


