import React from 'react';
import {
  Box,
  CircularProgress,
  Skeleton,
  Typography,
  Button,
  Alert
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface SmartLoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  children: React.ReactNode;
  loadingType?: 'spinner' | 'skeleton' | 'custom';
  loadingMessage?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  onRetry?: () => void;
  customLoadingComponent?: React.ReactNode;
  skeletonRows?: number;
}

/**
 * Componente inteligente para manejar estados de carga, error y vacío
 * Proporciona una UX consistente en toda la aplicación
 */
export const SmartLoadingState: React.FC<SmartLoadingStateProps> = ({
  isLoading,
  error,
  isEmpty = false,
  children,
  loadingType = 'spinner',
  loadingMessage = 'Cargando...',
  emptyMessage = 'No hay datos disponibles',
  emptyTitle = 'Sin resultados',
  onRetry,
  customLoadingComponent,
  skeletonRows = 3
}) => {
  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            onRetry && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
                sx={{ color: 'error.main' }}
              >
                Reintentar
              </Button>
            )
          }
        >
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    if (customLoadingComponent) {
      return <>{customLoadingComponent}</>;
    }

    if (loadingType === 'skeleton') {
      return (
        <Box sx={{ p: 2 }}>
          {[...Array(skeletonRows)].map((_, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Box>
      );
    }

    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        minHeight: 200
      }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {loadingMessage}
        </Typography>
      </Box>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        p: 4,
        color: 'text.secondary'
      }}>
        <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
          {emptyTitle}
        </Typography>
        <Typography variant="body2">
          {emptyMessage}
        </Typography>
        {onRetry && (
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ mt: 2 }}
          >
            Actualizar
          </Button>
        )}
      </Box>
    );
  }

  // Success state - render children
  return <>{children}</>;
};

/**
 * Hook para simplificar el uso del componente SmartLoadingState
 */
export const useSmartLoading = (
  isLoading: boolean,
  data: any[] | null,
  error?: string | null
) => {
  const isEmpty = !isLoading && (!data || data.length === 0);
  
  const LoadingWrapper: React.FC<{
    children: React.ReactNode;
    loadingProps?: Partial<SmartLoadingStateProps>;
  }> = ({ children, loadingProps = {} }) => (
    <SmartLoadingState
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      {...loadingProps}
    >
      {children}
    </SmartLoadingState>
  );

  return {
    isEmpty,
    LoadingWrapper
  };
};
