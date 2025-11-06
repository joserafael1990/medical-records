import React from 'react';
import {
  Box,
  Typography,
  TextField
} from '@mui/material';
import { Notes as NotesIcon } from '@mui/icons-material';

interface NotesSectionProps {
  preparationInstructions: string;
  notes: string;
  onPreparationInstructionsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  hasNotesError: boolean;
  notesErrorMessage: string;
  isReadOnly: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  preparationInstructions,
  notes,
  onPreparationInstructionsChange,
  onNotesChange,
  hasNotesError,
  notesErrorMessage,
  isReadOnly
}) => {
  return (
    <>
      {/* Preparation Instructions */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotesIcon sx={{ fontSize: 20 }} />
          Instrucciones de Preparación - opcional
          <Typography component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.875rem', fontWeight: 400 }}>(Opcional)</Typography>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Instrucciones de preparación - opcional"
          value={preparationInstructions || ''}
          onChange={(e) => onPreparationInstructionsChange(e.target.value)}
          size="small"
          placeholder="Ej: Ayuno de 12 horas, traer estudios previos..."
          InputProps={{
            readOnly: isReadOnly
          }}
        />
      </Box>

      {/* Notes */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Notas Adicionales - opcional
          <Typography component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.875rem', fontWeight: 400 }}>(Opcional)</Typography>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Notas opcionales - opcional"
          value={notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          size="small"
          error={hasNotesError}
          helperText={notesErrorMessage}
          InputProps={{
            readOnly: isReadOnly
          }}
        />
      </Box>
    </>
  );
};
