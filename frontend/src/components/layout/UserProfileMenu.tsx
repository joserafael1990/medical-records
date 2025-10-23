
import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Avatar,
  Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

interface UserProfileMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
  doctorProfile: any;
  user: any;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onViewProfile,
  onLogout,
  doctorProfile,
  user
}) => {
  
  return (
    <Menu
      anchorEl={anchorEl}
      id="account-menu"
      open={open}
      onClose={onClose}
      onClick={onClose}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          mt: 1.5,
          minWidth: 280,
          '& .MuiAvatar-root': {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.main',
              fontSize: '1.2rem'
            }}
          >
            {(doctorProfile?.first_name?.[0] || user?.person?.first_name?.[0] || 'U').toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {doctorProfile
                ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.paternal_surname}`
                : user?.person
                  ? `${user.person.first_name} ${user.person.paternal_surname}`
                  : 'Usuario'}
            </Typography>
            {(doctorProfile?.specialties?.[0]?.name || user?.person?.specialties?.[0]?.name) && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {doctorProfile?.specialties?.[0]?.name || user?.person?.specialties?.[0]?.name}
              </Typography>
            )}
            {(doctorProfile?.professional_license || user?.person?.professional_license) && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                Cédula: {doctorProfile?.professional_license || user?.person?.professional_license}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <MenuItem onClick={onViewProfile}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2">Configuración</Typography>
        </ListItemText>
      </MenuItem>

      <Divider />

      <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2">Cerrar Sesión</Typography>
        </ListItemText>
      </MenuItem>
    </Menu>
  );
};
