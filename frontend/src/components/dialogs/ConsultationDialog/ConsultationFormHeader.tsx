import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { parseBackendDate } from '../../../utils/formatters';

interface ConsultationFormHeaderProps {
  isEditing: boolean;
  onClose: () => void;
  // Appointment selection props
  isNewConsultation: boolean;
  availableAppointments: any[];
  selectedAppointmentId: string;
  onAppointmentChange: (appointmentId: string) => void;
  onNewAppointment?: () => void;
}

export const ConsultationFormHeader: React.FC<ConsultationFormHeaderProps> = ({
  isEditing,
  onClose,
  isNewConsultation,
  availableAppointments,
  selectedAppointmentId,
  onAppointmentChange,
  onNewAppointment
}) => {
  // Get consultation type display helper
  const getConsultationTypeDisplay = (type: string) => {
    switch (type) {
      case 'primera vez':
      case 'first_visit':
      case 'Primera vez':
        return 'Primera vez';
      case 'seguimiento':
      case 'follow_up':
      case 'Seguimiento':
        return 'Seguimiento';
      default:
        return type || 'No especificado';
    }
  };

  return (
    <>
      {/* Appointment Selection - Only show for new consultations */}
      {isNewConsultation && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon sx={{ fontSize: 20 }} />
            Seleccionar Cita
            <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
          </Typography>
        
          {availableAppointments.length === 0 ? (
            <Box sx={{ 
              border: '1px dashed', 
              borderColor: 'grey.300', 
              borderRadius: 1, 
              p: 3, 
              textAlign: 'center',
              bgcolor: 'grey.50'
            }}>
              <CalendarIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No hay citas programadas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Para crear una nueva consulta, primero debe programar una cita
              </Typography>
              <Button
                variant="contained"
                startIcon={<CalendarIcon />}
                onClick={() => {
                  if (onNewAppointment) {
                    onNewAppointment();
                  }
                }}
                sx={{ mt: 1 }}
              >
                Crear Nueva Cita
              </Button>
            </Box>
          ) : (
            <FormControl size="small" fullWidth>
              <InputLabel>Citas Programadas</InputLabel>
              <Select
                value={selectedAppointmentId || ''}
                onChange={(e: any) => {
                  onAppointmentChange(e.target.value);
                }}
                label="Citas Programadas"
              >
                {availableAppointments.map((appointment: any) => {
                  const patient = appointment.patient;
                  
                  const appointmentDate = parseBackendDate(appointment.appointment_date).toLocaleDateString('es-ES', {
                    timeZone: 'America/Mexico_City'
                  });
                  const appointmentTime = parseBackendDate(appointment.appointment_date).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'America/Mexico_City'
                  });
                  
                  const consultationType = getConsultationTypeDisplay(appointment.consultation_type);
                  
                  const patientName = appointment.patient_name || 
                    (patient ? `${patient.first_name || ''} ${patient.paternal_surname || ''}`.trim() : 'Paciente no encontrado');
                  
                  return (
                    <MenuItem key={appointment.id} value={appointment.id.toString()}>
                      {patientName} - {appointmentDate} {appointmentTime} - {consultationType}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
        </Box>
      )}
    </>
  );
};

