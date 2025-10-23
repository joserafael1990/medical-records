import React from 'react';
import {
  Box,
  Paper,
  Typography,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PatientIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  WhatsApp as WhatsAppIcon,
  Analytics as AnalyticsIcon,
  Palette as StyleGuideIcon
} from '@mui/icons-material';

interface MainNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  activeView,
  onViewChange
}) => {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Panel Principal',
      icon: <DashboardIcon />
    },
    {
      id: 'patients',
      label: 'Pacientes',
      icon: <PatientIcon />
    },
    {
      id: 'consultations',
      label: 'Consultas',
      icon: <AssignmentIcon />
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: <CalendarIcon />
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppIcon />
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: <AnalyticsIcon />
    }
  ];

  return (
    <Box sx={{ width: { xs: '100%', md: '25%' }, position: 'sticky', top: 24 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
          Panel de Control
        </Typography>
        <MenuList sx={{ gap: 1 }}>
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
            </MenuItem>
          ))}
        </MenuList>
      </Paper>
    </Box>
  );
};
