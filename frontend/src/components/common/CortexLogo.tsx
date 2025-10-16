import React from 'react';
import { Box } from '@mui/material';

interface CortexLogoProps {
  variant?: 'full' | 'icon' | 'text';
  sx?: any;
}

const CortexLogo: React.FC<CortexLogoProps> = ({ 
  variant = 'full',
  sx = {}
}) => {
  if (variant === 'text') {
    return (
      <Box
        component="span"
        sx={{
          fontSize: '20px',
          fontWeight: 700,
          fontFamily: 'Inter, Poppins, sans-serif',
          letterSpacing: '0.5px',
          color: 'currentColor',
          ...sx
        }}
      >
        CORTEX
      </Box>
    );
  }

  if (variant === 'icon') {
    return (
      <Box
        component="img"
        src="/cortex-logo.svg"
        alt="CORTEX Logo"
        sx={{
          width: '32px',
          height: '32px',
          ...sx
        }}
      />
    );
  }

  // Full logo with text and icon
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...sx
      }}
    >
      <Box
        component="img"
        src="/cortex-logo.svg"
        alt="CORTEX Logo"
        sx={{
          width: '32px',
          height: '32px'
        }}
      />
      <Box
        component="span"
        sx={{
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'Inter, Poppins, sans-serif',
          letterSpacing: '0.5px',
          color: 'currentColor'
        }}
      >
        CORTEX
      </Box>
    </Box>
  );
};

export default CortexLogo;