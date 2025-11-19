import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import * as Sentry from '@sentry/react';
import { safeConsoleError } from '../../utils/errorHandling';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error safely with better serialization
    try {
      const errorDetails = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack || 'No stack trace',
        componentStack: errorInfo?.componentStack || 'No component stack'
      };
      
      safeConsoleError('React Error Boundary caught an error:', errorDetails);
      console.error('Full error object:', error);
      console.error('Error Info:', errorInfo);
      
      // Capturar error en Sentry y mostrar diálogo de feedback en español
      if (process.env.REACT_APP_SENTRY_DSN) {
        const eventId = Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
        
        // Mostrar diálogo de feedback con textos en español
        setTimeout(() => {
          Sentry.showReportDialog({
            eventId,
            title: '¡Oops! Algo salió mal',
            subtitle: 'Por favor, ayúdanos a mejorar reportando este error.',
            subtitle2: 'Tu feedback es muy valioso para nosotros.',
            labelName: 'Nombre',
            labelEmail: 'Email',
            labelComments: '¿Qué estabas haciendo cuando ocurrió el error?',
            labelClose: 'Cerrar',
            labelSubmit: 'Enviar reporte',
            errorGeneric: 'Ocurrió un error al enviar el reporte. Por favor, inténtalo de nuevo.',
            errorFormEntry: 'Algunos campos son inválidos. Por favor, corrígelos e inténtalo de nuevo.',
            successMessage: '¡Gracias por tu reporte! Nos ayudará a mejorar la aplicación.',
          });
        }, 500);
      }
    } catch (logError) {
      // Fallback if logging fails
      console.error('Error in ErrorBoundary logging:', logError);
      console.error('Original error message:', error?.message || String(error));
    }
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            p: 2 
          }}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              maxWidth: 600, 
              textAlign: 'center' 
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              ⚠️ Error en la aplicación
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="h6" color="error" gutterBottom>
                  Detalles del error (desarrollo):
                </Typography>
                <Paper 
                  sx={{ 
                    p: 2, 
                    backgroundColor: '#f5f5f5',
                    overflow: 'auto',
                    maxHeight: 200 
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
                    {(() => {
                      const error = this.state.error;
                      if (!error) return 'Error desconocido';
                      
                      // Safe error message extraction
                      let errorMessage = 'Error desconocido';
                      try {
                        if (error.message) {
                          errorMessage = error.message;
                        } else if (typeof error === 'string') {
                          errorMessage = error;
                        } else if (typeof error === 'object') {
                          // Try to extract meaningful info from object
                          errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
                        } else {
                          errorMessage = String(error);
                        }
                      } catch (e) {
                        errorMessage = String(error);
                      }
                      
                      return errorMessage + (error.stack ? `\n\nStack trace:\n${error.stack}` : '');
                    })()}
                  </Typography>
                </Paper>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                onClick={this.handleReload}
                color="primary"
              >
                Recargar página
              </Button>
              <Button 
                variant="outlined" 
                onClick={this.handleReset}
                color="secondary"
              >
                Intentar de nuevo
              </Button>
              {process.env.REACT_APP_SENTRY_DSN && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Mostrar diálogo de feedback manualmente con textos en español
                    const eventId = this.state.error 
                      ? Sentry.captureException(this.state.error)
                      : Sentry.captureMessage('User reported error from ErrorBoundary');
                    
                    Sentry.showReportDialog({
                      eventId,
                      title: 'Reportar error',
                      subtitle: 'Por favor, ayúdanos a mejorar reportando este error.',
                      subtitle2: 'Tu feedback es muy valioso para nosotros.',
                      labelName: 'Nombre',
                      labelEmail: 'Email',
                      labelComments: '¿Qué estabas haciendo cuando ocurrió el error?',
                      labelClose: 'Cerrar',
                      labelSubmit: 'Enviar reporte',
                      errorGeneric: 'Ocurrió un error al enviar el reporte. Por favor, inténtalo de nuevo.',
                      errorFormEntry: 'Algunos campos son inválidos. Por favor, corrígelos e inténtalo de nuevo.',
                      successMessage: '¡Gracias por tu reporte! Nos ayudará a mejorar la aplicación.',
                    });
                  }}
                  color="info"
                >
                  Reportar error
                </Button>
              )}
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
