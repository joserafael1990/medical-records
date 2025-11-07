import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Divider
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon
} from '@mui/icons-material';
import CommonDiagnosisSection from '../../common/DiagnosisSection';

interface DiagnosisSectionProps {
  // Primary diagnoses
  primaryDiagnoses: any[];
  onAddPrimaryDiagnosis: (diagnosis: any) => void;
  onRemovePrimaryDiagnosis: (diagnosis: any) => void;
  primaryDiagnosisText: string;
  onPrimaryDiagnosisTextChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  
  // Secondary diagnoses
  secondaryDiagnoses: any[];
  onAddSecondaryDiagnosis: (diagnosis: any) => void;
  onRemoveSecondaryDiagnosis: (diagnosis: any) => void;
  secondaryDiagnosesText: string;
  onSecondaryDiagnosesTextChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  
  // Common props
  loading: boolean;
  primaryDiagnosesError?: string | null;
  secondaryDiagnosesError?: string | null;
}

export const ConsultationDiagnosisSection: React.FC<DiagnosisSectionProps> = ({
  primaryDiagnoses,
  onAddPrimaryDiagnosis,
  onRemovePrimaryDiagnosis,
  primaryDiagnosisText,
  onPrimaryDiagnosisTextChange,
  secondaryDiagnoses,
  onAddSecondaryDiagnosis,
  onRemoveSecondaryDiagnosis,
  secondaryDiagnosesText,
  onSecondaryDiagnosesTextChange,
  loading,
  primaryDiagnosesError,
  secondaryDiagnosesError
}) => {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MedicalServicesIcon sx={{ fontSize: 20 }} />
        Diagnósticos (CIE-10)
      </Typography>
      
      {/* Primary Diagnoses */}
      <Box sx={{ mb: 3 }}>
        <CommonDiagnosisSection
          diagnoses={primaryDiagnoses}
          onAddDiagnosis={onAddPrimaryDiagnosis}
          onRemoveDiagnosis={onRemovePrimaryDiagnosis}
          title="Diagnósticos Principales"
          maxSelections={1}
          showAddButton={true}
          isLoading={loading}
          error={primaryDiagnosesError}
        />
      </Box>
      
      {/* Primary diagnosis text field (legacy) */}
      <TextField
        name="primary_diagnosis"
        label="Diagnóstico principal (texto)"
        value={primaryDiagnosisText}
        onChange={onPrimaryDiagnosisTextChange}
        size="small"
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 1 }}
      />
      
      <Divider sx={{ my: 2 }} />

      {/* Secondary Diagnoses */}
      <Box sx={{ mb: 2 }}>
        <CommonDiagnosisSection
          diagnoses={secondaryDiagnoses}
          onAddDiagnosis={onAddSecondaryDiagnosis}
          onRemoveDiagnosis={onRemoveSecondaryDiagnosis}
          title="Diagnósticos Secundarios"
          showAddButton={true}
          isLoading={loading}
          error={secondaryDiagnosesError}
        />
      </Box>

      {/* Secondary diagnoses text field (legacy) */}
      <TextField
        name="secondary_diagnoses"
        label="Diagnósticos secundarios (texto)"
        value={secondaryDiagnosesText}
        onChange={onSecondaryDiagnosesTextChange}
        size="small"
        fullWidth
        multiline
        rows={2}
      />
    </Box>
  );
};


