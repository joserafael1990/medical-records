import React, { useMemo, useState } from 'react';
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
  LinearProgress,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery
} from '@mui/material';
import { twitterTheme } from '../../themes/twitterTheme';
import {
  AccountCircle as ProfileIcon,
  NotificationsNone as NotificationIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { MainNavigation, MAIN_NAVIGATION_ITEMS } from './MainNavigation';
import { UserProfileMenu } from './UserProfileMenu';
import { ViewRenderer } from './ViewRenderer';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { useAppState } from '../../hooks/useAppState';
import { usePatientManagement } from '../../hooks/usePatientManagement';
import { useConsultationManagement } from '../../hooks/useConsultationManagement';
import { useAppointmentManager } from '../../hooks/useAppointmentManager';
import { useAuth } from '../../contexts/AuthContext';
import CortexBrainLogo from '../common/CortexBrainLogo';
import { API_CONFIG } from '../../constants';
// Dialog imports
import PatientDialog from '../dialogs/PatientDialog'; // ✅ Now implemented!
import ConsultationDialog from '../dialogs/ConsultationDialog'; // ✅ Now implemented!  
import AppointmentDialogMultiOffice from '../dialogs/AppointmentDialogMultiOffice'; // ✅ Multi-office support!

// Use Twitter-inspired theme
const theme = twitterTheme;

interface AppLayoutProps {
  // Opcional: se puede pasar onLogout desde AuthContext
  onLogout?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  onLogout
}) => {
  // Initialize all hooks internally
  const { user } = useAuth();
  const appState = useAppState();
  const doctorProfileHook = useDoctorProfile();
  
  // Extract values from hooks
  const { activeView, setActiveView: onViewChange, navigateToView } = appState;
  
  // Initialize management hooks with navigation function
  const patientManagement = usePatientManagement(navigateToView);
  const consultationManagement = useConsultationManagement(navigateToView);
  const appointmentManager = useAppointmentManager(patientManagement.patients, doctorProfileHook.doctorProfile, navigateToView);
  const { doctorProfile, isLoading } = doctorProfileHook;
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

         const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
           setUserMenuAnchorEl(event.currentTarget);
         };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const rawHeaderAvatarUrl = useMemo(() => {
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

  const resolvedHeaderAvatarUrl = useMemo(() => {
    if (!rawHeaderAvatarUrl) return undefined;
    let url = rawHeaderAvatarUrl;
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
  }, [rawHeaderAvatarUrl, doctorProfile?.avatar_file_path, doctorProfile?.avatar_template_key, doctorProfile?.updated_at]);

  const headerAvatarInitials = useMemo(() => {
    const nameSource = doctorProfile?.name || user?.person?.name || '';
    if (!nameSource) return 'U';
    return nameSource
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  }, [doctorProfile?.name, user?.person?.name]);

  const handleViewProfile = () => {
    handleUserMenuClose();
    navigateToView('profile');
  };

  const handleToggleMobileNav = () => {
    setMobileNavOpen(prev => !prev);
  };

  const handleCloseMobileNav = () => {
    setMobileNavOpen(false);
  };

  // Filter navigation items for mobile drawer based on person_type
  const filteredNavItems = useMemo(() => {
    const personType = user?.doctor?.person_type;
    if (personType === 'admin') {
      return MAIN_NAVIGATION_ITEMS; // Admins see all options
    }
    // Non-admins don't see "Licencias"
    return MAIN_NAVIGATION_ITEMS.filter(item => item.id !== 'licenses');
  }, [user?.doctor?.person_type]);

  const renderMobileDrawer = (
    <Box
      role="presentation"
      sx={{ width: 250 }}
      onClick={handleCloseMobileNav}
      onKeyDown={handleCloseMobileNav}
    >
      <Box sx={{ p: 2 }}>
        <CortexBrainLogo sx={{ fontSize: 44 }} />
      </Box>
      <Divider />
      <List>
        {filteredNavItems.map((item) => {
          const handleSelect = () => {
            navigateToView(item.id);
            handleCloseMobileNav();
          };

          return (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={activeView === item.id}
                onClick={handleSelect}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Top App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleToggleMobileNav}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <CortexBrainLogo sx={{ flexGrow: 1 }} />
          
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
              src={resolvedHeaderAvatarUrl}
              sx={{
                width: 32,
                height: 32,
                bgcolor: resolvedHeaderAvatarUrl ? 'transparent' : 'secondary.main',
                fontSize: '0.875rem'
              }}
            >
              {headerAvatarInitials}
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
        onAvatarUpdated={async () => {
          // Small delay to ensure backend has processed the avatar update
          await new Promise(resolve => setTimeout(resolve, 300));
          // Force refresh profile to get updated avatar (bypass cache)
          await doctorProfileHook.fetchProfile(true);
        }}
      />

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          <Drawer
            anchor="left"
            open={mobileNavOpen}
            onClose={handleCloseMobileNav}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 }
            }}
          >
            {renderMobileDrawer}
          </Drawer>

          {/* Sidebar Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <MainNavigation
              activeView={activeView}
              onViewChange={navigateToView}
              personType={user?.doctor?.person_type}
            />
          </Box>

          {/* Main Content Area */}
          <ViewRenderer
            activeView={activeView}
            dashboardData={{}}
            onRefreshDashboard={() => {}}
            patientManagement={patientManagement}
            consultationManagement={consultationManagement}
            appointmentManager={appointmentManager}
            doctorProfile={doctorProfile}
            onSaveProfile={doctorProfileHook.handleSubmit}
            doctorProfileHook={doctorProfileHook}
            personType={user?.doctor?.person_type}
          />
        </Box>
      </Container>

      {/* Global Dialogs - Rendered here so they work from any view */}
      {patientManagement.patientDialogOpen && (
        <PatientDialog
          open={patientManagement.patientDialogOpen}
          onClose={patientManagement.closePatientDialog}
          patient={patientManagement.selectedPatient}
          doctorProfile={doctorProfile}
          onSubmit={async (data) => {
            if (patientManagement.selectedPatient) {
              await patientManagement.updatePatient(String(patientManagement.selectedPatient.id), data);
            } else {
              await patientManagement.createPatient(data);
            }
            patientManagement.closePatientDialog();
            patientManagement.fetchPatients();
          }}
        />
      )}

      {consultationManagement.consultationDialogOpen && (
        <ConsultationDialog
          open={consultationManagement.consultationDialogOpen}
          onClose={consultationManagement.closeConsultationDialog}
          patients={patientManagement.patients}
          consultation={consultationManagement.selectedConsultation}
          doctorProfile={doctorProfile}
          appointments={consultationManagement.allAvailableAppointments}
          onNewAppointment={() => {
            consultationManagement.closeConsultationDialog();
            appointmentManager.handleNewAppointment();
          }}
          onSubmit={async (data) => {
            if (consultationManagement.selectedConsultation) {
              const updatedConsultation = await consultationManagement.updateConsultation(consultationManagement.selectedConsultation.id, data);
              consultationManagement.closeConsultationDialog();
              consultationManagement.fetchConsultations();
              // Also refresh patients list in case a new patient was created
              patientManagement.fetchPatients();
              return updatedConsultation;
            } else {
              const createdConsultation = await consultationManagement.createConsultation(data);
              consultationManagement.closeConsultationDialog();
              consultationManagement.fetchConsultations();
              // Also refresh patients list in case a new patient was created
              patientManagement.fetchPatients();
              return createdConsultation;
            }
          }}
        />
      )}

      {appointmentManager.appointmentDialogOpen && (
        <AppointmentDialogMultiOffice
          open={appointmentManager.appointmentDialogOpen}
          onClose={appointmentManager.handleCancelAppointment}
          onSubmit={appointmentManager.handleAppointmentSubmit}
          onNewPatient={patientManagement.openPatientDialog}
          onEditPatient={(patient) => patientManagement.openPatientDialog(patient)}
          formData={appointmentManager.appointmentFormData}
          patients={patientManagement.patients}
          isEditing={appointmentManager.isEditingAppointment}
          loading={appointmentManager.isSubmitting}
          formErrorMessage={appointmentManager.formErrorMessage || undefined}
          fieldErrors={appointmentManager.fieldErrors}
          onFormDataChange={appointmentManager.setAppointmentFormData}
          doctorProfile={doctorProfile}
        />
      )}
    </ThemeProvider>
  );
};
