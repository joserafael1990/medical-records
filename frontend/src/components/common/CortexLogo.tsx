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
        sx={{
          width: '32px',
          height: '32px',
          color: 'primary.main',
          ...sx
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '100%', height: '100%' }}
        >
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path>
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path>
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>
          <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path>
          <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path>
          <path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path>
          <path d="M19.938 10.5a4 4 0 0 1 .585.396"></path>
          <path d="M6 18a4 4 0 0 1-1.967-.516"></path>
          <path d="M19.967 17.484A4 4 0 0 1 18 18"></path>
        </svg>
      </Box>
    );
  }

  // Full logo with text and icon
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        ...sx
      }}
    >
      <Box
        sx={{
          width: '32px',
          height: '32px',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: '100%', height: '100%' }}
        >
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path>
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path>
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>
          <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path>
          <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path>
          <path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path>
          <path d="M19.938 10.5a4 4 0 0 1 .585.396"></path>
          <path d="M6 18a4 4 0 0 1-1.967-.516"></path>
          <path d="M19.967 17.484A4 4 0 0 1 18 18"></path>
        </svg>
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: '16px',
          fontWeight: 700,
          fontFamily: 'Inter, Poppins, sans-serif',
          letterSpacing: '0.5px',
          color: 'currentColor',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        CORTEX
      </Box>
    </Box>
  );
};

export default CortexLogo;