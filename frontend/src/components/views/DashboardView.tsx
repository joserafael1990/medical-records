import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  LocalHospital as HospitalIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { formatTime } from '../../utils/formatters';
import { es } from 'date-fns/locale';
import { API_CONFIG } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardViewProps {
  dashboardData?: any;
  appointments?: any[];
  consultations?: any[];
  onNewAppointment?: () => void;
  onNewConsultation?: () => void;
  onNewPatient?: () => void;
  doctorProfile?: any;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  dashboardData,
  appointments = [],
  consultations = [],
  onNewAppointment,
  onNewConsultation,
  onNewPatient,
  doctorProfile
}) => {
  const { user } = useAuth();

  // Debug: Log props when component renders
  //   onNewAppointment: !!onNewAppointment,
  //   onNewConsultation: !!onNewConsultation,
  //   onNewPatient: !!onNewPatient,
  //   appointmentsCount: appointments.length
  // });

  const today = new Date();
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date_time);
    return aptDate.toDateString() === today.toDateString();
  });

  const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'confirmada');
  
  // Calcular consultas completadas - total de consultas (no solo las de hoy)
  const completedConsultations = consultations.length;

  const doctorName = doctorProfile?.full_name || doctorProfile?.name || 'Doctor';

  // Resolver URL del avatar
  const rawAvatarUrl = useMemo(() => {
    const candidates = [
      doctorProfile?.avatar?.avatar_url,
      doctorProfile?.avatar?.url,
      doctorProfile?.avatar_url,
      doctorProfile?.avatarUrl,
      user?.person?.avatar?.avatar_url,
      user?.person?.avatar?.url,
      user?.person?.avatar_url,
      user?.person?.avatarUrl
    ];
    return candidates.find((value) => typeof value === 'string' && value.length > 0);
  }, [doctorProfile, user]);

  const resolvedAvatarUrl = useMemo(() => {
    if (!rawAvatarUrl) return undefined;
    let url = rawAvatarUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const normalized = url.startsWith('/') ? url : `/${url}`;
      url = `${API_CONFIG.BASE_URL}${normalized}`;
    }
    // Add cache busting parameter based on avatar metadata to force reload when avatar changes
    const cacheKey = doctorProfile?.avatar_file_path || doctorProfile?.avatar_template_key || doctorProfile?.updated_at;
    if (cacheKey) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}_t=${typeof cacheKey === 'string' ? cacheKey : cacheKey?.toString() || Date.now()}`;
    }
    return url;
  }, [rawAvatarUrl, doctorProfile?.avatar_file_path, doctorProfile?.avatar_template_key, doctorProfile?.updated_at]);

  // Calcular iniciales del médico
  const avatarInitials = useMemo(() => {
    const nameSource = doctorProfile?.name || user?.person?.name || '';
    if (!nameSource) return 'D';
    return nameSource
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  }, [doctorProfile?.name, user?.person?.name]);

  // Determinar si debe mostrar avatar o iniciales
  const shouldShowInitials = !resolvedAvatarUrl || doctorProfile?.avatar_type === 'initials';

  const quickActions = [
    
    {
      label: 'Nuevo Paciente',
      icon: <PersonIcon />,
      action: onNewPatient,
      color: 'info',
      description: 'Dar de alta a nuevo paciente'
    },
    {
      label: 'Nueva Cita',
      icon: <CalendarIcon />,
      action: onNewAppointment,
      color: 'primary',
      description: 'Agendar próxima visita del paciente'
    },
    {
      label: 'Nueva Consulta',
      icon: <HospitalIcon />,
      action: onNewConsultation,
      color: 'success',
      description: 'Registrar atención médica del día'
    }

  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Paper
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 4,
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={shouldShowInitials ? undefined : resolvedAvatarUrl}
              sx={{
                width: 64,
                height: 64,
                bgcolor: shouldShowInitials ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontSize: '1.5rem',
                color: 'primary.contrastText',
                fontWeight: 600
              }}
            >
              {shouldShowInitials ? avatarInitials : undefined}
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ mb: 1 }}>
                ¡Bienvenido, {doctorName}! 👋
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Aquí tienes un resumen de tu actividad médica de hoy.
          </Typography>
        </Box>
        
        {/* Decorative circle */}
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
            zIndex: 0
          }}
        />
      </Paper>

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ 
            bgcolor: 'background.paper',
            '&:hover': {
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <TrendingIcon sx={{ fontSize: 40, mb: 1, color: 'success.main' }} />
              <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
                {confirmedAppointments.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Citas Confirmadas
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Card sx={{ 
            bgcolor: 'background.paper',
            '&:hover': {
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <HospitalIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
              <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
                {completedConsultations}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Consultas Completadas
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
            <NotificationIcon color="primary" />
            Acciones Rápidas
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
            gap: 2 
          }}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="contained"
                size="large"
                color={action.color as any}
                startIcon={action.icon}
                onClick={(e) => {
                  if (action.action) {
                    action.action();
                  } else {
                  }
                }}
                sx={{
                  py: 2,
                  px: 3,
                  flexDirection: 'column',
                  height: 'auto',
                  minHeight: 80,
                  '&:hover': {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                  }
                }}
              >
                <Typography variant="button" sx={{ mb: 0.5 }}>
                  {action.label}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, textAlign: 'center', lineHeight: 1.2 }}>
                  {action.description}
                </Typography>
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Today's Schedule Preview */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
            <CalendarIcon color="primary" />
            Agenda de Hoy
          </Typography>
          
          {todayAppointments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                No tienes citas programadas para hoy 
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onNewAppointment}
              >
                Programar Primera Cita
              </Button>
            </Box>
          ) : (
            <Box>
              {todayAppointments.map((appointment, index) => (
                <Box
                  key={appointment.id || index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 2,
                    '&:last-child': { mb: 0 },
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {appointment.patient?.first_name?.[0] || 'P'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(appointment.date_time)} - {appointment.appointment_type_name || 'Cita'}
                    </Typography>
                  </Box>
                  <Chip
                    label={appointment.status === 'confirmada' ? 'Confirmada' : appointment.status === 'por_confirmar' ? 'Por confirmar' : appointment.status}
                    color={appointment.status === 'confirmada' ? 'success' : appointment.status === 'por_confirmar' ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardView;
