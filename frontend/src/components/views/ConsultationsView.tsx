import React from 'react';
import { Box, Typography } from '@mui/material';

interface ConsultationsViewProps {
  // Props básicas para el componente
}

const ConsultationsView: React.FC<ConsultationsViewProps> = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Consultas Médicas
      </Typography>
      
      <Typography variant="body1">
        Vista de consultas médicas en desarrollo...
      </Typography>
    </Box>
  );
};

export default ConsultationsView;
