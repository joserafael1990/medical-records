import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  Avatar,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  AccountCircle as ProfileIcon,
  NotificationsNone as NotificationIcon
} from '@mui/icons-material';
import { MainNavigation } from './MainNavigation';
import { UserProfileMenu } from './UserProfileMenu';
import { ViewRenderer } from './ViewRenderer';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface AppLayoutProps {
  activeView: string;
  onViewChange: (view: string) => void;
  dashboardData: any;
  onRefreshDashboard: () => void;
  patientManagement: any;
  consultationManagement: any;
  appointmentManager: any;
  medicalRecordsData: any;
  onRefreshRecords: () => void;
  doctorProfile: any;
  onSaveProfile: (profile: any) => void;
  onLogout: () => void;
  user: any;
  isLoading: boolean;
  doctorProfileHook: any;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeView,
  onViewChange,
  dashboardData,
  onRefreshDashboard,
  patientManagement,
  consultationManagement,
  appointmentManager,
  medicalRecordsData,
  onRefreshRecords,
  doctorProfile: doctorProfileFromProps,
  onSaveProfile,
  onLogout,
  user,
  isLoading,
  doctorProfileHook
}) => {
  // Use the hook passed from App.tsx instead of creating a new instance
  const { doctorProfile } = doctorProfileHook;
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleViewProfile = () => {
    handleUserMenuClose();
    onViewChange('profile');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Top App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            AVANT Medical System
          </Typography>
          
          {/* Status indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
            <Chip 
              label="Sistema Activo" 
              color="success" 
              size="small" 
              variant="outlined"
            />
          </Box>

          {/* Notification icon */}
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <NotificationIcon />
          </IconButton>

          {/* User profile button */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="account-menu"
            aria-haspopup="true"
            onClick={handleUserMenuClick}
            color="inherit"
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'secondary.main',
                fontSize: '0.875rem'
              }}
            >
              {(doctorProfile?.first_name?.[0] || user?.person?.first_name?.[0] || 'U').toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
        
        {/* Loading bar */}
        {isLoading && <LinearProgress />}
      </AppBar>

      {/* User Profile Menu */}
      <UserProfileMenu
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={handleUserMenuClose}
        onViewProfile={handleViewProfile}
        onLogout={onLogout}
        doctorProfile={doctorProfile}
        user={user}
      />

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Sidebar Navigation */}
          <MainNavigation
            activeView={activeView}
            onViewChange={onViewChange}
          />

          {/* Main Content Area */}
          <ViewRenderer
            activeView={activeView}
            dashboardData={dashboardData}
            onRefreshDashboard={onRefreshDashboard}
            patientManagement={patientManagement}
            consultationManagement={consultationManagement}
            appointmentManager={appointmentManager}
            medicalRecordsData={medicalRecordsData}
            onRefreshRecords={onRefreshRecords}
            doctorProfile={doctorProfile}
            onSaveProfile={onSaveProfile}
            doctorProfileHook={doctorProfileHook}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
};
