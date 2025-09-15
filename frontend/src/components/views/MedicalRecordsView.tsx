import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Patient, ConsultationFormData } from '../../types';

interface MedicalRecordsViewProps {
  patients: Patient[];
  onCreateRecord: (data: ConsultationFormData) => Promise<void>;
  onUpdateRecord: (id: string, data: ConsultationFormData) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Medical Records View - Placeholder component
 * TODO: Implement full medical records functionality
 */
const MedicalRecordsView: React.FC<MedicalRecordsViewProps> = ({ 
  patients, 
  onCreateRecord, 
  onUpdateRecord, 
  isLoading, 
  onRefresh 
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Expedientes Médicos
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Esta vista estará disponible en futuras versiones.
        </Typography>
      </Paper>
    </Box>
  );
};

export default MedicalRecordsView;

