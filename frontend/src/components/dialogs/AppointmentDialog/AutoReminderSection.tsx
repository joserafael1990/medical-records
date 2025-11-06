import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch
} from '@mui/material';

interface AutoReminderSectionProps {
  autoReminderEnabled: boolean;
  autoReminderOffsetMinutes: number;
  onAutoReminderToggle: (enabled: boolean) => void;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
}

export const AutoReminderSection: React.FC<AutoReminderSectionProps> = ({
  autoReminderEnabled,
  autoReminderOffsetMinutes,
  onAutoReminderToggle,
  onHoursChange,
  onMinutesChange
}) => {
  const hours = Math.floor((autoReminderOffsetMinutes ?? 360) / 60);
  const minutes = (autoReminderOffsetMinutes ?? 360) % 60;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Recordatorio automático por WhatsApp
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={!!autoReminderEnabled}
            onChange={(_, checked) => onAutoReminderToggle(checked)}
          />
        }
        label="Enviar recordatorio automático"
      />

      {autoReminderEnabled && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '160px 160px' }, gap: 2, mt: 1 }}>
          <TextField
            type="number"
            size="small"
            label="Horas antes"
            inputProps={{ min: 0, max: 168 }}
            value={hours}
            onChange={(e) => {
              const h = Math.max(0, Math.min(168, parseInt(e.target.value || '0', 10)));
              onHoursChange(h);
            }}
          />
          <TextField
            type="number"
            size="small"
            label="Minutos antes"
            inputProps={{ min: 0, max: 59 }}
            value={minutes}
            onChange={(e) => {
              const m = Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10)));
              onMinutesChange(m);
            }}
          />
        </Box>
      )}
    </Box>
  );
};

