import React from 'react';
import {
  DialogActions,
  Button
} from '@mui/material';

interface AppointmentActionsProps {
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  isEditing: boolean;
  isReadOnly: boolean;
  status?: string;
  cancelledReason?: string;
}

export const AppointmentActions: React.FC<AppointmentActionsProps> = ({
  onClose,
  onSubmit,
  loading,
  isEditing,
  isReadOnly,
  status,
  cancelledReason
}) => {
  return (
    <DialogActions sx={{ p: 2, gap: 1 }}>
      <Button 
        onClick={onClose} 
        color="inherit"
        disabled={loading}
      >
        Cancelar
      </Button>
      {!isReadOnly && (
        <Button 
          onClick={onSubmit}
          variant="contained"
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cita')}
        </Button>
      )}
      {isReadOnly && status === 'cancelled' && (
        <Button 
          onClick={onSubmit}
          variant="outlined"
          disabled={loading || !cancelledReason?.trim()}
          sx={{ 
            minWidth: 120,
            borderColor: 'primary.main',
            color: 'primary.main'
          }}
        >
          {loading ? 'Guardando...' : 'Actualizar'}
        </Button>
      )}
    </DialogActions>
  );
};

