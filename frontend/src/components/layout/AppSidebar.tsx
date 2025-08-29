import React from 'react';
import {
  Box,
  Paper,
  Typography,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PatientIcon,
  MedicalServices as MedicalIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  PersonAdd as PersonAddIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import AvantLogo from '../common/AvantLogo';

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewPatient: () => void;
  onNewConsultation: () => void;
  onNewAppointment: () => void;
  dashboardData?: any;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  activeView,
  onViewChange,
  onNewPatient,
  onNewConsultation,
  onNewAppointment,
  dashboardData
}) => {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      badge: null
    },
    {
      id: 'patients',
      label: 'Pacientes',
      icon: <PatientIcon />,
      badge: dashboardData?.total_patients || null
    },
    {
      id: 'consultations',
      label: 'Consultas',
      icon: <MedicalIcon />,
      badge: dashboardData?.today_consultations || null
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: <ScheduleIcon />,
      badge: dashboardData?.pending_appointments || null
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: <AnalyticsIcon />,
      badge: null
    }
  ];

  const quickActions = [
    {
      label: 'Nuevo Paciente',
      icon: <PersonAddIcon />,
      action: onNewPatient,
      color: 'primary' as const
    },
    {
      label: 'Nueva Consulta',
      icon: <AddIcon />,
      action: onNewConsultation,
      color: 'success' as const
    },
    {
      label: 'Nueva Cita',
      icon: <CalendarIcon />,
      action: onNewAppointment,
      color: 'info' as const
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo Section */}
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <AvantLogo variant="full" />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600, color: 'primary.main' }}>
          Historias Clínicas
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Gestiona las consultas médicas de manera inteligente
        </Typography>
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <Paper sx={{ p: 3, flexGrow: 1 }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
          Navegación Principal
        </Typography>
        
        <MenuList>
          {navigationItems.map((item) => (
            <MenuItem
              key={item.id}
              selected={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              sx={{
                borderRadius: '12px',
                mb: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                }
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: 500 }}
              />
              {item.badge && (
                <Chip
                  label={item.badge}
                  size="small"
                  color={activeView === item.id ? 'default' : 'primary'}
                  variant={activeView === item.id ? 'filled' : 'outlined'}
                />
              )}
            </MenuItem>
          ))}
        </MenuList>
      </Paper>

      {/* Quick Actions Card */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
          Acciones Rápidas
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {quickActions.map((action, index) => (
            <MenuItem
              key={index}
              onClick={action.action}
              sx={{
                borderRadius: '12px',
                mb: 1,
                '&:hover': {
                  backgroundColor: `${action.color}.50`
                }
              }}
            >
              <ListItemIcon sx={{ color: `${action.color}.main` }}>
                {action.icon}
              </ListItemIcon>
              <ListItemText
                primary={action.label}
                primaryTypographyProps={{ 
                  fontWeight: 500,
                  color: `${action.color}.main`
                }}
              />
            </MenuItem>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default AppSidebar;
