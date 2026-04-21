import React, { useMemo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Paper,
  LinearProgress,
  Stack,
  Skeleton
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  LocalHospital as HospitalIcon,
  Notifications as NotificationIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { formatTime } from '../../utils/formatters';
import { es } from 'date-fns/locale';
import { API_CONFIG } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import ProfileCompletionBanner from '../common/ProfileCompletionBanner';
import { DashboardAgendaWidget } from './DashboardAgendaWidget';

interface DashboardViewProps {
  dashboardData?: any;
  appointments?: any[];
  consultations?: any[];
  onNewAppointment?: () => void;
  onNewConsultation?: () => void;
  onNewPatient?: () => void;
  /** Navigate to the full AgendaView (agenda tab). Used by the
   *  dashboard agenda widget's "Ver todas" CTA. */
  onNavigateToAgenda?: () => void;
  doctorProfile?: any;
  onNavigateToProfile?: (anchor?: string) => void;
  isLoading?: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  dashboardData,
  appointments = [],
  consultations = [],
  onNewAppointment,
  onNewConsultation,
  onNewPatient,
  onNavigateToAgenda,
  doctorProfile,
  onNavigateToProfile,
  isLoading = false
}) => {
  const { user } = useAuth();

  const today = new Date();
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date_time);
    return aptDate.toDateString() === today.toDateString();
  });

  const confirmedAppointments = todayAppointments.filter(apt => apt.status === 'confirmada');

  // Upcoming appointments: from now, next 5 ordered chronologically.
  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter((apt) => new Date(apt.date_time).getTime() >= now)
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
      .slice(0, 5);
  }, [appointments]);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }, []);

  const consultationsThisWeek = consultations.filter((c: any) => {
    const d = c.consultation_date || c.created_at;
    return d && new Date(d).getTime() >= startOfWeek;
  }).length;

  const newPatientsThisWeek = useMemo(() => {
    // Infer from consultations: unique patient_ids whose earliest consultation is <7 days old.
    const byPatient: Record<string, number> = {};
    for (const c of consultations as any[]) {
      if (!c.patient_id) continue;
      const d = new Date(c.consultation_date || c.created_at || 0).getTime();
      const key = String(c.patient_id);
      if (!(key in byPatient) || d < byPatient[key]) byPatient[key] = d;
    }
    return Object.values(byPatient).filter((t) => t >= startOfWeek).length;
  }, [consultations, startOfWeek]);

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

  // Compliance alerts (NOM-004 requires cédula profesional on every signed record).
  const missingLicense = !doctorProfile?.professional_license
    && !user?.person?.professional_license;
  const alerts: { severity: 'warning' | 'error' | 'info'; title: string; body: React.ReactNode }[] = [];
  if (missingLicense) {
    alerts.push({
      severity: 'warning',
      title: 'Falta tu cédula profesional',
      body: 'NOM-004-SSA3-2012 exige la cédula en cada expediente firmado. Agrégala desde tu perfil para evitar un hallazgo en auditoría.',
    });
  }

  return (
    <Box sx={{ p: 3 }}>
      <ProfileCompletionBanner
        doctorProfile={doctorProfile}
        onNavigateToProfile={onNavigateToProfile}
      />
      {alerts.length > 0 && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          {alerts.map((alert, i) => (
            <Alert
              key={i}
              severity={alert.severity}
              icon={<BadgeIcon fontSize="inherit" />}
              action={
                onNavigateToProfile ? (
                  <Button color="inherit" size="small" onClick={() => onNavigateToProfile('cedula')}>
                    Ir a mi perfil
                  </Button>
                ) : undefined
              }
            >
              <AlertTitle>{alert.title}</AlertTitle>
              {alert.body}
            </Alert>
          ))}
        </Stack>
      )}

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
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
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
              {isLoading ? (
                <Skeleton variant="text" width={60} height={72} sx={{ mx: 'auto', mb: 1 }} />
              ) : (
                <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
                  {confirmedAppointments.length}
                </Typography>
              )}
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
              {isLoading ? (
                <Skeleton variant="text" width={60} height={72} sx={{ mx: 'auto', mb: 1 }} />
              ) : (
                <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
                  {consultationsThisWeek}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Consultas esta semana
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
              <PersonIcon sx={{ fontSize: 40, mb: 1, color: 'info.main' }} />
              {isLoading ? (
                <Skeleton variant="text" width={60} height={72} sx={{ mx: 'auto', mb: 1 }} />
              ) : (
                <Typography variant="h2" sx={{ mb: 1, color: 'text.primary' }}>
                  {newPatientsThisWeek}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Pacientes nuevos esta semana
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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2 
          }}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="contained"
                size="large"
                color={action.color as any}
                startIcon={action.icon}
                disabled={!action.action}
              onClick={() => action.action?.()}
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

      {/* Agenda — compact Day / Week / Month quick view */}
      <DashboardAgendaWidget
        appointments={appointments}
        onNewAppointment={onNewAppointment}
        onViewAllInAgenda={onNavigateToAgenda}
      />
    </Box>
  );
};

export default DashboardView;
