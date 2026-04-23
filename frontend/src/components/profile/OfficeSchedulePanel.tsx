import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { ScheduleCard } from './ScheduleCard';
import { useScheduleData } from '../../hooks/useScheduleData';

interface OfficeSchedulePanelProps {
  office: { id: number; name: string; is_virtual?: boolean };
  onEdit: (officeId: number) => void;
}

export const OfficeSchedulePanel: React.FC<OfficeSchedulePanelProps> = ({ office, onEdit }) => {
  const { scheduleData, loading, error } = useScheduleData(office.id);

  const hasActiveDays =
    scheduleData && Object.values(scheduleData).some((day: any) => day && day.is_active);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        mb: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {office.name}
          </Typography>
          {office.is_virtual && (
            <Chip label="Virtual" size="small" color="info" variant="outlined" />
          )}
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => onEdit(office.id)}
        >
          Editar horario
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          Error al cargar horario: {error}
        </Alert>
      ) : hasActiveDays ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(180px, 1fr))' },
            gap: 1.5,
          }}
        >
          {Object.entries(scheduleData!).map(([day, schedule]: [string, any]) => {
            if (!schedule || !schedule.is_active) return null;
            return (
              <ScheduleCard
                key={day}
                day={day}
                schedule={schedule}
                onClick={() => onEdit(office.id)}
              />
            );
          })}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', pl: 0.5 }}>
          <ScheduleIcon fontSize="small" />
          <Typography variant="body2">
            Sin horarios configurados para este consultorio.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
