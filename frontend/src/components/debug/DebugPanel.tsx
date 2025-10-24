import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  MedicalServices as MedicalServicesIcon,
  WhatsApp as WhatsAppIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface DebugData {
  status: string;
  timestamp: string;
  [key: string]: any;
}

interface FullSystemDebug {
  status: string;
  timestamp: string;
  office_system: DebugData;
  appointment_system: DebugData;
  consultation_system: DebugData;
  whatsapp_system: DebugData;
  pdf_system: DebugData;
}

const DebugPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<FullSystemDebug | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiService.get<FullSystemDebug>('/api/debug/full-system');
      setDebugData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando información de debugging...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error al cargar datos de debugging: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BugReportIcon sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Panel de Debugging - Sistema Multi-Consultorio
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchDebugData}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {debugData && (
        <Grid container spacing={3}>
          {/* Office System */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Sistema de Consultorios</Typography>
                  <Chip
                    label={`${getStatusIcon(debugData.office_system.status)} ${debugData.office_system.status}`}
                    color={getStatusColor(debugData.office_system.status) as any}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Total consultorios: {debugData.office_system.total_offices || 0}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Doctores sin consultorio: {debugData.office_system.doctors_without_offices || 0}
                </Typography>

                {debugData.office_system.offices && debugData.office_system.offices.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Consultorios ({debugData.office_system.offices.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Nombre</TableCell>
                              <TableCell>Doctor ID</TableCell>
                              <TableCell>Ciudad</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {debugData.office_system.offices.map((office: any) => (
                              <TableRow key={office.id}>
                                <TableCell>{office.id}</TableCell>
                                <TableCell>{office.name}</TableCell>
                                <TableCell>{office.doctor_id}</TableCell>
                                <TableCell>{office.city}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Appointment System */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Sistema de Citas</Typography>
                  <Chip
                    label={`${getStatusIcon(debugData.appointment_system.status)} ${debugData.appointment_system.status}`}
                    color={getStatusColor(debugData.appointment_system.status) as any}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total citas: {debugData.appointment_system.total_appointments || 0}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Sin consultorio: {debugData.appointment_system.appointments_without_office || 0}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sin tipo: {debugData.appointment_system.appointments_without_type || 0}
                </Typography>

                {debugData.appointment_system.appointment_types && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipos de Cita:</Typography>
                    {debugData.appointment_system.appointment_types.map((type: any) => (
                      <Chip
                        key={type.id}
                        label={`${type.name} (ID: ${type.id})`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Consultation System */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MedicalServicesIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Sistema de Consultas</Typography>
                  <Chip
                    label={`${getStatusIcon(debugData.consultation_system.status)} ${debugData.consultation_system.status}`}
                    color={getStatusColor(debugData.consultation_system.status) as any}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total consultas: {debugData.consultation_system.total_medical_records || 0}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Sin consultorio: {debugData.consultation_system.records_without_office || 0}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sin tipo: {debugData.consultation_system.records_without_type || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* WhatsApp System */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WhatsAppIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Sistema WhatsApp</Typography>
                  <Chip
                    label={`${getStatusIcon(debugData.whatsapp_system.status)} ${debugData.whatsapp_system.status}`}
                    color={getStatusColor(debugData.whatsapp_system.status) as any}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Citas con WhatsApp: {debugData.whatsapp_system.appointments_with_whatsapp || 0}
                </Typography>
                
                {debugData.whatsapp_system.whatsapp_config && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Configuración:</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phone ID: {debugData.whatsapp_system.whatsapp_config.phone_id || 'No configurado'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Token: {debugData.whatsapp_system.whatsapp_config.access_token || 'No configurado'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      API Version: {debugData.whatsapp_system.whatsapp_config.api_version || 'No configurado'}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* PDF System */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PdfIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Sistema PDF</Typography>
                  <Chip
                    label={`${getStatusIcon(debugData.pdf_system.status)} ${debugData.pdf_system.status}`}
                    color={getStatusColor(debugData.pdf_system.status) as any}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Doctores con consultorios: {debugData.pdf_system.doctors_with_offices || 0}
                </Typography>

                {debugData.pdf_system.pdf_data && debugData.pdf_system.pdf_data.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Doctores y Consultorios</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Doctor</TableCell>
                              <TableCell>Consultorios</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {debugData.pdf_system.pdf_data.map((doctor: any) => (
                              <TableRow key={doctor.id}>
                                <TableCell>{doctor.name}</TableCell>
                                <TableCell>
                                  {doctor.offices.map((office: any) => (
                                    <Chip
                                      key={office.id}
                                      label={office.name}
                                      size="small"
                                      sx={{ mr: 1, mb: 1 }}
                                    />
                                  ))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Status */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Estado General del Sistema
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" sx={{ mr: 2 }}>
                    Última actualización: {new Date(debugData.timestamp).toLocaleString()}
                  </Typography>
                  <Chip
                    label={`${getStatusIcon(debugData.status)} ${debugData.status}`}
                    color={getStatusColor(debugData.status) as any}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  Este panel muestra el estado actual del sistema multi-consultorio. 
                  Use los botones de actualización para obtener información en tiempo real.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DebugPanel;

