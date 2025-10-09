/**
 * Componente integrado de display de errores mejorado
 * Combina todas las mejoras UX: loading states, validación en tiempo real,
 * navegación de errores y mensajes humanizados
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RetryIcon,
  NavigateNext as NavigateIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { LoadingStateDisplay } from './LoadingStates';
import { useLoadingStates, LoadingContext } from '../../hooks/useLoadingStates';
import { useFormErrorNavigation } from '../../hooks/useFormErrorNavigation';
import { useRealTimeValidation, ValidationResult } from '../../hooks/useRealTimeValidation';
import {
  createHumanizedErrorMessage,
  detectMedicalContext,
  HumanizedErrorMessage,
  ErrorContext,
  MedicalContext
} from '../../utils/medicalErrorMessages';

interface EnhancedErrorDisplayProps {
  // Error information
  error?: any;
  fieldErrors?: Record<string, string>;
  validationErrors?: Record<string, ValidationResult>;
  
  // Loading states
  loadingContext?: string;
  loadingStates?: Record<string, LoadingContext>;
  
  // Display options
  showDetails?: boolean;
  showRetry?: boolean;
  showNavigation?: boolean;
  showProgress?: boolean;
  autoNavigateToError?: boolean;
  
  // Medical context
  medicalContext?: MedicalContext;
  userRole?: string;
  patientPresent?: boolean;
  isUrgent?: boolean;
  
  // Callbacks
  onRetry?: () => void;
  onClose?: () => void;
  onNavigateToError?: (fieldName: string) => void;
  onShowDetails?: () => void;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  fieldErrors = {},
  validationErrors = {},
  loadingContext,
  loadingStates,
  showDetails = false,
  showRetry = true,
  showNavigation = true,
  showProgress = true,
  autoNavigateToError = true,
  medicalContext,
  userRole,
  patientPresent = false,
  isUrgent = false,
  onRetry,
  onClose,
  onNavigateToError,
  onShowDetails
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [humanizedMessage, setHumanizedMessage] = useState<HumanizedErrorMessage | null>(null);

  const { loadingStates: globalLoadingStates } = useLoadingStates();
  const {
    scrollToFirstError,
    scrollToField,
    getErrorSummary,
    findErrorFields
  } = useFormErrorNavigation();

  // Determine which loading states to use
  const currentLoadingStates = loadingStates || globalLoadingStates;
  const currentLoadingContext = loadingContext ? 
    currentLoadingStates[loadingContext as keyof typeof currentLoadingStates] : 
    null;

  // Auto-detect medical context if not provided
  useEffect(() => {
    if (error && !humanizedMessage) {
      const detectedContext = detectMedicalContext(
        window.location.pathname,
        userRole,
        undefined
      );

      const errorContext: ErrorContext = {
        medicalContext: medicalContext || detectedContext.medicalContext || 'routine',
        severity: error.severity || 'medium',
        userRole: userRole as any || detectedContext.userRole,
        timeOfDay: detectedContext.timeOfDay,
        patientPresent,
        isUrgent,
        retryCount: error.retryCount || 0
      };

      const humanized = createHumanizedErrorMessage(
        error.code || 'general',
        errorContext,
        error
      );

      setHumanizedMessage(humanized);
    }
  }, [error, medicalContext, userRole, patientPresent, isUrgent, humanizedMessage]);

  // Auto-navigate to first error
  useEffect(() => {
    if (autoNavigateToError && (Object.keys(fieldErrors).length > 0 || Object.keys(validationErrors).length > 0)) {
      const navigated = scrollToFirstError(fieldErrors, validationErrors);
      if (!navigated) {
        console.warn('Could not navigate to first error');
      }
    }
  }, [fieldErrors, validationErrors, autoNavigateToError, scrollToFirstError]);

  // Get error summary
  const errorSummary = getErrorSummary(fieldErrors, validationErrors);

  // Determine display priority: Loading > Humanized Error > Field Errors > Success
  const getDisplayPriority = () => {
    if (currentLoadingContext && (currentLoadingContext.state === 'loading' || currentLoadingContext.state === 'retrying')) {
      return 'loading';
    }
    
    if (humanizedMessage && error) {
      return 'humanized_error';
    }
    
    if (errorSummary.totalIssues > 0) {
      return 'field_errors';
    }
    
    if (currentLoadingContext && currentLoadingContext.state === 'success') {
      return 'success';
    }
    
    return 'none';
  };

  const displayPriority = getDisplayPriority();

  if (displayPriority === 'none') {
    return null;
  }

  // Loading state display
  if (displayPriority === 'loading' && currentLoadingContext) {
    return (
      <LoadingStateDisplay
        context={currentLoadingContext}
        contextType={loadingContext || 'loading'}
        onRetry={onRetry}
        showProgress={showProgress}
      />
    );
  }

  // Success state display
  if (displayPriority === 'success' && currentLoadingContext) {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SuccessIcon sx={{ mr: 1 }} />
          <Typography variant="body2">
            {currentLoadingContext.message || '¡Operación completada exitosamente!'}
          </Typography>
        </Box>
      </Alert>
    );
  }

  // Humanized error display
  if (displayPriority === 'humanized_error' && humanizedMessage) {
    return (
      <>
        <Alert 
          severity={humanizedMessage.urgencyLevel === 'immediate' ? 'error' : 'warning'}
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {showRetry && onRetry && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={onRetry}
                  startIcon={<RetryIcon />}
                >
                  {humanizedMessage.action}
                </Button>
              )}
              {showDetails && (
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => setShowDetailDialog(true)}
                >
                  <InfoIcon />
                </IconButton>
              )}
              {onClose && (
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={onClose}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
          }
        >
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{humanizedMessage.icon}</span>
            <span>{humanizedMessage.title}</span>
            {humanizedMessage.urgencyLevel === 'immediate' && (
              <Chip
                label="URGENTE"
                size="small"
                color="error"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </AlertTitle>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            {humanizedMessage.message}
          </Typography>
          
          {humanizedMessage.empathy && (
            <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
              {humanizedMessage.empathy}
            </Typography>
          )}
        </Alert>

        {/* Detail Dialog */}
        <Dialog 
          open={showDetailDialog} 
          onClose={() => setShowDetailDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Detalles del Problema Técnico
            <IconButton
              sx={{ position: 'absolute', right: 8, top: 8 }}
              onClick={() => setShowDetailDialog(false)}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {humanizedMessage.medicalGuidance && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Guía Médica:</strong> {humanizedMessage.medicalGuidance}
                </Typography>
              </Alert>
            )}
            
            <Typography variant="body2" paragraph>
              <strong>Contexto:</strong> {medicalContext || 'General'}
            </Typography>
            
            <Typography variant="body2" paragraph>
              <strong>Nivel de Urgencia:</strong> {humanizedMessage.urgencyLevel}
            </Typography>
            
            {humanizedMessage.alternative && (
              <Typography variant="body2" paragraph>
                <strong>Soporte:</strong> {humanizedMessage.alternative}
              </Typography>
            )}
            
            {error && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Información técnica:
                </Typography>
                <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
                  {JSON.stringify(error, null, 2)}
                </pre>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetailDialog(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Field errors display
  if (displayPriority === 'field_errors') {
    return (
      <Alert 
        severity={errorSummary.totalErrors > 0 ? 'error' : 'warning'}
        sx={{ mb: 2 }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {showNavigation && errorSummary.firstError && (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  if (errorSummary.firstError) {
                    scrollToField(errorSummary.firstError.fieldName);
                    onNavigateToError?.(errorSummary.firstError.fieldName);
                  }
                }}
                startIcon={<NavigateIcon />}
              >
                Ir al Error
              </Button>
            )}
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>
          {errorSummary.totalErrors > 0 ? (
            <>❌ {errorSummary.totalErrors} Error{errorSummary.totalErrors !== 1 ? 'es' : ''} en el Formulario</>
          ) : (
            <>⚠️ {errorSummary.totalWarnings} Advertencia{errorSummary.totalWarnings !== 1 ? 's' : ''}</>
          )}
        </AlertTitle>
        
        <Typography variant="body2">
          {errorSummary.totalErrors > 0 
            ? 'Por favor revisa y corrige los campos marcados para continuar.'
            : 'Hay algunas recomendaciones para mejorar la información.'
          }
        </Typography>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <List dense>
              {errorSummary.allErrors.map((errorField, index) => (
                <ListItem 
                  key={`${errorField.fieldName}-${index}`}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    scrollToField(errorField.fieldName);
                    onNavigateToError?.(errorField.fieldName);
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    {errorField.severity === 'error' ? (
                      <ErrorIcon color="error" fontSize="small" />
                    ) : (
                      <WarningIcon color="warning" fontSize="small" />
                    )}
                  </Box>
                  <ListItemText
                    primary={errorField.fieldName.replace(/_/g, ' ').toUpperCase()}
                    secondary={errorField.message}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>
      </Alert>
    );
  }

  return null;
};

export default EnhancedErrorDisplay;




















