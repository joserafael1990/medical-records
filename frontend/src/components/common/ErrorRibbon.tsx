// ============================================================================
// ERROR RIBBON COMPONENT - Componente reutilizable para mostrar errores
// ============================================================================

import React from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
import { Warning as WarningIcon, Close as CloseIcon } from '@mui/icons-material';

interface ErrorRibbonProps {
  message: string;
  onClose?: () => void;
  severity?: 'error' | 'warning' | 'info' | 'success';
  sx?: any;
}

const severityConfig = {
  error: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    color: '#c62828',
    icon: WarningIcon
  },
  warning: {
    backgroundColor: '#fff8e1',
    borderColor: '#ff9800',
    color: '#e65100',
    icon: WarningIcon
  },
  info: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    color: '#1565c0',
    icon: WarningIcon
  },
  success: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    color: '#2e7d32',
    icon: WarningIcon
  }
};

export const ErrorRibbon: React.FC<ErrorRibbonProps> = ({
  message,
  onClose,
  severity = 'error',
  sx = {}
}) => {
  const config = severityConfig[severity];
  const IconComponent = config.icon;

  if (!message) return null;

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mx: 3,
        mb: 2,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
        <IconComponent sx={{ color: config.color, mt: 0.25, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ 
          fontWeight: 500, 
          whiteSpace: 'pre-line',
          lineHeight: 1.5,
          flex: 1,
          '& ul': {
            margin: 0,
            paddingLeft: '1rem'
          }
        }}>
          {message}
        </Typography>
      </Box>
      {onClose && (
        <IconButton 
          size="small" 
          onClick={onClose}
          sx={{ color: config.color }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );
};
