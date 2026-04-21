/**
 * Dialog opened when the doctor clicks a bar in the "Top diagnósticos"
 * chart. Shows the list of patients with that diagnosis so the doctor
 * can act on the cohort (e.g., reach out, schedule follow-ups).
 *
 * Data source: the same backend aggregator the doctor assistant uses
 * for the `list_patients_by_diagnosis` tool — one audit trail, one ACL.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Button,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { apiService } from '../../../services/ApiService';
import type { PatientsByDiagnosisResponse } from '../../../services/practiceAnalytics/PracticeAnalyticsService';
import { formatGenderLabel } from '../../../utils/gender';
import { logger } from '../../../utils/logger';

interface DiagnosisCohortDialogProps {
  open: boolean;
  diagnosis: string | null;
  onClose: () => void;
  /** Optional: navigate to a patient's ficha when clicked. */
  onOpenPatient?: (patientId: number) => void;
}

export const DiagnosisCohortDialog: React.FC<DiagnosisCohortDialogProps> = ({
  open,
  diagnosis,
  onClose,
  onOpenPatient,
}) => {
  const [data, setData] = useState<PatientsByDiagnosisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCohort = useCallback(async (dx: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.practiceAnalytics.getPatientsByDiagnosis(dx, 50);
      setData(res);
    } catch (err) {
      logger.error('Failed to load diagnosis cohort', err, 'ui');
      setError('No pudimos cargar el cohort de pacientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && diagnosis) {
      fetchCohort(diagnosis);
    }
    if (!open) {
      // Reset on close so next open doesn't flash stale data.
      setData(null);
      setError(null);
    }
  }, [open, diagnosis, fetchCohort]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Pacientes con {diagnosis || 'este diagnóstico'}
          </Typography>
          {data && (
            <Typography variant="caption" color="text.secondary">
              {data.count} {data.count === 1 ? 'paciente' : 'pacientes'} en los últimos 12 meses
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Cerrar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {!loading && !error && data && data.patients.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              No hay pacientes con este diagnóstico en los últimos 12 meses.
            </Typography>
          </Box>
        )}
        {!loading && !error && data && data.patients.length > 0 && (
          <List dense>
            {data.patients.map((p) => (
              <ListItemButton
                key={p.patient_id}
                onClick={() => onOpenPatient?.(p.patient_id)}
                disabled={!onOpenPatient}
              >
                <ListItemText
                  primary={p.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">
                        {p.visits_with_dx} {p.visits_with_dx === 1 ? 'visita' : 'visitas'}
                      </Typography>
                      {p.last_visit_date && (
                        <Typography variant="caption" color="text.secondary">
                          · última{' '}
                          {new Date(p.last_visit_date).toLocaleDateString('es-MX', {
                            dateStyle: 'medium',
                          })}
                        </Typography>
                      )}
                      {p.gender && (
                        <Chip
                          size="small"
                          label={formatGenderLabel(p.gender)}
                          variant="outlined"
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiagnosisCohortDialog;
