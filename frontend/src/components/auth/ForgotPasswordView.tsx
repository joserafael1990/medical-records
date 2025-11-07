import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Link as MuiLink
} from '@mui/material';
import { ArrowBack, Email as EmailIcon } from '@mui/icons-material';
import CortexLogo from '../common/CortexLogo';
import { apiService } from '../../services';
import { useScrollToError } from '../../hooks/useScrollToError';

const ForgotPasswordView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-scroll to error when it appears
  const errorRef = useScrollToError(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.auth.requestPasswordReset(email);
      setSuccess(true);
      setError('');
    } catch (error: any) {
      // El backend siempre retorna éxito por seguridad, pero podemos manejar errores de red
      if (error.response?.status >= 500) {
        setError('Error del servidor. Por favor, intenta más tarde.');
      } else {
        // Por seguridad, mostrar mensaje de éxito aunque haya error
        setSuccess(true);
      }
    } finally {
      setIsLoading(false);
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

          {success ? (
            <>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <EmailIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" component="h1" gutterBottom>
                  Correo Enviado
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revisa tu bandeja de entrada y carpeta de spam.
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
                Volver al Login
              </Button>
            </>
          ) : (
            <>
              <Typography component="h1" variant="h5" gutterBottom>
                Recuperar Contraseña
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
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
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <EmailIcon />}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
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

export default ForgotPasswordView;

