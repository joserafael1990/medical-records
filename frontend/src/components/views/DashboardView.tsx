import React, { memo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,

  useTheme,
  alpha
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  Message as MessageIcon,
  Check as CheckIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  PersonAdd as PersonAddIcon,
  EventNote as EventNoteIcon,
  Assignment as AssignmentIcon,
  LocalHospital as LocalHospitalIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DashboardData } from '../../types';
import {
  StatWidget,
  ActivityWidget,
  ProgressWidget,
  QuickActionsWidget,
  MedicalDashboardWidgets
} from '../common/DashboardWidgets';
import { useDashboardData, useRecentActivities, usePendingTasks } from '../../hooks/useDashboardData';
import { DashboardSkeleton } from '../common/SkeletonComponents';
import { LoadingState } from '../common/LoadingStates';

interface DashboardViewProps {
  dashboardData: DashboardData | null;
  todayAppointments?: any[]; // Add today's appointments
  onNewAppointment?: () => void;
  onNewConsultation?: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  dashboardData, 
  todayAppointments = [],
  onNewAppointment, 
  onNewConsultation 
}) => {
  const theme = useTheme();
  
  // Use new dashboard data hooks
  const { 
    data: dashboardDataNew, 
    isLoading, 
    error, 
    refreshData,
    lastRefresh
  } = useDashboardData();
  
  const { activities } = useRecentActivities();
  const { tasks } = usePendingTasks();

  // Use new data if available, fallback to old prop data
  const stats = dashboardDataNew?.stats || {
    todayAppointments: dashboardData?.today_appointments || 0,
    totalPatients: 150,
    pendingStudies: 8,
    completedConsultations: 45,
    newPatientsThisMonth: 12,
    appointmentsTrend: 8.5,
    patientsTrend: 15.2,
    revenue: 0,
    revenueTrend: 0
  };

  // Quick actions configuration
  const quickActions = [
    {
      id: 'new-patient',
      label: 'Nuevo Paciente',
      icon: <PersonAddIcon />,
      color: 'primary' as const,
      onClick: () => console.log('New patient')
    },
    {
      id: 'new-appointment',
      label: 'Nueva Cita',
      icon: <EventNoteIcon />,
      color: 'secondary' as const,
      onClick: onNewAppointment || (() => console.log('New appointment'))
    },
    {
      id: 'new-consultation',
      label: 'Nueva Consulta',
      icon: <LocalHospitalIcon />,
      color: 'success' as const,
      onClick: onNewConsultation || (() => console.log('New consultation'))
    },
    {
      id: 'review-studies',
      label: 'Revisar Estudios',
      icon: <AssignmentIcon />,
      color: 'warning' as const,
      onClick: () => console.log('Review studies'),
      badge: stats.pendingStudies
    }
  ];
  return (
    <LoadingState
      isLoading={isLoading}
      error={error}
      loadingComponent={<DashboardSkeleton />}
      onRetry={refreshData}
    >
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Buenos días, {dashboardData?.physician || 'Dr. García'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
                Aquí tienes un resumen de tu día y métricas actualizadas.
        </Typography>
              {lastRefresh && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Última actualización: {lastRefresh.toLocaleTimeString('es-MX')}
                  </Typography>
              )}
                </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refreshData}
              size="small"
            >
              Actualizar
            </Button>
              </Box>
        </Box>
        
        {/* Key Metrics Row */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 3,
            mb: 4
          }}
        >
          <MedicalDashboardWidgets.TodayAppointments
            title="Citas Hoy"
            value={stats.todayAppointments}
            change={stats.appointmentsTrend}
            changeLabel="vs ayer"
            trend={stats.appointmentsTrend > 0 ? 'up' : 'down'}
            onRefresh={refreshData}
          />
          <MedicalDashboardWidgets.TotalPatients
            title="Total Pacientes"
            value={stats.totalPatients}
            change={stats.patientsTrend}
            changeLabel="este mes"
            trend="up"
            subtitle={`${stats.newPatientsThisMonth} nuevos este mes`}
            onRefresh={refreshData}
          />
          <MedicalDashboardWidgets.PendingStudies
            title="Estudios Pendientes"
            value={stats.pendingStudies}
            subtitle="Requieren revisión"
            onRefresh={refreshData}
          />
          <MedicalDashboardWidgets.CompletedConsultations
            title="Consultas Completadas"
            value={stats.completedConsultations}
            subtitle="Este mes"
            onRefresh={refreshData}
          />
        </Box>

        {/* Main Content Grid */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { 
              xs: '1fr', 
              md: '1fr 1fr', 
              lg: '1fr 1fr 1fr' 
            },
            gap: 3,
            mb: 3
          }}
        >
          {/* Quick Actions */}
          <QuickActionsWidget
            title="Acciones Rápidas"
            actions={quickActions}
            layout="grid"
          />

          {/* Recent Activity */}
          <ActivityWidget
            title="Actividad Reciente"
            activities={activities}
            maxItems={5}
            showViewAll={true}
            onRefresh={refreshData}
          />

          {/* Performance Progress */}
          <ProgressWidget
            title="Productividad Diaria"
            progress={dashboardDataNew?.performanceMetrics?.consultationsPerDay || 12}
            target={15}
            unit=" consultas"
            color="primary"
            subtitle="Meta diaria de consultas"
            details={[
              { 
                label: 'Tiempo promedio', 
                value: dashboardDataNew?.performanceMetrics?.averageConsultationTime || 25,
                color: theme.palette.info.main 
              },
              { 
                label: 'Satisfacción', 
                value: Math.round(dashboardDataNew?.performanceMetrics?.patientSatisfaction || 92),
                color: theme.palette.success.main 
              }
            ]}
            onRefresh={refreshData}
          />
        </Box>

        {/* Bottom Grid */}
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 3
          }}
        >
          {/* Today's Appointments */}
          <Box>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
                      color="success"
                  >
                    Nueva Consulta
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {todayAppointments.length > 0 ? todayAppointments.map((appointment, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                        borderRadius: 2,
                        backgroundColor: index === 0 ? alpha(theme.palette.primary.main, 0.1) : 'grey.50',
                        border: '1px solid',
                        borderColor: index === 0 ? 'primary.main' : 'grey.200',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2
                        }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        backgroundColor: index === 0 ? 'primary.main' : 'grey.400',
                      color: 'white',
                      mr: 2
                    }}>
                      <TimeIcon />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {appointment.appointment_date ? 
                            new Date(appointment.appointment_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) 
                            : 'Sin hora'} - {appointment.patient_name || 'Paciente desconocido'}
                      </Typography>
                        <Typography variant="body2" color="text.secondary">
                        {appointment.appointment_type || appointment.reason || 'Consulta médica'}
                      </Typography>
                    </Box>
                    <Chip
                      label={appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'Confirmada' : 'Pendiente'}
                      size="small"
                      color={appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'success' : 'warning'}
                        variant="outlined"
                    />
                  </Box>
                )) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    p: 4,
                      textAlign: 'center',
                      minHeight: 200
                  }}>
                    <CalendarIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      No hay citas programadas para hoy
                    </Typography>
                      <Typography variant="body2" color="text.secondary">
                      Usa el botón "Nueva Cita" para programar una consulta
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
          </Box>

          {/* Pending Tasks */}
          <Box>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Tareas Pendientes
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tasks.map((task) => (
                    <Box
                      key={task.id}
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        backgroundColor: task.priority === 'high' ? alpha(theme.palette.error.main, 0.05) : 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: task.priority === 'high' ? 'error.main' : 'primary.main',
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                          {task.title}
                        </Typography>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Vence: {new Date(task.dueDate).toLocaleDateString('es-MX')}
                      </Typography>
                    </Box>
                  ))}
                  {tasks.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <CheckIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        ¡No hay tareas pendientes!
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </LoadingState>
  );
};

export default memo(DashboardView);
