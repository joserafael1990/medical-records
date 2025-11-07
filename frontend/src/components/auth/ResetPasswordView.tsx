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
  InputAdornment,
  IconButton,
  Link as MuiLink
} from '@mui/material';
import { 
  ArrowBack,
  Visibility,
  VisibilityOff,
  CheckCircle as CheckCircleIcon,
  LockReset as LockResetIcon
} from '@mui/icons-material';
import CortexLogo from '../common/CortexLogo';
import { apiService } from '../../services';
import { useScrollToError } from '../../hooks/useScrollToError';

const ResetPasswordView: React.FC = () => {
  // Get token from URL query params manually
  const getTokenFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  };
  const [token] = React.useState(getTokenFromUrl());
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-scroll to error when it appears
  const errorRef = useScrollToError(error);

  useEffect(() => {
    if (!token) {
      setError('Token inválido o faltante. Por favor, solicita un nuevo enlace de recuperación.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token inválido o faltante.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Por favor, completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.auth.confirmPasswordReset(token, newPassword, confirmPassword);
      setSuccess(true);
      setError('');
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 3000);
    } catch (error: any) {
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (error.response?.status === 400) {
        setError('Token inválido o expirado. Por favor, solicita un nuevo enlace de recuperación.');
      } else {
        setError('Error al restablecer la contraseña. Por favor, intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
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
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              Token inválido o faltante. Por favor, solicita un nuevo enlace de recuperación.
            </Alert>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                window.history.pushState({}, '', '/forgot-password');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              startIcon={<ArrowBack />}
            >
              Solicitar Nuevo Enlace
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

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

          {success ? (
            <>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" component="h1" gutterBottom>
                  ¡Contraseña Restablecida!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Tu contraseña ha sido restablecida exitosamente.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Serás redirigido al login en unos momentos...
                </Typography>
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  window.history.pushState({}, '', '/login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                sx={{ mt: 2 }}
              >
                Ir al Login
              </Button>
            </>
          ) : (
            <>
              <LockResetIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
              <Typography component="h1" variant="h5" gutterBottom>
                Restablecer Contraseña
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Ingresa tu nueva contraseña
              </Typography>

              {error && (
                <Alert 
                  ref={errorRef}
                  severity="error" 
                  sx={{ width: '100%', mb: 2 }}
                >
                  {error}
                </Alert>
              )}

              <Box 
                component="form" 
                onSubmit={handleSubmit}
                noValidate
                sx={{ mt: 1, width: '100%' }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="newPassword"
                  label="Nueva Contraseña"
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  helperText="Mínimo 6 caracteres"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirmar Nueva Contraseña"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <LockResetIcon />}
                >
                  {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <MuiLink
                    component="button"
                    variant="body2"
                    onClick={() => {
                      window.history.pushState({}, '', '/login');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5
                    }}
                  >
                    <ArrowBack sx={{ fontSize: 16 }} />
                    Volver al Login
                  </MuiLink>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPasswordView;

