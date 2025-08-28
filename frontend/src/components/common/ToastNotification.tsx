import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Slide,
  Fade
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Provider de notificaciones toast para toda la aplicación
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title, duration: 8000 });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title, duration: 6000 });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <SuccessIcon />;
      case 'error': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      case 'info': return <InfoIcon />;
      default: return null;
    }
  };

  return (
    <ToastContext.Provider value={{
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      hideToast,
      hideAllToasts
    }}>
      {children}
      
      {/* Render toasts */}
      <Box
        sx={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 400,
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast, index) => (
          <Slide
            key={toast.id}
            direction="left"
            in={true}
            timeout={300}
          >
            <Box sx={{ pointerEvents: 'auto' }}>
              <Alert
                severity={toast.type}
                variant="filled"
                icon={getToastIcon(toast.type)}
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(10px)',
                  minWidth: 300,
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {toast.action && (
                      <IconButton
                        size="small"
                        onClick={toast.action.onClick}
                        sx={{ color: 'inherit' }}
                      >
                        {toast.action.label}
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => hideToast(toast.id)}
                      sx={{ color: 'inherit' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                {toast.title && (
                  <AlertTitle sx={{ mb: toast.message ? 1 : 0 }}>
                    {toast.title}
                  </AlertTitle>
                )}
                {toast.message}
              </Alert>
            </Box>
          </Slide>
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

/**
 * Hook para usar las notificaciones toast
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Hook simplificado para casos comunes
 */
export const useSimpleToast = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  return {
    success: (message: string) => showSuccess(message),
    error: (message: string) => showError(message),
    warning: (message: string) => showWarning(message),
    info: (message: string) => showInfo(message)
  };
};
