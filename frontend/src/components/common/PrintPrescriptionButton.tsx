import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { usePDFGenerator } from '../../hooks/usePDFGenerator';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo } from '../../services/pdfService';

interface PrintPrescriptionButtonProps {
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultation: ConsultationInfo;
  medications: MedicationInfo[];
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const PrintPrescriptionButton: React.FC<PrintPrescriptionButtonProps> = ({
  patient,
  doctor,
  consultation,
  medications,
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  fullWidth = false
}) => {
  const { generatePrescriptionPDF } = usePDFGenerator();

  const handlePrintPrescription = async () => {
    console.log('PrintPrescriptionButton clicked!', {
      patient: patient?.firstName,
      doctor: doctor?.firstName,
      consultation: consultation?.id,
      medicationsCount: medications?.length
    });
    
    const result = await generatePrescriptionPDF(patient, doctor, consultation, medications);
    
    if (result.success) {
      // You can add a success notification here
      console.log(result.message);
    } else {
      // You can add an error notification here
      console.error(result.message);
    }
  };

  return (
    <Tooltip title="Imprimir Receta Médica">
      <Button
        variant={variant}
        size={size}
        startIcon={<PrintIcon />}
        onClick={handlePrintPrescription}
        disabled={disabled || medications.length === 0}
        fullWidth={fullWidth}
        sx={{
          minWidth: fullWidth ? 'auto' : '120px'
        }}
      >
        Imprimir Receta
      </Button>
    </Tooltip>
  );
};
