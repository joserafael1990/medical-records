import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  LocalHospital as HospitalIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConsultationsViewSmartProps {
  consultations?: any[];
  patients?: any[];
  appointments?: any[];
  successMessage?: string;
  setSuccessMessage?: (message: string) => void;
  handleNewConsultation?: () => void;
  handleEditConsultation?: (consultation: any) => void;
  handleViewConsultation?: (consultation: any) => void;
}

const ConsultationsViewSmart: React.FC<ConsultationsViewSmartProps> = ({
  consultations = [],
  patients = [],
  appointments = [],
  successMessage,
  setSuccessMessage,
  handleNewConsultation,
  handleEditConsultation,
  handleViewConsultation
}) => {
  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'primera-vez':
      case 'Primera vez':
      case 'first_visit':
        return 'Primera vez';
      case 'seguimiento':
      case 'Seguimiento':
      case 'follow_up':
        return 'Seguimiento';
      case 'urgencia':
        return 'Urgencia';
      default:
        return type || 'Seguimiento';
    }
  };

  const getConsultationTypeColor = (type: string) => {
    switch (type) {
      case 'primera-vez':
      case 'Primera vez':
      case 'first_visit':
        return 'primary';
      case 'seguimiento':
      case 'Seguimiento':
      case 'follow_up':
        return 'success';
      case 'urgencia':
        return 'error';
      default:
        return 'default';
    }
  };

  const totalConsultations = consultations.length;
  
  // Calculate today's appointments that can be converted to consultations
  const todayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.appointment_date || appointment.date_time);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString() && 
           appointment.status === 'confirmed';
  });
  
  const todayConsultations = todayAppointments.length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon />
          Consultas Médicas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewConsultation}
          sx={{ borderRadius: 2 }}
        >
          Nueva Consulta
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Consultas
              </Typography>
              <Typography variant="h3" color="primary">
                {totalConsultations}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Citas de Hoy
              </Typography>
              <Typography variant="h3" color="success.main">
                {todayConsultations}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Consultations Table */}
      <Card sx={{ boxShadow: 1 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Historial de Consultas
          </Typography>
          
          {consultations.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="body1" color="text.secondary">
                No hay consultas registradas
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewConsultation}
                sx={{ mt: 2 }}
              >
                Registrar Primera Consulta
              </Button>
            </Paper>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Paciente</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Diagnóstico</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consultations.map((consultation, index) => (
                    <TableRow
                      key={consultation.id || index}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'grey.50'
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon color="action" />
                          <Box>
                            <Typography variant="subtitle2">
                              {consultation.patient_name || 'Paciente no encontrado'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {consultation.patient_id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {consultation.date ? format(new Date(consultation.date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getConsultationTypeLabel(consultation.consultation_type || 'seguimiento')}
                          color={getConsultationTypeColor(consultation.consultation_type || 'seguimiento') as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {consultation.diagnosis || 'Sin diagnóstico registrado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewConsultation?.(consultation)}
                            title="Ver detalles de la consulta"
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleEditConsultation?.(consultation)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConsultationsViewSmart;
