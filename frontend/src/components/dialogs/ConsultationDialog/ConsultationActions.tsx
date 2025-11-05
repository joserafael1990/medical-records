import React from 'react';
import {
  Box,
  Button
} from '@mui/material';

interface ConsultationActionsProps {
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  isEditing: boolean;
}

export const ConsultationActions: React.FC<ConsultationActionsProps> = ({
  onClose,
  onSubmit,
  loading,
  isEditing
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
      <Button onClick={onClose} color="inherit" disabled={loading}>
        Cancelar
      </Button>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? 'Guardando...' : (isEditing ? 'Actualizar Consulta' : 'Crear Consulta')}
      </Button>
    </Box>
  );
};

