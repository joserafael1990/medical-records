import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { pdfService } from '../../services/pdfService';

export const SimplePDFTest: React.FC = () => {
  const handleTestPrescription = () => {
    console.log('Testing prescription generation...');
    
    try {
      pdfService.generatePrescription(
        {
          id: 1,
          firstName: 'Juan',
          lastName: 'Pérez',
          dateOfBirth: '1985-03-15',
          phone: '555-1234',
          email: 'juan@test.com'
        },
        {
          id: 1,
          firstName: 'Dr. María',
          lastName: 'López',
          title: 'Médico General',
          specialty: 'Medicina Interna'
        },
        {
          id: 1,
          date: '2024-01-15',
          time: '10:30',
          type: 'Consulta General',
          reason: 'Dolor de cabeza',
          diagnosis: 'Gripe común'
        },
        [
          {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: 'Cada 8 horas',
            duration: '7 días',
            instructions: 'Con alimentos',
            quantity: 21
          }
        ]
      );
      console.log('Prescription generated successfully');
    } catch (error) {
      console.error('Error generating prescription:', error);
    }
  };

  const handleTestMedicalOrder = () => {
    console.log('Testing medical order generation...');
    
    try {
      pdfService.generateMedicalOrder(
        {
          id: 1,
          firstName: 'Juan',
          lastName: 'Pérez',
          dateOfBirth: '1985-03-15',
          phone: '555-1234',
          email: 'juan@test.com'
        },
        {
          id: 1,
          firstName: 'Dr. María',
          lastName: 'López',
          title: 'Médico General',
          specialty: 'Medicina Interna'
        },
        {
          id: 1,
          date: '2024-01-15',
          time: '10:30',
          type: 'Consulta General',
          reason: 'Dolor de cabeza',
          diagnosis: 'Gripe común'
        },
        [
          {
            name: 'Biometría Hemática',
            type: 'Laboratorio',
            category: 'Hematología',
            description: 'Análisis de sangre',
            instructions: 'Ayuno 8 horas',
            urgency: 'Rutina'
          }
        ]
      );
      console.log('Medical order generated successfully');
    } catch (error) {
      console.error('Error generating medical order:', error);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Prueba Simple de PDFs
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={handleTestPrescription}
          color="primary"
        >
          Probar Receta
        </Button>
        
        <Button 
          variant="contained" 
          onClick={handleTestMedicalOrder}
          color="secondary"
        >
          Probar Orden
        </Button>
      </Box>
      
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Revisa la consola para ver los logs y verifica si se descarga el PDF.
      </Typography>
    </Box>
  );
};
