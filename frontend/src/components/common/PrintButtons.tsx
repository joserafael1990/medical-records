import React from 'react';
import { Box, Stack, Divider } from '@mui/material';
import { PrintPrescriptionButton } from './PrintPrescriptionButton';
import { PrintMedicalOrderButton } from './PrintMedicalOrderButton';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo } from '../../services/pdfService';
import type { SignatureInfo } from '../../types/pdf';

interface PrintButtonsProps {
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultation: ConsultationInfo;
  medications: MedicationInfo[];
  studies: StudyInfo[];
  prescriptionSignature?: SignatureInfo | null;
  studyOrderSignature?: SignatureInfo | null;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  direction?: 'row' | 'column';
  spacing?: number;
  showDivider?: boolean;
}

export const PrintButtons: React.FC<PrintButtonsProps> = ({
  patient,
  doctor,
  consultation,
  medications,
  studies,
  prescriptionSignature,
  studyOrderSignature,
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  direction = 'row',
  spacing = 2,
  showDivider = true
}) => {
  return (
    <Box>
      <Stack 
        direction={direction} 
        spacing={spacing} 
        alignItems={direction === 'row' ? 'center' : 'stretch'}
        sx={{ 
          width: '100%',
          ...(direction === 'column' && { maxWidth: '300px' })
        }}
      >
        <PrintPrescriptionButton
          patient={patient}
          doctor={doctor}
          consultation={consultation}
          medications={medications}
          signatureInfo={prescriptionSignature}
          disabled={disabled}
          variant={variant}
          size={size}
          fullWidth={direction === 'column'}
        />

        <PrintMedicalOrderButton
          patient={patient}
          doctor={doctor}
          consultation={consultation}
          studies={studies}
          signatureInfo={studyOrderSignature}
          disabled={disabled}
          variant={variant}
          size={size}
          fullWidth={direction === 'column'}
        />
      </Stack>
      
      {showDivider && (
        <Divider sx={{ mt: 2, mb: 1 }} />
      )}
    </Box>
  );
};
