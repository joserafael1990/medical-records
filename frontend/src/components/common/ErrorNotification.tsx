/**
 * Enhanced Error Notification System
 * Sistema de notificaciones de error mejorado para la aplicación médica
 */

import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Button,
  Box,
  Typography,
  Collapse,
  IconButton,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RetryIcon,
  ContentCopy as CopyIcon,
  BugReport as BugIcon
} from '@mui/icons-material';
import { ParsedError } from '../../utils/errorHandler';

interface ErrorNotificationProps {
  error: ParsedError | null;
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
  context?: Record<string, any>;
  showDetails?: boolean;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  open,
  onClose,
  onRetry,
  context,
  showDetails = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!error) return null;

  const handleCopyError = async () => {
    const errorDetails = {
      message: error.message,
      errorCode: error.errorCode,
      timestamp: new Date().toISOString(),
      context: context,
      details: error.details
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'error';
    }
  };

  const getAutoHideDuration = () => {
    if (error.severity === 'error') return null; // Don't auto-hide errors
    if (error.severity === 'warning') return 8000;
    return 5000;
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={getAutoHideDuration()}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ maxWidth: '90vw' }}
    >
      <Alert
        severity={getSeverityColor(error.severity) as any}
        onClose={onClose}
        sx={{
          width: '100%',
          maxWidth: 600,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {error.isRetryable && onRetry && (
              <Button
                color="inherit"
                size="small"
                onClick={onRetry}
                startIcon={<RetryIcon />}
              >
                Reintentar
              </Button>
            )}
            {showDetails && (
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        }
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>Error del Sistema</span>
          <Chip
            label={error.errorCode}
            size="small"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </AlertTitle>

        <Typography variant="body2" sx={{ mb: showDetails ? 1 : 0 }}>
          {error.userFriendlyMessage}
        </Typography>

        {/* Field-level errors */}
        {error.fieldErrors && Object.keys(error.fieldErrors).length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="inherit" sx={{ fontWeight: 'bold' }}>
              Errores de campos:
            </Typography>
            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
              {Object.entries(error.fieldErrors).map(([field, message]) => (
                <li key={field}>
                  <Typography variant="caption" color="inherit">
                    <strong>{field}:</strong> {message}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {/* Detailed error information */}
        {showDetails && (
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BugIcon fontSize="small" />
                  Detalles Técnicos
                </Typography>
                <Button
                  size="small"
                  onClick={handleCopyError}
                  startIcon={<CopyIcon />}
                  sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </Box>
              
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <Typography variant="caption" color="inherit">
                  <strong>Código:</strong> {error.errorCode}
                </Typography>
                <br />
                <Typography variant="caption" color="inherit">
                  <strong>Mensaje:</strong> {error.message}
                </Typography>
                <br />
                <Typography variant="caption" color="inherit">
                  <strong>Severidad:</strong> {error.severity}
                </Typography>
                <br />
                <Typography variant="caption" color="inherit">
                  <strong>Reintentar:</strong> {error.isRetryable ? 'Sí' : 'No'}
                </Typography>
                
                {error.details && Object.keys(error.details).length > 0 && (
                  <>
                    <br />
                    <Typography variant="caption" color="inherit">
                      <strong>Detalles:</strong>
                    </Typography>
                    <pre style={{ 
                      margin: '4px 0', 
                      fontSize: '0.7rem', 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </>
                )}
                
                {context && Object.keys(context).length > 0 && (
                  <>
                    <Typography variant="caption" color="inherit">
                      <strong>Contexto:</strong>
                    </Typography>
                    <pre style={{ 
                      margin: '4px 0', 
                      fontSize: '0.7rem', 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(context, null, 2)}
                    </pre>
                  </>
                )}
              </Box>
            </Box>
          </Collapse>
        )}
      </Alert>
    </Snackbar>
  );
};

// Hook for managing error notifications
export const useErrorNotification = () => {
  const [error, setError] = useState<ParsedError | null>(null);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<Record<string, any>>({});

  const showError = (parsedError: ParsedError, errorContext?: Record<string, any>) => {
    setError(parsedError);
    setContext(errorContext || {});
    setOpen(true);
  };

  const hideError = () => {
    setOpen(false);
    // Clear error after animation completes
    setTimeout(() => {
      setError(null);
      setContext({});
    }, 300);
  };

  return {
    error,
    open,
    context,
    showError,
    hideError
  };
};

export default ErrorNotification;
