import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { usePDFGenerator } from '../../hooks/usePDFGenerator';
import { PatientInfo, DoctorInfo, ConsultationInfo, StudyInfo } from '../../services/pdfService';
import { useToast } from './ToastNotification';

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
  const { showSuccess, showError } = useToast();

  const handlePrintMedicalOrder = async () => {
    if (!consultation?.id) {
      showError('Guarda la consulta para generar un folio antes de imprimir la orden');
      return;
    }

    const result = await generateMedicalOrderPDF(
      patient,
      doctor,
      consultation,
      studies,
      consultation?.nextAppointmentDate
    );
    
    if (result.success) {
      showSuccess('Órdenes de estudios generadas exitosamente');
    } else {
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
