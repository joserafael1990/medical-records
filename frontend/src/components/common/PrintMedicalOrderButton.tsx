import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { usePDFGenerator } from '../../hooks/usePDFGenerator';
import { PatientInfo, DoctorInfo, ConsultationInfo, StudyInfo } from '../../services/pdfService';

interface PrintMedicalOrderButtonProps {
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultation: ConsultationInfo;
  studies: StudyInfo[];
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const PrintMedicalOrderButton: React.FC<PrintMedicalOrderButtonProps> = ({
  patient,
  doctor,
  consultation,
  studies,
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  fullWidth = false
}) => {
  const { generateMedicalOrderPDF } = usePDFGenerator();

  const handlePrintMedicalOrder = async () => {
    console.log('PrintMedicalOrderButton clicked!', {
      patient: patient?.name,
      doctor: doctor?.name,
      consultation: consultation?.id,
      studiesCount: studies?.length
    });
    
    const result = await generateMedicalOrderPDF(patient, doctor, consultation, studies);
    
    if (result.success) {
      // You can add a success notification here
      console.log(result.message);
    } else {
      // You can add an error notification here
      console.error(result.message);
    }
  };

  return (
    <Tooltip title="Imprimir Orden de Estudios Médicos">
      <Button
        variant={variant}
        size={size}
        startIcon={<PrintIcon />}
        onClick={handlePrintMedicalOrder}
        disabled={disabled || studies.length === 0}
        fullWidth={fullWidth}
        sx={{
          minWidth: fullWidth ? 'auto' : '140px'
        }}
      >
        Imprimir Órdenes
      </Button>
    </Tooltip>
  );
};
