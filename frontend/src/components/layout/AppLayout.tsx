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
import { twitterTheme } from '../../themes/twitterTheme';
import {
  AccountCircle as ProfileIcon,
  NotificationsNone as NotificationIcon
} from '@mui/icons-material';
import { MainNavigation } from './MainNavigation';
import { UserProfileMenu } from './UserProfileMenu';
import { ViewRenderer } from './ViewRenderer';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { useAppState } from '../../hooks/useAppState';
import { usePatientManagement } from '../../hooks/usePatientManagement';
import { useConsultationManagement } from '../../hooks/useConsultationManagement';
import { useAppointmentManager } from '../../hooks/useAppointmentManager';
import { useAuth } from '../../contexts/AuthContext';
import CortexBrainLogo from '../common/CortexBrainLogo';
// Dialog imports
import PatientDialog from '../dialogs/PatientDialog'; // ✅ Now implemented!
import ConsultationDialog from '../dialogs/ConsultationDialog'; // ✅ Now implemented!  
import AppointmentDialog from '../dialogs/AppointmentDialog'; // ✅ This one works!

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

         const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
           setUserMenuAnchorEl(event.currentTarget);
         };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleViewProfile = () => {
    handleUserMenuClose();
    navigateToView('profile');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Top App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
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
            onViewChange={navigateToView}
          />

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
              await patientManagement.updatePatient(patientManagement.selectedPatient.id, data);
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
          onNewPatient={() => {
            consultationManagement.closeConsultationDialog();
            patientManagement.openPatientDialog();
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
        <AppointmentDialog
          open={appointmentManager.appointmentDialogOpen}
          onClose={appointmentManager.handleCancelAppointment}
          onSubmit={appointmentManager.handleAppointmentSubmit}
          onNewPatient={patientManagement.openPatientDialog}
          onEditPatient={(patient) => patientManagement.openPatientDialog(patient)}
          formData={appointmentManager.appointmentFormData}
          patients={patientManagement.patients}
          isEditing={appointmentManager.isEditingAppointment}
          loading={appointmentManager.isSubmitting}
          formErrorMessage={appointmentManager.appointmentFormErrorMessage}
          fieldErrors={appointmentManager.appointmentFieldErrors}
          onFormDataChange={appointmentManager.setAppointmentFormData}
          doctorProfile={doctorProfile}
        />
      )}
    </ThemeProvider>
  );
};
