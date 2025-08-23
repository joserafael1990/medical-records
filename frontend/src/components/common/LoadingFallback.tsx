import React, { memo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingFallbackProps {
  message?: string;
  size?: number;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = 'Cargando...', 
  size = 40 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2
      }}
    >
      <CircularProgress size={size} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default memo(LoadingFallback);
