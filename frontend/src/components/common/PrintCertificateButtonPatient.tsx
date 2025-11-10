import React, { useState } from 'react';
import { Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import { Description as CertificateIcon } from '@mui/icons-material';
import { usePDFGenerator } from '../../hooks/usePDFGenerator';
import { PatientInfo, DoctorInfo, ConsultationInfo, CertificateInfo } from '../../services/pdfService';

interface PrintCertificateButtonPatientProps {
  patient: PatientInfo;
  doctor: DoctorInfo;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const PrintCertificateButtonPatient: React.FC<PrintCertificateButtonPatientProps> = ({
  patient,
  doctor,
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
  const [patientFullName, setPatientFullName] = useState('');
  const [doctorFullName, setDoctorFullName] = useState('');

  const handleOpenDialog = async () => {
    // Debug logs
    console.log('🔍 PrintCertificateButtonPatient - patient:', patient);
    console.log('🔍 PrintCertificateButtonPatient - doctor:', doctor);
    
    // Set a default template for the certificate
    // Support both old format (firstName, lastName) and new format (name)
    let patientName = patient.name || 
      `${(patient as any).firstName || ''} ${(patient as any).lastName || ''} ${(patient as any).maternalSurname || ''}`.trim();
    
    // If patient name is still empty, fetch from API
    if (!patientName && patient.id) {
      try {
        const { apiService } = await import('../../services');
        const patientData = await apiService.patients.getPatientById(patient.id.toString());
        patientName = patientData.name || 'Paciente';
      } catch (error) {
        console.error('Error fetching patient data:', error);
        patientName = 'Paciente';
      }
    }
    
    let doctorName = doctor.name || 
      `${(doctor as any).firstName || ''} ${(doctor as any).lastName || ''} ${(doctor as any).maternalSurname || ''}`.trim();
    
    // Check if doctor name looks wrong (contains title in firstName or is just "Usuario")
    const looksWrong = !doctorName || 
                       doctorName === doctor.title || 
                       (doctor as any).firstName === doctor.title ||
                       doctorName.includes('Usuario') ||
                       doctorName === 'Médico';
    
    // If doctor name is empty, wrong, or suspicious, fetch from API
    if (looksWrong && doctor.id) {
      try {
        const { apiService } = await import('../../services');
        const doctorData = await apiService.doctors.getDoctorProfile();
        doctorName = doctorData.name || 'Médico';
        console.log('🔍 Fetched doctor name from API:', doctorName);
      } catch (error) {
        console.error('Error fetching doctor data:', error);
        doctorName = 'Médico';
      }
    }
    
    setPatientFullName(patientName || 'Paciente');
    setDoctorFullName(doctorName || 'Médico');
    
    console.log('🔍 PrintCertificateButtonPatient - patientFullName:', patientName);
    console.log('🔍 PrintCertificateButtonPatient - doctorFullName:', doctorName);
    
    // Build the doctor's full name with title (only once)
    const doctorWithTitle = doctorName.startsWith(doctor.title || '') 
      ? doctorName 
      : `${doctor.title || 'Dr.'} ${doctorName}`;
    
    const defaultContent = `Por medio de la presente, yo, ${doctorWithTitle}, ${doctor.specialty || 'médico cirujano'}, con cédula profesional ${doctor.license || 'N/A'}, hago constar que el/la paciente ${patientName} se encuentra bajo mi atención médica.

Bajo mi valoración médica, certifico lo siguiente:

[Escriba aquí el contenido de la constancia]

Se extiende la presente para los fines que al interesado convengan.

Atentamente,`;

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

    // Create a minimal consultation object (not used in the simplified PDF)
    const consultation: ConsultationInfo = {
      id: 0,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      type: 'Constancia',
      reason: 'Constancia médica',
      diagnosis: '',
      prescribed_medications: '',
      notes: ''
    };

    // Create updated patient and doctor objects with correct names
    const patientWithName = {
      ...patient,
      name: patientFullName
    };
    
    const doctorWithName = {
      ...doctor,
      name: doctorFullName
    };
    
    const result = await generateCertificatePDF(patientWithName, doctorWithName, consultation, certificate);
    
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
            minWidth: fullWidth ? 'auto' : '160px'
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
            Generar Constancia Médica
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
              rows={14}
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
              <strong>El PDF generado incluirá automáticamente:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Header con logo CORTEX</li>
                <li>Título de la constancia</li>
                <li>Contenido personalizado</li>
                <li>Firma del médico con nombre, especialidad y cédula profesional</li>
                <li>Footer con información de CORTEX y fecha de generación</li>
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
            {isGenerating ? 'Generando...' : 'Generar Constancia'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

