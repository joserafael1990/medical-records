import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, RestartAlt as RestartAltIcon, Upload as UploadIcon, Image as ImageIcon } from '@mui/icons-material';
import { useAvatarManager } from '../../../hooks/useAvatarManager';
import type { AvatarMode, PreloadedAvatarOption, CustomAvatarOption } from '../../../services/avatars/AvatarService';
import { API_CONFIG } from '../../../constants';
import { useAuth } from '../../../contexts/AuthContext';
import { useDoctorProfile } from '../../../hooks/useDoctorProfile';

interface AvatarManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onAvatarUpdated?: () => Promise<void> | void;
}

type TabKey = 'preloaded' | 'custom';

const getAvatarModeLabel = (mode: AvatarMode) => {
  switch (mode) {
    case 'initials':
      return 'Iniciales';
    case 'preloaded':
      return 'Galería';
    case 'custom':
      return 'Personalizado';
    default:
      return mode;
  }
};

const resolveAvatarUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return `${API_CONFIG.BASE_URL}${normalized}`;
};

const AvatarGridItem: React.FC<{
  option: PreloadedAvatarOption | CustomAvatarOption;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  deletable?: boolean;
}> = ({ option, selected, onSelect, onDelete, deletable }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        p: 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: selected ? 3 : 1
        }
      }}
      onClick={onSelect}
    >
      <Avatar
        src={resolveAvatarUrl(option.url)}
        alt={('templateKey' in option && option.templateKey) || ('key' in option ? option.key : option.filename) || 'avatar'}
        sx={{
          width: 72,
          height: 72,
          margin: '0 auto',
          border: '1px solid',
          borderColor: selected ? 'primary.main' : 'divider',
        }}
        variant="circular"
      >
        <ImageIcon fontSize="small" />
      </Avatar>
      <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
        {'templateKey' in option && option.templateKey
          ? option.templateKey
          : 'key' in option
            ? option.key
            : option.filename}
      </Typography>
      {deletable && onDelete && (
        <Tooltip title="Eliminar avatar">
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: 'background.paper'
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export const AvatarManagerDialog: React.FC<AvatarManagerDialogProps> = ({
  open,
  onClose,
  onAvatarUpdated
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('preloaded');
  const { loading, error, preloaded, custom, current, fetchAvatars, uploadAvatar, selectAvatar, deleteCustomAvatar } = useAvatarManager({ autoFetch: false });
  const { user } = useAuth();
  const { doctorProfile } = useDoctorProfile();

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

  useEffect(() => {
    if (open) {
      fetchAvatars();
    }
  }, [open, fetchAvatars]);

  const handleTabChange = (_event: React.SyntheticEvent, value: TabKey) => {
    setActiveTab(value);
  };

  const handleSelect = useCallback(async (mode: AvatarMode, templateKey?: string, relativePath?: string) => {
    const success = await selectAvatar(mode, { templateKey, relativePath });
    if (success && onAvatarUpdated) {
      await onAvatarUpdated();
    }
  }, [selectAvatar, onAvatarUpdated]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const success = await uploadAvatar(file);
    if (success) {
      await fetchAvatars();
      if (onAvatarUpdated) {
        await onAvatarUpdated();
      }
    }
    event.target.value = '';
  };

  const handleDeleteCustom = useCallback(async (relativePath: string) => {
    const success = await deleteCustomAvatar(relativePath);
    if (success) {
      await fetchAvatars();
      if (onAvatarUpdated) {
        await onAvatarUpdated();
      }
    }
  }, [deleteCustomAvatar, fetchAvatars, onAvatarUpdated]);

  const isCurrent = useCallback((mode: AvatarMode, option?: PreloadedAvatarOption | CustomAvatarOption) => {
    if (!current) {
      return false;
    }
    if (current.avatar_type !== mode) {
      return false;
    }
    if (mode === 'preloaded' && option) {
      const templateKey = ('templateKey' in option && option.templateKey) || ('key' in option ? option.key : undefined);
      return current.avatar_template_key === templateKey;
    }
    if (mode === 'custom' && option) {
      const relativePath = ('relativePath' in option && option.relativePath) || ('relative_path' in option ? option.relative_path : undefined);
      return current.avatar_file_path === relativePath;
    }
    return mode === 'initials';
  }, [current]);

  const handleReset = useCallback(async () => {
    const success = await selectAvatar('initials');
    if (success && onAvatarUpdated) {
      await onAvatarUpdated();
    }
  }, [selectAvatar, onAvatarUpdated]);

  const content = useMemo(() => {
    if (activeTab === 'preloaded') {
      return (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {preloaded.map((option) => (
            <Grid item xs={4} sm={3} md={2} key={option.templateKey ?? option.key}>
              <AvatarGridItem
                option={option}
                selected={isCurrent('preloaded', option)}
                onSelect={() => handleSelect('preloaded', option.templateKey ?? option.key)}
              />
            </Grid>
          ))}
          {preloaded.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" align="center">
                No hay avatares predefinidos disponibles.
              </Typography>
            </Grid>
          )}
        </Grid>
      );
    }

    return (
      <Box sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleUploadClick}
          sx={{ mb: 2 }}
        >
          Subir avatar
        </Button>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Grid container spacing={2}>
          {custom.map((option) => (
            <Grid item xs={4} sm={3} md={2} key={option.relativePath ?? option.relative_path}>
              <AvatarGridItem
                option={option}
                selected={isCurrent('custom', option)}
                onSelect={() => handleSelect('custom', undefined, option.relativePath ?? option.relative_path)}
                deletable
                onDelete={() => handleDeleteCustom(option.relativePath ?? option.relative_path)}
              />
            </Grid>
          ))}
          {custom.length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" align="center">
                Aún no has subido avatares personalizados.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }, [activeTab, custom, preloaded, isCurrent, handleSelect, handleDeleteCustom, handleUploadClick, handleFileChange]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Cambiar avatar</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar
            src={current?.avatar_type === 'initials' ? undefined : resolveAvatarUrl(current?.avatar_url || current?.url)}
            sx={{ 
              width: 64, 
              height: 64, 
              border: '2px solid', 
              borderColor: 'primary.main',
              bgcolor: current?.avatar_type === 'initials' ? 'primary.main' : 'transparent',
              fontSize: '1.5rem',
              fontWeight: 600
            }}
          >
            {current?.avatar_type === 'initials' ? avatarInitials : <ImageIcon />}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Avatar actual: {getAvatarModeLabel(current?.avatar_type || 'initials')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecciona una opción de la galería o sube una imagen personalizada.
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Restablecer a iniciales">
            <Button
              variant="text"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={current?.avatar_type === 'initials'}
            >
              Usar iniciales
            </Button>
          </Tooltip>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab label="Galería" value="preloaded" />
          <Tab label="Mis avatares" value="custom" />
        </Tabs>

        {content}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

