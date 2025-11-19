import React from 'react';
import {
  Box,
  Paper,
  Typography,
  MenuList,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PatientIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Analytics as AnalyticsIcon,
  Palette as StyleGuideIcon,
} from '@mui/icons-material';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const MAIN_NAVIGATION_ITEMS: NavigationItem[] = [
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
    label: 'Citas',
    icon: <CalendarIcon />
  },
  {
    id: 'analytics',
    label: 'Analíticas',
    icon: <AnalyticsIcon />
  }
];

interface MainNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  items?: NavigationItem[];
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  activeView,
  onViewChange,
  items = MAIN_NAVIGATION_ITEMS
}) => {

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 260 },
        flex: { xs: '1 1 100%', md: '0 0 260px' },
        position: 'sticky',
        top: 24
      }}
    >
      <Paper
        sx={{
          p: 3,
          mb: 2,
          width: '100%'
        }}
      >
        <Typography variant="h6" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
          Panel de Control
        </Typography>
        <MenuList sx={{ gap: 1 }}>
          {items.map((item) => (
            <ListItemButton
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
            </ListItemButton>
          ))}
        </MenuList>
      </Paper>
    </Box>
  );
};
