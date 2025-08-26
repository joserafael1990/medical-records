import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

// Surgical Blue Colors for AVANT Logo
const surgicalBlue = {
  primary: '#1565C0',
  light: '#42A5F5',
  dark: '#0D47A1',
};

interface AvantLogoProps extends Omit<SvgIconProps, 'children'> {
  variant?: 'full' | 'icon' | 'text';
}

const AvantLogo: React.FC<AvantLogoProps> = ({ 
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
        {/* AVANT Text Logo */}
        <text
          x="0"
          y="18"
          fontSize="20"
          fontWeight="700"
          fontFamily="Inter, Poppins, sans-serif"
          fill="currentColor"
          letterSpacing="0.5px"
        >
          AVANT
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
        {/* Stethoscope Icon with AVANT branding */}
        <g fill="currentColor">
          {/* Stethoscope earpieces */}
          <path d="M8 4C8 2.9 8.9 2 10 2C11.1 2 12 2.9 12 4C12 5.1 11.1 6 10 6C8.9 6 8 5.1 8 4Z" />
          <path d="M20 4C20 2.9 20.9 2 22 2C23.1 2 24 2.9 24 4C24 5.1 23.1 6 22 6C20.9 6 20 5.1 20 4Z" />
          
          {/* Stethoscope tubing */}
          <path d="M10 6V8C10 12 12 14 16 14C20 14 22 12 22 8V6" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round" />
          
          {/* Central connection */}
          <circle cx="16" cy="14" r="1" />
          
          {/* Main tube */}
          <path d="M16 15V22C16 24 18 26 20 26C22 26 24 24 24 22" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round" />
          
          {/* Chest piece */}
          <circle cx="26" cy="22" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="26" cy="22" r="2" fill="currentColor" />
        </g>
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
      {/* Icon part */}
      <g fill="currentColor">
        {/* Stethoscope earpieces */}
        <path d="M4 8C4 6.9 4.9 6 6 6C7.1 6 8 6.9 8 8C8 9.1 7.1 10 6 10C4.9 10 4 9.1 4 8Z" />
        <path d="M12 8C12 6.9 12.9 6 14 6C15.1 6 16 6.9 16 8C16 9.1 15.1 10 14 10C12.9 10 12 9.1 12 8Z" />
        
        {/* Stethoscope tubing */}
        <path d="M6 10V12C6 16 8 18 10 18C12 18 14 16 14 12V10" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              fill="none" 
              strokeLinecap="round" />
        
        {/* Central connection */}
        <circle cx="10" cy="18" r="0.8" />
        
        {/* Main tube */}
        <path d="M10 19V24C10 25 11 26 12 26C13 26 14 25 14 24" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              fill="none" 
              strokeLinecap="round" />
        
        {/* Chest piece */}
        <circle cx="16" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="16" cy="24" r="1.5" fill="currentColor" />
      </g>
      
      {/* Text part - AVANT */}
      <text
        x="28"
        y="22"
        fontSize="16"
        fontWeight="700"
        fontFamily="Inter, Poppins, sans-serif"
        fill="currentColor"
        letterSpacing="0.5px"
      >
        AVANT
      </text>
    </SvgIcon>
  );
};

export default AvantLogo;
