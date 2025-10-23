import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Divider
} from '@mui/material';
import {
  Notes as NotesIcon
} from '@mui/icons-material';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  errors: Record<string, string>;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onNotesChange,
  errors
}) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <NotesIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h3">
          Notas Adicionales
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <TextField
        label="Notas de la cita"
        multiline
        rows={4}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Agregar notas adicionales sobre la cita..."
        fullWidth
        error={!!errors.notes}
        helperText={errors.notes || 'Información adicional que pueda ser útil para la consulta'}
      />
    </Paper>
  );
};
