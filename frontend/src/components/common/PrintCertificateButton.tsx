import React, { useState } from 'react';
import { Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import { Description as CertificateIcon } from '@mui/icons-material';
import { usePDFGenerator } from '../../hooks/usePDFGenerator';
import { PatientInfo, DoctorInfo, ConsultationInfo, CertificateInfo } from '../../services/pdfService';

interface PrintCertificateButtonProps {
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultation: ConsultationInfo;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const PrintCertificateButton: React.FC<PrintCertificateButtonProps> = ({
  patient,
  doctor,
  consultation,
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  fullWidth = false
}) => {
  const { generateCertificatePDF } = usePDFGenerator();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [certificateTitle, setCertificateTitle] = useState('CONSTANCIA MÉDICA');
  const [certificateContent, setCertificateContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenDialog = () => {
    // Set a default template for the certificate
    const patientFullName = patient.name || 'Paciente';
    const doctorFullName = doctor.name || 'Médico';
    
    const defaultContent = `Por medio de la presente, yo, ${doctor.title || 'Dr.'} ${doctorFullName}, ${doctor.specialty || 'médico cirujano'}, con cédula profesional ${doctor.license || 'N/A'}, hago constar que el/la paciente ${patientFullName} acudió a consulta médica en fecha ${new Date(consultation.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}.

Bajo mi valoración médica, certifico que el/la paciente [describir el estado de salud, diagnóstico, o motivo de la constancia].

Se extiende la presente para los fines que al interesado convengan.`;

    setCertificateContent(defaultContent);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleGenerateCertificate = async () => {
    if (!certificateContent.trim()) {
      alert('Por favor, ingrese el contenido de la constancia');
      return;
    }

    setIsGenerating(true);
    
    const certificate: CertificateInfo = {
      content: certificateContent,
      title: certificateTitle
    };

    const result = await generateCertificatePDF(patient, doctor, consultation, certificate);
    
    setIsGenerating(false);

    if (result.success) {
      console.log(result.message);
      handleCloseDialog();
      // Reset fields
      setCertificateTitle('CONSTANCIA MÉDICA');
      setCertificateContent('');
    } else {
      console.error(result.message);
      alert('Error al generar la constancia. Por favor, intente de nuevo.');
    }
  };

  return (
    <>
      <Tooltip title="Generar Constancia Médica">
        <Button
          variant={variant}
          size={size}
          startIcon={<CertificateIcon />}
          onClick={handleOpenDialog}
          disabled={disabled}
          fullWidth={fullWidth}
          sx={{
            minWidth: fullWidth ? 'auto' : '120px'
          }}
        >
          Generar Constancia
        </Button>
      </Tooltip>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CertificateIcon />
            Generar Constancia
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Título de la Constancia"
              value={certificateTitle}
              onChange={(e) => setCertificateTitle(e.target.value)}
              fullWidth
              variant="outlined"
              helperText="Título que aparecerá en el encabezado del PDF"
            />
            
            <TextField
              label="Contenido de la Constancia"
              value={certificateContent}
              onChange={(e) => setCertificateContent(e.target.value)}
              fullWidth
              multiline
              rows={12}
              variant="outlined"
              required
              helperText="Ingrese el contenido completo de la constancia médica"
              placeholder="Escriba aquí el contenido de la constancia..."
            />
            
            <Box sx={{ 
              p: 2, 
              bgcolor: '#f5f5f5', 
              borderRadius: 1,
              fontSize: '0.875rem',
              color: 'text.secondary'
            }}>
              <strong>Nota:</strong> La constancia incluirá automáticamente:
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Información del médico (nombre, especialidad, cédula)</li>
                <li>Información del paciente (nombre, fecha de nacimiento, género)</li>
                <li>Fecha de la consulta</li>
                <li>Firma digital del médico</li>
              </ul>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleCloseDialog}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerateCertificate}
            variant="contained"
            color="primary"
            disabled={isGenerating || !certificateContent.trim()}
            startIcon={<CertificateIcon />}
          >
            {isGenerating ? 'Generando...' : 'Imprimir Constancia'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

