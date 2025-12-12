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
  VpnKey as LicenseIcon,
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
  },
  {
    id: 'licenses',
    label: 'Licencias',
    icon: <LicenseIcon />
  }
];

interface MainNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  items?: NavigationItem[];
  personType?: string; // 'doctor', 'patient', 'admin'
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  activeView,
  onViewChange,
  items = MAIN_NAVIGATION_ITEMS,
  personType
}) => {
  // Filter navigation items based on person_type
  // Only admins can see the "Licencias" option
  const filteredItems = React.useMemo(() => {
    if (personType === 'admin') {
      return items; // Admins see all options
    }
    // Non-admins don't see "Licencias"
    return items.filter(item => item.id !== 'licenses');
  }, [items, personType]);

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
          {filteredItems.map((item) => (
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
