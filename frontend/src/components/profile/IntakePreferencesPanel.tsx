/**
 * Doctor-facing settings card for the pre-consultation intake questionnaire.
 *
 * Lets the doctor opt OUT of specific questions (not add/edit them). Toggles
 * are saved via PUT /api/intake/preferences; the patient-facing form and
 * the appointment-scoped questionnaire read these exclusions back.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import { AssignmentInd as FormIcon } from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import type { IntakeQuestion } from '../../services/ApiService';
import { logger } from '../../utils/logger';

const SAVE_DEBOUNCE_MS = 400;

export const IntakePreferencesPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>({});
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    apiService.intake
      .getPreferences()
      .then((resp) => {
        if (!active) return;
        setQuestions(resp.questions);
        setSectionLabels(resp.section_labels);
        setSectionOrder(resp.section_order);
        setExcluded(new Set(resp.excluded_ids));
      })
      .catch((err) => {
        logger.error('Failed to load intake preferences', err, 'ui');
        setError('No pudimos cargar las preferencias del cuestionario.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounced save: on each toggle, schedule a PUT after 400ms of inactivity.
  const persist = useCallback(async (nextIds: string[]) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const resp = await apiService.intake.updatePreferences(nextIds);
      setExcluded(new Set(resp.excluded_ids));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      logger.error('Failed to save intake preferences', err, 'ui');
      setError('No pudimos guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, []);

  const toggle = useCallback(
    (qid: string) => {
      setExcluded((prev) => {
        const next = new Set(prev);
        if (next.has(qid)) next.delete(qid);
        else next.add(qid);
        // Schedule save on the resulting set.
        window.clearTimeout((toggle as any)._t);
        (toggle as any)._t = window.setTimeout(
          () => persist(Array.from(next)),
          SAVE_DEBOUNCE_MS
        );
        return next;
      });
    },
    [persist]
  );

  const groups = useMemo(
    () => groupBySection(questions, sectionOrder),
    [questions, sectionOrder]
  );

  const includedCount = questions.length - excluded.size;

  if (loading) {
    return (
      <Card id="intake-preferences" sx={{ mt: 3, scrollMarginTop: 24 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Cargando preferencias del cuestionario…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="intake-preferences" sx={{ mt: 3, scrollMarginTop: 24 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <FormIcon color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Cuestionario pre-consulta
          </Typography>
          <Chip
            size="small"
            label={`${includedCount}/${questions.length} activas`}
            color={includedCount === questions.length ? 'default' : 'primary'}
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Desmarca las preguntas que no quieres que reciba el paciente. Los
          cambios se aplican a todas las citas siguientes.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {saved && !error && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Preferencias guardadas.
          </Alert>
        )}
        {saving && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            Guardando…
          </Typography>
        )}

        <Stack spacing={2} divider={<Divider flexItem />}>
          {groups.map((group) => (
            <Box key={group.id}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}
              >
                {sectionLabels[group.id] || group.id}
              </Typography>
              <Stack>
                {group.questions.map((q) => {
                  const isExcluded = excluded.has(q.id);
                  return (
                    <FormControlLabel
                      key={q.id}
                      control={
                        <Checkbox
                          checked={!isExcluded}
                          onChange={() => toggle(q.id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {q.label}
                          </Typography>
                          {q.help_text && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              {q.help_text}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', mt: 0.5 }}
                    />
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};


interface Group {
  id: string;
  questions: IntakeQuestion[];
}

function groupBySection(
  questions: IntakeQuestion[],
  orderHint: string[]
): Group[] {
  const buckets = new Map<string, IntakeQuestion[]>();
  questions.forEach((q) => {
    const key = q.section || 'other';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(q);
  });
  const order: string[] = [];
  orderHint.forEach((s) => {
    if (buckets.has(s)) order.push(s);
  });
  buckets.forEach((_, key) => {
    if (!order.includes(key)) order.push(key);
  });
  return order.map((id) => ({ id, questions: buckets.get(id) || [] }));
}

export default IntakePreferencesPanel;
