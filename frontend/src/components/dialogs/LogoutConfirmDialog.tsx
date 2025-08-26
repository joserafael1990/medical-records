import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Divider
} from '@mui/material';
import { ExitToApp as LogoutIcon } from '@mui/icons-material';

interface LogoutConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  userName = 'Usuario'
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '16px',
          minWidth: '320px',
          maxWidth: '360px'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 2, pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main', 
              width: 40, 
              height: 40
            }}
          >
            <LogoutIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Cerrar Sesión
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', py: 1, px: 3 }}>
        <Typography variant="body1">
          ¿Estás seguro?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ 
            flex: 1,
            borderRadius: '8px',
            textTransform: 'none'
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          sx={{ 
            flex: 1,
            borderRadius: '8px',
            textTransform: 'none'
          }}
          startIcon={<LogoutIcon />}
        >
          Salir
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogoutConfirmDialog;
