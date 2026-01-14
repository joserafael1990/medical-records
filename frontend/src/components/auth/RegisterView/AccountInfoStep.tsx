import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  LinearProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

interface AccountInfoStepProps {
  email: string;
  password: string;
  confirmPassword: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
}

const validatePassword = (password: string): PasswordValidation => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
};

const getPasswordStrength = (validation: PasswordValidation): number => {
  const criteria = Object.values(validation);
  return criteria.filter(Boolean).length;
};

export const AccountInfoStep: React.FC<AccountInfoStepProps> = ({
  email,
  password,
  confirmPassword,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordStrength = getPasswordStrength(passwordValidation);

  return (
    <Box>
      <TextField
        fullWidth
        margin="normal"
        label="Correo Electrónico"
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        required
        autoComplete="email"
      />
      
      <TextField
        fullWidth
        margin="normal"
        label="Contraseña"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
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
          ),
        }}
      />

      {password && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Fortaleza de la contraseña:
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(passwordStrength / 5) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                backgroundColor: passwordStrength < 3 ? 'error.main' : 
                                passwordStrength < 4 ? 'warning.main' : 'success.main'
              }
            }}
          />
          <Box sx={{ mt: 1 }}>
            {Object.entries({
              'Al menos 8 caracteres': passwordValidation.minLength,
              'Una letra mayúscula': passwordValidation.hasUppercase,
              'Una letra minúscula': passwordValidation.hasLowercase,
              'Un número': passwordValidation.hasNumbers,
              'Un carácter especial': passwordValidation.hasSpecialChars
            }).map(([criterion, met]) => (
              <Box key={criterion} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                {met ? (
                  <CheckCircle sx={{ color: 'success.main', fontSize: 16, mr: 1 }} />
                ) : (
                  <Cancel sx={{ color: 'error.main', fontSize: 16, mr: 1 }} />
                )}
                <Typography variant="caption" color={met ? 'success.main' : 'error.main'}>
                  {criterion}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <TextField
        fullWidth
        margin="normal"
        label="Confirmar Contraseña"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
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
          ),
        }}
      />
    </Box>
  );
};
