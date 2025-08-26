import React, { memo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  Message as MessageIcon,
  Check as CheckIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { DashboardData } from '../../types';

interface DashboardViewProps {
  dashboardData: DashboardData | null;
  onNewAppointment?: () => void;
  onNewConsultation?: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  dashboardData, 
  onNewAppointment, 
  onNewConsultation 
}) => {
  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Buenos días, {dashboardData?.physician || 'Dr. García'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aquí tienes un resumen de tu día y métricas de eficiencia.
        </Typography>
      </Box>

      {/* Key Metrics Row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.today_appointments || 8}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Citas Hoy
                  </Typography>
                </Box>
                <CalendarIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #34A853 0%, #FBBC04 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.ai_time_saved || 2.5}h
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tiempo Ahorrado
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #FBBC04 0%, #EA4335 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.whatsapp_messages || 2}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Mensajes Pendientes
                  </Typography>
                </Box>
                <MessageIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #EA4335 0%, #4285F4 100%)',
            color: 'white',
            border: 'none'
          }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.compliance_score || 100}%
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Cumplimiento
                  </Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Main Content Row */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Today's Schedule */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 65%' } }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Agenda de Hoy
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={onNewAppointment}
                  >
                    Nueva Cita
                  </Button>
                  <Button 
                    variant="contained" 
                    size="small" 
                    startIcon={<AddIcon />}
                    onClick={onNewConsultation}
                    sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                  >
                    Nueva Consulta
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { time: '09:00', patient: 'María González', type: 'Consulta General', status: 'confirmed' },
                  { time: '10:30', patient: 'Carlos Hernández', type: 'Seguimiento', status: 'confirmed' },
                  { time: '12:00', patient: 'Ana Rodríguez', type: 'Consulta General', status: 'pending' },
                  { time: '14:00', patient: 'Luis Martínez', type: 'Revisión', status: 'confirmed' },
                ].map((appointment, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: '12px',
                      backgroundColor: index === 1 ? 'primary.light' : 'grey.50',
                      color: index === 1 ? 'white' : 'text.primary',
                      border: index === 1 ? 'none' : '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: '12px',
                      backgroundColor: index === 1 ? 'rgba(255,255,255,0.2)' : 'primary.main',
                      color: 'white',
                      mr: 2
                    }}>
                      <TimeIcon />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {appointment.time} - {appointment.patient}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {appointment.type}
                      </Typography>
                    </Box>
                    <Chip
                      label={appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      size="small"
                      color={appointment.status === 'confirmed' ? 'success' : 'warning'}
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        {/* Revenue & Efficiency Panel */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Revenue Card */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Ingresos del Mes
                </Typography>
                <Typography variant="h3" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
                  ${dashboardData?.monthly_revenue?.toLocaleString() || '45,000'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon color="success" sx={{ fontSize: 20 }} />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                    +25% vs mes anterior
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Optimización automática de facturación activa
                </Typography>
              </CardContent>
            </Card>

            {/* Efficiency Metrics */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Métricas de Eficiencia
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tiempo promedio por consulta</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>18 min</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={75} 
                      sx={{ borderRadius: '4px', height: 6 }}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Eficiencia documental</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>94%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={94} 
                      color="success"
                      sx={{ borderRadius: '4px', height: 6 }}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Satisfacción del paciente</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>4.8/5</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={96} 
                      color="info"
                      sx={{ borderRadius: '4px', height: 6 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(DashboardView);
