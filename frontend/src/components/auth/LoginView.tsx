import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Avatar,
  IconButton,
  InputAdornment,
  Collapse
} from '@mui/material';
import { 
  LockOutlined, 
  Visibility, 
  VisibilityOff,
  Warning as WarningIcon
} from '@mui/icons-material';
import CortexLogo from '../common/CortexLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollToError } from '../../hooks/useScrollToError';

const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<string>('');
  const { login, isLoading, setShowRegister } = useAuth();
  
  // Auto-scroll to error when it appears
  const errorRef = useScrollToError(error);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Clear previous errors
    setError('');
    setErrorType('');
    

    if (!email || !password) {
      const validationError = 'Por favor, ingresa tu correo electrónico y contraseña';
      setError(validationError);
      setErrorType('validation');
      return;
    }

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Success - user will be redirected by AuthContext
      } else {
        // Handle login failure
        setError(result.error || 'Credenciales incorrectas. Por favor, verifica tu email y contraseña.');
        setErrorType(result.errorType || 'credentials');
      }
    } catch (error: any) {
      // Handle unexpected errors
      if (error && error.detail) {
        setError('Error de autenticación: ' + error.detail);
      } else if (error && error.status === 401) {
        setError('Credenciales incorrectas. Por favor, verifica tu email y contraseña.');
      } else {
        setError('Error inesperado durante el inicio de sesión');
      }
      
      setErrorType('unexpected');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}
        >
          <Box sx={{ mb: 4 }}>
            <CortexLogo variant="full" sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>

          {/* Error Display with Context */}
          <Collapse in={!!error}>
            <Alert 
              ref={errorRef}
              severity={errorType === 'validation' ? 'warning' : 'error'}
              sx={{ width: '100%', mb: 2 }}
              icon={errorType === 'validation' ? <WarningIcon /> : undefined}
              action={undefined}
            >
              <Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {error}
                </Typography>
                
              </Box>
            </Alert>
          </Collapse>

          <Box 
            component="form" 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(e);
              return false;
            }}
            noValidate
            autoComplete="off"
            sx={{ mt: 1, width: '100%' }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ¿No tienes una cuenta?
            </Typography>
            <Button 
              variant="text" 
              onClick={() => setShowRegister(true)}
              sx={{ 
                color: 'primary.main',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.95rem'
              }}
            >
              Crear Cuenta
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              Sistema de Gestión de Historias Clínicas
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginView;
