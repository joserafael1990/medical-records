import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { PrintButtons } from './PrintButtons';
import { PatientInfo, DoctorInfo, ConsultationInfo, MedicationInfo, StudyInfo } from '../../services/pdfService';

// Sample data for testing
const samplePatient: PatientInfo = {
  id: 1,
  firstName: 'Juan',
  lastName: 'Pérez García',
  dateOfBirth: '1985-03-15',
  phone: '+52 55 1234 5678',
  email: 'juan.perez@email.com',
  address: 'Av. Reforma 123, Col. Centro',
  city: 'Ciudad de México',
  state: 'CDMX',
  country: 'México'
};

const sampleDoctor: DoctorInfo = {
  id: 1,
  firstName: 'Dr. María',
  lastName: 'López Hernández',
  title: 'Médico General',
  specialty: 'Medicina Interna',
  license: '12345678',
  phone: '+52 55 9876 5432',
  email: 'dr.lopez@cortex.com',
  address: 'Consultorio Médico CORTEX',
  city: 'Ciudad de México',
  state: 'CDMX'
};

const sampleConsultation: ConsultationInfo = {
  id: 1,
  date: '2024-01-15',
  time: '10:30',
  type: 'Consulta General',
  reason: 'Dolor de cabeza y fiebre',
  diagnosis: 'Gripe común',
  notes: 'Paciente presenta síntomas de gripe común. Se recomienda reposo y medicación sintomática.'
};

const sampleMedications: MedicationInfo[] = [
  {
    name: 'Paracetamol',
    dosage: '500mg',
    frequency: 'Cada 8 horas',
    duration: '7 días',
    instructions: 'Tomar con alimentos',
    quantity: 21
  },
  {
    name: 'Ibuprofeno',
    dosage: '400mg',
    frequency: 'Cada 12 horas',
    duration: '5 días',
    instructions: 'Tomar con leche',
    quantity: 10
  }
];

const sampleStudies: StudyInfo[] = [
  {
    name: 'Biometría Hemática Completa',
    type: 'Laboratorio',
    category: 'Hematología',
    description: 'Análisis completo de células sanguíneas',
    instructions: 'Ayuno de 8 horas',
    urgency: 'Rutina'
  },
  {
    name: 'Radiografía de Tórax',
    type: 'Imagen',
    category: 'Radiología',
    description: 'Estudio radiológico del tórax',
    instructions: 'Retirar objetos metálicos',
    urgency: 'Rutina'
  }
];

export const PDFTestComponent: React.FC = () => {
  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        Prueba de Generación de PDFs
      </Typography>
      
      <Typography variant="body1" paragraph>
        Este componente permite probar la generación de PDFs para recetas médicas y órdenes de estudios.
        Los PDFs incluyen branding de CORTEX y toda la información relevante.
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <PrintButtons
          patient={samplePatient}
          doctor={sampleDoctor}
          consultation={sampleConsultation}
          medications={sampleMedications}
          studies={sampleStudies}
          variant="contained"
          size="medium"
          direction="column"
          spacing={2}
          showDivider={false}
        />
      </Box>
      
      <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
        Nota: Los PDFs se descargarán automáticamente cuando hagas clic en los botones.
        Asegúrate de tener permisos de descarga habilitados en tu navegador.
      </Typography>
    </Paper>
  );
};
