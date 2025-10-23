import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: number;
}

const DefaultFallback: React.FC<{ minHeight?: number }> = ({ minHeight = 200 }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight,
      gap: 2
    }}
  >
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">
      Cargando componente...
    </Typography>
  </Box>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  minHeight = 200
}) => {
  return (
    <Suspense fallback={fallback || <DefaultFallback minHeight={minHeight} />}>
      {children}
    </Suspense>
  );
};
