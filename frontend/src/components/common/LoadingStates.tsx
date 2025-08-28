import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Button,
  Alert,
  Fade,
  Backdrop,
  Card,
  CardContent
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon 
} from '@mui/icons-material';

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  backdrop?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
}

// Full-screen loading overlay
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Cargando...',
  backdrop = true,
  size = 'medium',
  color = 'primary'
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3
      }}
    >
      <CircularProgress size={sizeMap[size]} color={color} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop
        open={isLoading}
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }}
      >
        {content}
      </Backdrop>
    );
  }

  return (
    <Fade in={isLoading}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1
        }}
      >
        {content}
      </Box>
    </Fade>
  );
};

// Inline loading indicator
export interface InlineLoadingProps {
  isLoading: boolean;
  message?: string;
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  variant?: 'spinner' | 'dots' | 'pulse';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  message,
  size = 20,
  color = 'primary',
  variant = 'spinner'
}) => {
  if (!isLoading) return null;

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[0, 1, 2].map(i => (
              <Box
                key={i}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: `${color}.main`,
                  animation: 'dot-pulse 1.4s infinite',
                  animationDelay: `${i * 0.2}s`,
                  '@keyframes dot-pulse': {
                    '0%, 80%, 100%': { opacity: 0.3 },
                    '40%': { opacity: 1 }
                  }
                }}
              />
            ))}
          </Box>
        );
      case 'pulse':
        return (
          <Box
            sx={{
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: `${color}.main`,
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.5, transform: 'scale(1.1)' },
                '100%': { opacity: 1, transform: 'scale(1)' }
              }
            }}
          />
        );
      default:
        return <CircularProgress size={size} color={color} />;
    }
  };

  return (
    <Fade in={isLoading}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {renderVariant()}
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );
};

// Progress bar loading
export interface ProgressLoadingProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
}

export const ProgressLoading: React.FC<ProgressLoadingProps> = ({
  isLoading,
  progress,
  message,
  showPercentage = true,
  color = 'primary'
}) => {
  if (!isLoading) return null;

  return (
    <Fade in={isLoading}>
      <Box sx={{ width: '100%', p: 2 }}>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {message}
          </Typography>
        )}
        <LinearProgress 
          variant={progress !== undefined ? 'determinate' : 'indeterminate'}
          value={progress}
          color={color}
          sx={{ height: 6, borderRadius: 3 }}
        />
        {showPercentage && progress !== undefined && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            {Math.round(progress)}%
          </Typography>
        )}
      </Box>
    </Fade>
  );
};

// Error state with retry
export interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
  variant?: 'alert' | 'card' | 'inline';
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  retryText = 'Reintentar',
  showIcon = true,
  variant = 'alert'
}) => {
  const content = (
    <>
      {showIcon && (
        <ErrorIcon color="error" sx={{ mr: 1 }} />
      )}
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
        {onRetry && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{ mt: 1 }}
          >
            {retryText}
          </Button>
        )}
      </Box>
    </>
  );

  switch (variant) {
    case 'card':
      return (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              {content}
            </Box>
          </CardContent>
        </Card>
      );
    case 'inline':
      return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 1 }}>
          {content}
        </Box>
      );
    default:
      return (
        <Alert 
          severity="error"
          action={onRetry && (
            <Button size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
              {retryText}
            </Button>
          )}
        >
          {error}
        </Alert>
      );
  }
};

// Success state
export interface SuccessStateProps {
  message: string;
  showIcon?: boolean;
  autoHide?: boolean;
  duration?: number;
  onHide?: () => void;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  message,
  showIcon = true,
  autoHide = true,
  duration = 3000,
  onHide
}) => {
  React.useEffect(() => {
    if (autoHide && onHide) {
      const timer = setTimeout(onHide, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onHide]);

  return (
    <Alert 
      severity="success"
      icon={showIcon ? <SuccessIcon /> : false}
      onClose={onHide}
    >
      {message}
    </Alert>
  );
};

// Empty state
export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
      textAlign: 'center',
      minHeight: 200
    }}
  >
    {icon && (
      <Box sx={{ mb: 2, opacity: 0.6 }}>
        {icon}
      </Box>
    )}
    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400 }}>
        {description}
      </Typography>
    )}
    {action}
  </Box>
);

// Combined loading state component
export interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onRetry?: () => void;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  isEmpty,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onRetry,
  loadingMessage = 'Cargando...',
  emptyTitle = 'No hay datos',
  emptyDescription = 'No se encontró información para mostrar'
}) => {
  if (isLoading) {
    return loadingComponent || (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <InlineLoading isLoading={true} message={loadingMessage} />
      </Box>
    );
  }

  if (error) {
    return errorComponent || (
      <Box sx={{ p: 2 }}>
        <ErrorState error={error} onRetry={onRetry} />
      </Box>
    );
  }

  if (isEmpty) {
    return emptyComponent || (
      <EmptyState 
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
};
