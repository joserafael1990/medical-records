import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Add as AddIcon,
  AccountCircle as ProfileIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import CortexLogo from '../common/CortexLogo';

interface AppHeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewPatient: () => void;
  onNewConsultation: () => void;
  onNewAppointment: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
  doctorProfile?: any;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  activeView,
  onViewChange,
  onNewPatient,
  onNewConsultation,
  onNewAppointment,
  onProfileClick,
  onLogout,
  doctorProfile,
  showBackButton = false,
  onBack,
  title
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setProfileMenuOpen(true);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
    setProfileMenuOpen(false);
  };

  const getViewTitle = () => {
    if (title) return title;
    
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'patients': return 'Gestión de Pacientes';
      case 'consultations': return 'Consultas Médicas';
      case 'agenda': return 'Citas';
      case 'profile': return 'Perfil del Médico';
      default: return 'Historias Clínicas';
    }
  };

  const canAddNew = ['patients', 'consultations', 'agenda'].includes(activeView);

  const getAddAction = () => {
    switch (activeView) {
      case 'patients': return onNewPatient;
      case 'consultations': return onNewConsultation;
      case 'agenda': return onNewAppointment;
      default: return onNewPatient;
    }
  };

  const getAddLabel = () => {
    switch (activeView) {
      case 'patients': return 'Nuevo Paciente';
      case 'consultations': return 'Nueva Consulta';
      case 'agenda': return 'Nueva Cita';
      default: return 'Nuevo';
    }
  };

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        bgcolor: 'white', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        {/* Left side - Logo and Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showBackButton && onBack && (
            <IconButton onClick={onBack} sx={{ color: 'primary.main' }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CortexLogo variant="icon" />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: 'primary.main',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              {getViewTitle()}
            </Typography>
          </Box>
        </Box>

        {/* Right side - Actions and Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Quick Add Button */}
          {canAddNew && (
            <IconButton
              onClick={getAddAction()}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                display: { xs: 'none', md: 'flex' }
              }}
              title={getAddLabel()}
            >
              <AddIcon />
            </IconButton>
          )}

          {/* Profile Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {doctorProfile ? 
                  `${doctorProfile.title || 'Dr.'} ${doctorProfile.name}` :
                  'Cargando...'
                }
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {doctorProfile?.professional_license || 'Médico'}
              </Typography>
            </Box>
            
            <IconButton onClick={handleProfileMenuOpen}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                {doctorProfile ? 
                  doctorProfile.name?.split(' ').slice(0, 2).map(n => n[0]).join('') || 'U' :
                  <ProfileIcon />
                }
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={profileMenuOpen}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: { mt: 1, minWidth: 200 }
              }}
            >
              <MenuItem onClick={() => { onProfileClick(); handleProfileMenuClose(); }}>
                <ListItemIcon>
                  <ProfileIcon />
                </ListItemIcon>
                <ListItemText primary="Mi Perfil" />
              </MenuItem>
              
              <MenuItem onClick={() => { onViewChange('settings'); handleProfileMenuClose(); }}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Configuración" />
              </MenuItem>
              
              <MenuItem onClick={() => { onLogout(); handleProfileMenuClose(); }}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Cerrar Sesión" />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;
