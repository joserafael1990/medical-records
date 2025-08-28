import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  LinearProgress,
  Paper,
  Typography,
  Collapse,
  Alert,
  Button,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useRealTimeValidation, ValidationSchema } from '../../hooks/useRealTimeValidation';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'date' | 'textarea';
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export interface ValidatedFormProps<T extends Record<string, any>> {
  // Form configuration
  formData: T;
  validationSchema: ValidationSchema<T>;
  onFormDataChange: (field: keyof T, value: any) => void;
  onSubmit: (data: T) => Promise<void> | void;
  
  // Form options
  showProgress?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  validateOnMount?: boolean;
  showErrorSummary?: boolean;
  
  // UI customization
  title?: string;
  submitLabel?: string;
  showRequiredIndicator?: boolean;
  paperProps?: any;
  spacing?: number;
  
  // Callbacks
  onValidationChange?: (isValid: boolean, errors: Record<keyof T, string | null>) => void;
  onAutoSave?: (data: T) => void;
  
  // Custom rendering
  children?: (props: {
    formData: T;
    validation: any;
    getFieldProps: (field: keyof T) => any;
    handleFieldChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleFieldBlur: (field: keyof T) => () => void;
    isFormValid: boolean;
    isFormValidating: boolean;
  }) => React.ReactNode;
  
  // State
  isSubmitting?: boolean;
  submitError?: string | null;
  submitSuccess?: string | null;
}

const ValidatedForm = <T extends Record<string, any>>({
  formData,
  validationSchema,
  onFormDataChange,
  onSubmit,
  showProgress = true,
  autoSave = false,
  autoSaveDelay = 2000,
  validateOnMount = false,
  showErrorSummary = true,
  title,
  submitLabel = 'Guardar',
  showRequiredIndicator = true,
  paperProps,
  spacing = 2,
  onValidationChange,
  onAutoSave,
  children,
  isSubmitting = false,
  submitError,
  submitSuccess
}: ValidatedFormProps<T>) => {
  const [autoSaveInProgress, setAutoSaveInProgress] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Real-time validation
  const {
    validation,
    isFormValid,
    isFormValidating,
    validateField,
    touchField,
    validateForm,
    resetValidation,
    getFieldProps
  } = useRealTimeValidation(validationSchema, {
    validateOnMount,
    showErrorsOnlyAfterTouch: true
  });

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && onAutoSave && isFormValid && !isFormValidating) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      const timeout = setTimeout(async () => {
        setAutoSaveInProgress(true);
        try {
          await onAutoSave(formData);
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setAutoSaveInProgress(false);
        }
      }, autoSaveDelay);
      
      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [formData, autoSave, onAutoSave, isFormValid, isFormValidating, autoSaveDelay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validation change callback
  useEffect(() => {
    if (onValidationChange) {
      const errors = Object.entries(validation).reduce((acc, [key, val]) => {
        acc[key as keyof T] = val.error;
        return acc;
      }, {} as Record<keyof T, string | null>);
      
      onValidationChange(isFormValid, errors);
    }
  }, [isFormValid, validation, onValidationChange]);

  // Field change handler
  const handleFieldChange = useCallback((field: keyof T) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      onFormDataChange(field, value);
      validateField(field, value, formData);
    }, [onFormDataChange, validateField, formData]);

  // Field blur handler
  const handleFieldBlur = useCallback((field: keyof T) => () => {
    touchField(field);
  }, [touchField]);

  // Form submit handler
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    const isValid = await validateForm(formData);
    if (!isValid) return;
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  }, [validateForm, formData, onSubmit]);

  // Get form progress
  const getFormProgress = (): number => {
    const totalFields = Object.keys(validationSchema).length;
    const validFields = Object.values(validation).filter(field => field.isValid && field.touched).length;
    return totalFields > 0 ? (validFields / totalFields) * 100 : 0;
  };

  // Get error summary
  const getErrorSummary = (): string[] => {
    return Object.values(validation)
      .filter(field => field.error && field.touched)
      .map(field => field.error!)
      .filter(Boolean);
  };

  const formProgress = getFormProgress();
  const errorSummary = getErrorSummary();
  const requiredFields = Object.entries(validationSchema)
    .filter(([_, rule]) => rule?.required)
    .map(([field]) => field);

  return (
    <Paper {...paperProps}>
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        {/* Form Header */}
        {title && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            
            {showRequiredIndicator && requiredFields.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Los campos marcados con * son obligatorios
              </Typography>
            )}
            
            {/* Progress Bar */}
            {showProgress && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progreso del formulario
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(formProgress)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={formProgress}
                  color={formProgress === 100 ? 'success' : 'primary'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Auto-save indicator */}
        {autoSave && (
          <Box sx={{ mb: 2 }}>
            <Chip
              icon={autoSaveInProgress ? <SaveIcon /> : <CheckCircleIcon />}
              label={autoSaveInProgress ? 'Guardando...' : 'Guardado automático activo'}
              size="small"
              color={autoSaveInProgress ? 'warning' : 'success'}
              variant="outlined"
            />
          </Box>
        )}

        {/* Error Summary */}
        {showErrorSummary && errorSummary.length > 0 && (
          <Collapse in={errorSummary.length > 0}>
            <Alert 
              severity="error" 
              icon={<ErrorIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Por favor corrige los siguientes errores:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {errorSummary.map((error, index) => (
                  <Typography component="li" variant="body2" key={index}>
                    {error}
                  </Typography>
                ))}
              </Box>
            </Alert>
          </Collapse>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {submitSuccess}
          </Alert>
        )}

        {/* Error Message */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {/* Form Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
          {children?.({
            formData,
            validation,
            getFieldProps,
            handleFieldChange,
            handleFieldBlur,
            isFormValid,
            isFormValidating
          })}
        </Box>

        {/* Form Actions */}
        <Box sx={{ 
          mt: 4, 
          display: 'flex', 
          justifyContent: 'flex-end',
          gap: 2
        }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid || isSubmitting || isFormValidating}
            startIcon={isSubmitting ? <SaveIcon /> : <CheckCircleIcon />}
            sx={{
              minWidth: 120,
              transition: 'all 0.2s ease',
              ...(isFormValid && !isSubmitting && {
                backgroundColor: 'success.main',
                '&:hover': {
                  backgroundColor: 'success.dark'
                }
              })
            }}
          >
            {isSubmitting ? 'Guardando...' : submitLabel}
          </Button>
        </Box>

        {/* Form Validation Summary */}
        {showProgress && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {Object.values(validation).filter(f => f.touched && f.isValid).length} de {Object.keys(validationSchema).length} campos válidos
            </Typography>
            {isFormValidating && (
              <Chip label="Validando..." size="small" color="primary" />
            )}
            {isFormValid && formProgress === 100 && (
              <Chip 
                icon={<CheckCircleIcon />}
                label="Formulario válido" 
                size="small" 
                color="success" 
              />
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ValidatedForm;
