import React from 'react';
import {
  Box
} from '@mui/material';
import { PrintButtons } from '../../common/PrintButtons';

interface PrintButtonsSectionProps {
  // Show condition
  show: boolean;
  
  // Patient data
  selectedPatient: any;
  
  // Doctor data
  doctorProfile: any;
  appointmentOffice: any;
  
  // Consultation data
  consultation: any;
  formData: {
    date: string;
    chief_complaint: string;
    primary_diagnosis: string;
    treatment_plan: string;
  };
  
  // Prescriptions
  prescriptions: any[];
  
  // Clinical studies
  studies: any[];
}

export const PrintButtonsSection: React.FC<PrintButtonsSectionProps> = ({
  show,
  selectedPatient,
  doctorProfile,
  appointmentOffice,
  consultation,
  formData,
  prescriptions,
  studies
}) => {
  if (!show) {
    return null;
  }

  // Debug: Log the data to see what we're receiving
  console.log('🔍 PrintButtonsSection - doctorProfile:', doctorProfile);
  console.log('🔍 PrintButtonsSection - selectedPatient:', selectedPatient);

  return (
    <Box sx={{ width: '100%' }}>
      <PrintButtons
        patient={{
          id: selectedPatient?.id || 0,
          name: selectedPatient?.name || 'Paciente',
          dateOfBirth: selectedPatient?.birth_date || undefined,
          gender: selectedPatient?.gender || undefined,
          phone: selectedPatient?.primary_phone || undefined,
          email: selectedPatient?.email || undefined,
          address: selectedPatient?.address || undefined,
          city: selectedPatient?.city || undefined,
          state: selectedPatient?.state || undefined,
          country: selectedPatient?.country || undefined
        }}
        doctor={{
          id: doctorProfile?.id || 0,
          name: doctorProfile?.name || 'Médico',
          title: doctorProfile?.title || 'Dr.',
          specialty: doctorProfile?.specialty_name || 'No especificada',
          license: doctorProfile?.professional_license || 'No especificada',
          university: doctorProfile?.university || 'No especificada',
          phone: appointmentOffice?.phone || doctorProfile?.phone || 'No especificado',
          email: doctorProfile?.email || 'No especificado',
          offices: appointmentOffice ? [{
            id: appointmentOffice.id,
            name: appointmentOffice.name,
            address: appointmentOffice.address,
            city: appointmentOffice.city,
            state: appointmentOffice.state_name,
            country: appointmentOffice.country_name,
            phone: appointmentOffice.phone,
            maps_url: appointmentOffice.maps_url,
            virtual_url: appointmentOffice.virtual_url,
            is_active: appointmentOffice.is_active,
            is_virtual: appointmentOffice.is_virtual,
            timezone: appointmentOffice.timezone
          }] : (doctorProfile?.offices && doctorProfile.offices.length > 0 ? doctorProfile.offices : [])
        }}
        consultation={{
          id: consultation?.id || 0,
          date: consultation?.date || formData.date,
          time: consultation?.time || '10:00',
          type: consultation?.consultation_type || 'Seguimiento',
          reason: consultation?.chief_complaint || formData.chief_complaint || '',
          diagnosis: (consultation?.primary_diagnosis && consultation.primary_diagnosis.trim() !== '') 
            ? consultation.primary_diagnosis 
            : (formData.primary_diagnosis && formData.primary_diagnosis.trim() !== '') 
              ? formData.primary_diagnosis 
              : 'No especificado',
          notes: consultation?.notes || '',
          treatment_plan: consultation?.treatment_plan || formData.treatment_plan || '',
        }}
        medications={(prescriptions || []).map(prescription => ({
          name: prescription.medication_name,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions || '',
          quantity: prescription.quantity || 0,
          via_administracion: prescription.via_administracion || undefined
        }))}
        studies={(studies || []).map(study => ({
          name: study.study_name,
          type: study.study_type,
          category: study.study_type, // Using study_type as category
          description: study.study_name || 'Sin descripción',
          instructions: study.study_name || 'Seguir indicaciones del laboratorio',
          urgency: study.urgency || 'Rutina'
        }))}
        variant="outlined"
        size="small"
        direction="row"
        spacing={1}
        showDivider={true}
      />
    </Box>
  );
};


