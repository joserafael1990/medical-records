import React, { useState, useEffect } from 'react';
import {
  TextField,
  TextFieldProps,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Fade,
  Box
} from '@mui/material';
import {
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export interface ValidatedTextFieldProps extends Omit<TextFieldProps, 'error' | 'helperText' | 'color'> {
  // Validation props
  validationState?: {
    isValid: boolean;
    isValidating: boolean;
    error: string | null;
    warning: string | null;
    touched: boolean;
  };
  
  // Custom validation props
  showValidationIcon?: boolean;
  showLoadingIcon?: boolean;
  validationColor?: 'primary' | 'success' | 'warning' | 'error';
  
  // Enhanced features
  showPasswordToggle?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  infoTooltip?: string;
  
  // Callbacks
  onValidationChange?: (isValid: boolean, error: string | null) => void;
  onFieldTouched?: () => void;
  
  // Auto-save
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (value: string) => void;
  
  // Custom helper text
  customHelperText?: string;
  persistentHelperText?: boolean;
}

const ValidatedTextField: React.FC<ValidatedTextFieldProps> = ({
  validationState,
  showValidationIcon = true,
  showLoadingIcon = true,
  validationColor,
  showPasswordToggle = false,
  maxLength,
  showCharacterCount = false,
  infoTooltip,
  onValidationChange,
  onFieldTouched,
  autoSave = false,
  autoSaveDelay = 2000,
  onAutoSave,
  customHelperText,
  persistentHelperText = false,
  type: originalType = 'text',
  value = '',
  onChange,
  onBlur,
  onFocus,
  ...textFieldProps
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const isPasswordField = originalType === 'password';
  const currentType = isPasswordField && showPassword ? 'text' : originalType;

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && onAutoSave && typeof value === 'string' && value.length > 0) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      const timeout = setTimeout(() => {
        onAutoSave(value);
      }, autoSaveDelay);
      
      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [value, autoSave, onAutoSave, autoSaveDelay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validation change callback
  useEffect(() => {
    if (onValidationChange && validationState) {
      onValidationChange(validationState.isValid, validationState.error);
    }
  }, [validationState?.isValid, validationState?.error, onValidationChange]);

  // Determine colors and states
  const getFieldColor = (): 'primary' | 'success' | 'warning' | 'error' => {
    if (validationColor) return validationColor;
    if (!validationState) return 'primary';
    
    if (validationState.isValidating) return 'primary';
    if (validationState.error) return 'error';
    if (validationState.warning) return 'warning';
    if (validationState.touched && validationState.isValid) return 'success';
    
    return 'primary';
  };

  const getHelperText = (): string => {
    if (customHelperText && (persistentHelperText || !validationState?.error)) {
      return customHelperText;
    }
    
    if (!validationState) return '';
    
    if (validationState.isValidating) return 'Validando...';
    if (validationState.error) return validationState.error;
    if (validationState.warning) return validationState.warning;
    if (validationState.touched && validationState.isValid) return '✓ Válido';
    
    return '';
  };

  const getValidationIcon = () => {
    if (!showValidationIcon || !validationState) return null;
    
    if (validationState.isValidating && showLoadingIcon) {
      return <CircularProgress size={20} color="primary" />;
    }
    
    if (validationState.error) {
      return <ErrorIcon color="error" />;
    }
    
    if (validationState.warning) {
      return <WarningIcon color="warning" />;
    }
    
    if (validationState.touched && validationState.isValid) {
      return <CheckIcon color="success" />;
    }
    
    return null;
  };

  // Character count
  const characterCount = typeof value === 'string' ? value.length : 0;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  // Event handlers
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Enforce max length if specified
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onFieldTouched?.();
    onBlur?.(event);
  };

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Build end adornment
  const endAdornmentElements = [];

  // Character count
  if (showCharacterCount && maxLength) {
    endAdornmentElements.push(
      <Box
        key="char-count"
        sx={{
          fontSize: '0.75rem',
          color: isOverLimit ? 'error.main' : 'text.secondary',
          fontWeight: isOverLimit ? 'bold' : 'normal'
        }}
      >
        {characterCount}/{maxLength}
      </Box>
    );
  }

  // Info tooltip
  if (infoTooltip) {
    endAdornmentElements.push(
      <Tooltip key="info" title={infoTooltip} arrow>
        <IconButton size="small" edge="end">
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  }

  // Validation icon
  const validationIcon = getValidationIcon();
  if (validationIcon) {
    endAdornmentElements.push(
      <Fade key="validation" in={true} timeout={200}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {validationIcon}
        </Box>
      </Fade>
    );
  }

  // Password toggle
  if (isPasswordField && showPasswordToggle) {
    endAdornmentElements.push(
      <Tooltip key="password-toggle" title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <IconButton
          size="small"
          edge="end"
          onClick={togglePasswordVisibility}
        >
          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>
      </Tooltip>
    );
  }

  const endAdornment = endAdornmentElements.length > 0 ? (
    <InputAdornment position="end">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {endAdornmentElements}
      </Box>
    </InputAdornment>
  ) : textFieldProps.InputProps?.endAdornment;

  return (
    <TextField
      {...textFieldProps}
      type={currentType}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      color={getFieldColor()}
      error={!!validationState?.error}
      helperText={getHelperText()}
      InputProps={{
        ...textFieldProps.InputProps,
        endAdornment
      }}
      sx={{
        ...textFieldProps.sx,
        '& .MuiOutlinedInput-root': {
          transition: 'all 0.2s ease',
          ...(isFocused && {
            '& fieldset': {
              borderWidth: 2
            }
          }),
          ...(validationState?.isValid && validationState.touched && {
            '& fieldset': {
              borderColor: 'success.main'
            }
          }),
          ...(validationState?.error && {
            '& fieldset': {
              borderColor: 'error.main'
            }
          }),
          ...(validationState?.warning && {
            '& fieldset': {
              borderColor: 'warning.main'
            }
          })
        },
        '& .MuiFormHelperText-root': {
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          transition: 'all 0.2s ease'
        }
      }}
    />
  );
};

export default ValidatedTextField;
