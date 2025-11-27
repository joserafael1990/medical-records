import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import { usePDFGenerator } from '../../hooks/usePDFGenerator';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo } from '../../services/pdfService';
import { useToast } from './ToastNotification';

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
  const { showSuccess, showError } = useToast();

  const handlePrintPrescription = async () => {
    if (!consultation?.id) {
      showError('Guarda la consulta para generar un folio antes de imprimir la receta');
      return;
    }

    // Track PDF generate button clicked in Amplitude
    const { AmplitudeService } = await import('../../services/analytics/AmplitudeService');
    AmplitudeService.track('pdf_generate_button_clicked', {
      pdf_type: 'prescription'
    });

    const result = await generatePrescriptionPDF(
      patient,
      doctor,
      consultation,
      medications,
      consultation?.nextAppointmentDate
    );
    
    if (result.success) {
      showSuccess('Receta generada exitosamente');
    } else {
      console.error(result.message);
    }
  };

  // Button should be enabled if:
  // 1. There are medications, OR
  // 2. There is text in treatment_plan
  const hasMedications = medications.length > 0;
  const hasTreatmentPlan = consultation?.treatment_plan 
    ? consultation.treatment_plan.trim() !== '' 
    : false;
  
  const isEnabled = !disabled && (hasMedications || hasTreatmentPlan);

  return (
    <Tooltip title="Imprimir Receta Médica">
      <Button
        variant={variant}
        size={size}
        startIcon={<PrintIcon />}
        onClick={handlePrintPrescription}
        disabled={!isEnabled}
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
