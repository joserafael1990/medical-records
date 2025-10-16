import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

// Surgical Blue Colors for CORTEX Logo
const surgicalBlue = {
  primary: '#1565C0',
  light: '#42A5F5',
  dark: '#0D47A1',
};

interface CortexLogoProps extends Omit<SvgIconProps, 'children'> {
  variant?: 'full' | 'icon' | 'text';
}

const CortexLogo: React.FC<CortexLogoProps> = ({ 
  variant = 'full',
  sx,
  ...props 
}) => {
  if (variant === 'text') {
    return (
      <SvgIcon
        {...props}
        viewBox="0 0 120 24"
        sx={{
          width: 'auto',
          height: '24px',
          ...sx
        }}
      >
        {/* CORTEX Text Logo */}
        <text
          x="0"
          y="18"
          fontSize="20"
          fontWeight="700"
          fontFamily="Inter, Poppins, sans-serif"
          fill="currentColor"
          letterSpacing="0.5px"
        >
          CORTEX
        </text>
      </SvgIcon>
    );
  }

  if (variant === 'icon') {
    return (
      <SvgIcon
        {...props}
        viewBox="0 0 32 32"
        sx={{
          width: '32px',
          height: '32px',
          ...sx
        }}
      >
        {/* CORTEX Interconnected Logo */}
        <defs>
          <style>
            .cortex-navy { fill: #1e3a8a; }
            .cortex-cyan { fill: #06b6d4; }
          </style>
        </defs>
        
        {/* Shape 1 - Navy Blue */}
        <path className="cortex-navy" d="M16 4 L 22 7 L 22 16 L 16 19 L 10 16 L 10 7 Z" transform="rotate(0 16 16)"/>
        
        {/* Shape 2 - Navy Blue */}
        <path className="cortex-navy" d="M16 4 L 22 7 L 22 16 L 16 19 L 10 16 L 10 7 Z" transform="rotate(120 16 16)"/>
        
        {/* Shape 3 - Cyan Blue */}
        <path className="cortex-cyan" d="M16 4 L 22 7 L 22 16 L 16 19 L 10 16 L 10 7 Z" transform="rotate(240 16 16)"/>
      </SvgIcon>
    );
  }

  // Full logo with text and icon
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 160 32"
      sx={{
        width: 'auto',
        height: '32px',
        ...sx
      }}
    >
      {/* CORTEX Icon part */}
      <defs>
        <style>
          .cortex-navy { fill: #1e3a8a; }
          .cortex-cyan { fill: #06b6d4; }
        </style>
      </defs>
      
      {/* Shape 1 - Navy Blue */}
      <path className="cortex-navy" d="M8 2 L 12 4 L 12 12 L 8 14 L 4 12 L 4 4 Z" transform="rotate(0 8 8)"/>
      
      {/* Shape 2 - Navy Blue */}
      <path className="cortex-navy" d="M8 2 L 12 4 L 12 12 L 8 14 L 4 12 L 4 4 Z" transform="rotate(120 8 8)"/>
      
      {/* Shape 3 - Cyan Blue */}
      <path className="cortex-cyan" d="M8 2 L 12 4 L 12 12 L 8 14 L 4 12 L 4 4 Z" transform="rotate(240 8 8)"/>
      
      {/* Text part - CORTEX */}
      <text
        x="24"
        y="22"
        fontSize="16"
        fontWeight="700"
        fontFamily="Inter, Poppins, sans-serif"
        fill="currentColor"
        letterSpacing="0.5px"
      >
        CORTEX
      </text>
    </SvgIcon>
  );
};

export default CortexLogo;
