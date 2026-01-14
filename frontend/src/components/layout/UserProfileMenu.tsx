
import React, { useMemo, useState } from 'react';
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
  Logout as LogoutIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { AvatarManagerDialog } from '../dialogs/AvatarManagerDialog';
import { API_CONFIG } from '../../constants';

interface UserProfileMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
  doctorProfile: any;
  user: any;
  onAvatarUpdated?: () => Promise<void> | void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onViewProfile,
  onLogout,
  doctorProfile,
  user,
  onAvatarUpdated
}) => {
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const rawAvatarUrl = useMemo(() => {
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

  const resolvedAvatarUrl = useMemo(() => {
    if (!rawAvatarUrl) return undefined;
    let url = rawAvatarUrl;
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
  }, [rawAvatarUrl, doctorProfile?.avatar_file_path, doctorProfile?.avatar_template_key, doctorProfile?.updated_at]);

  const avatarInitials = useMemo(() => {
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

  const handleOpenAvatarDialog = () => {
    onClose();
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();
    setAvatarDialogOpen(true);
  };

  const handleCloseAvatarDialog = () => {
    setAvatarDialogOpen(false);
  };

  const handleAvatarUpdatedInternal = async () => {
    if (onAvatarUpdated) {
      await onAvatarUpdated();
    }
    setAvatarDialogOpen(false);
  };
  
  return (
    <>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={open}
        onClose={onClose}
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
              src={resolvedAvatarUrl}
              sx={{
                width: 48,
                height: 48,
                bgcolor: resolvedAvatarUrl ? 'transparent' : 'primary.main',
                fontSize: '1.2rem'
              }}
            >
              {avatarInitials}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {doctorProfile
                  ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.name}`
                  : user?.person
                    ? user.person.name
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

        <MenuItem onClick={() => { onClose(); onViewProfile(); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Configuración</Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={handleOpenAvatarDialog}>
          <ListItemIcon>
            <PhotoCameraIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Cambiar avatar</Typography>
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            onClose();
            onLogout();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Cerrar Sesión</Typography>
          </ListItemText>
        </MenuItem>
      </Menu>

      <AvatarManagerDialog
        open={avatarDialogOpen}
        onClose={handleCloseAvatarDialog}
        onAvatarUpdated={handleAvatarUpdatedInternal}
      />
    </>
  );
};
