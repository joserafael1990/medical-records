import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  FormHelperText,
  LinearProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

interface AccountInfoStepProps {
  formData: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  onInputChange: (field: string, value: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  passwordValidation: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
  fieldErrors: Record<string, string>;
}

export const AccountInfoStep: React.FC<AccountInfoStepProps> = ({
  formData,
  onInputChange,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordValidation,
  fieldErrors
}) => {
  const getPasswordStrength = () => {
    const validations = Object.values(passwordValidation);
    const validCount = validations.filter(Boolean).length;
    return (validCount / validations.length) * 100;
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength < 40) return 'error';
    if (strength < 80) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" gutterBottom>
        Información de Cuenta
      </Typography>
      
      {/* Email Field */}
      <TextField
        label="Correo Electrónico"
        type="email"
        value={formData.email}
        onChange={(e) => onInputChange('email', e.target.value)}
        error={!!fieldErrors.email}
        helperText={fieldErrors.email}
        fullWidth
        required
      />
      
      {/* Password Field */}
      <Box>
        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => onInputChange('password', e.target.value)}
          error={!!fieldErrors.password}
          helperText={fieldErrors.password}
          fullWidth
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        {/* Password Strength Indicator */}
        {formData.password && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={getPasswordStrength()}
              color={getPasswordStrengthColor() as any}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Fortaleza de la contraseña: {Math.round(getPasswordStrength())}%
            </Typography>
          </Box>
        )}
        
        {/* Password Requirements */}
        {formData.password && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Requisitos de la contraseña:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {[
                { key: 'minLength', text: 'Al menos 8 caracteres' },
                { key: 'hasUppercase', text: 'Al menos una mayúscula' },
                { key: 'hasLowercase', text: 'Al menos una minúscula' },
                { key: 'hasNumbers', text: 'Al menos un número' },
                { key: 'hasSpecialChars', text: 'Al menos un carácter especial' }
              ].map(({ key, text }) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {passwordValidation[key as keyof typeof passwordValidation] ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <Cancel color="error" fontSize="small" />
                  )}
                  <Typography
                    variant="body2"
                    color={passwordValidation[key as keyof typeof passwordValidation] ? 'success.main' : 'error.main'}
                  >
                    {text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
      
      {/* Confirm Password Field */}
      <TextField
        label="Confirmar Contraseña"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={(e) => onInputChange('confirmPassword', e.target.value)}
        error={!!fieldErrors.confirmPassword}
        helperText={fieldErrors.confirmPassword}
        fullWidth
        required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      
      {/* Password Match Indicator */}
      {formData.confirmPassword && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {formData.password === formData.confirmPassword ? (
            <CheckCircle color="success" fontSize="small" />
          ) : (
            <Cancel color="error" fontSize="small" />
          )}
          <Typography
            variant="body2"
            color={formData.password === formData.confirmPassword ? 'success.main' : 'error.main'}
          >
            {formData.password === formData.confirmPassword ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
