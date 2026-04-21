import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useProfileCompletion, type CompletionItem } from '../../hooks/useProfileCompletion';

const DISMISS_KEY = 'cortex:profile-banner-dismissed-at';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface ProfileCompletionBannerProps {
  doctorProfile: any;
  onNavigateToProfile?: (anchor?: string) => void;
}

/**
 * Dashboard banner that nudges the doctor to finish setting up their profile
 * after a quick registration. Hidden when the profile is complete; dismissable
 * for 24h when there are no blocking gaps (missing office/schedule keep the
 * banner pinned because they block core workflows).
 */
const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  doctorProfile,
  onNavigateToProfile
}) => {
  const { percentage, items, missing, isComplete, hasBlockingGap } =
    useProfileCompletion(doctorProfile);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  });

  const visible = useMemo(() => {
    if (isComplete) return false;
    if (hasBlockingGap) return true; // blocking gaps bypass dismissal
    return !dismissed;
  }, [isComplete, hasBlockingGap, dismissed]);

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (_) {
      // localStorage can be disabled (private mode) — silent fallback
    }
    setDismissed(true);
  };

  const severity = hasBlockingGap ? 'warning' : 'info';
  const headline = hasBlockingGap
    ? 'Completa tu perfil para empezar a agendar'
    : 'Tu perfil está casi listo';

  const renderItem = (item: CompletionItem) => (
    <Box
      key={item.id}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 0.5
      }}
    >
      <Box sx={{ pt: 0.25 }}>
        {item.done ? (
          <CheckCircleIcon fontSize="small" color="success" />
        ) : (
          <UncheckedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
        )}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            color: item.done ? 'text.secondary' : 'text.primary',
            textDecoration: item.done ? 'line-through' : 'none'
          }}
        >
          {item.label}
        </Typography>
        {!item.done && item.hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {item.hint}
          </Typography>
        )}
      </Box>
      {!item.done && item.blocking && (
        <Chip label="Requerido" size="small" color="warning" variant="outlined" sx={{ flexShrink: 0 }} />
      )}
      {!item.done && (
        <IconButton
          size="small"
          onClick={() => onNavigateToProfile?.(item.target)}
          aria-label={`Ir a configurar: ${item.label}`}
          sx={{ flexShrink: 0 }}
        >
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  return (
    <Alert
      severity={severity}
      sx={{ mb: 2 }}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton
            size="small"
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'}
            aria-expanded={expanded}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          {!hasBlockingGap && (
            <IconButton size="small" onClick={handleDismiss} aria-label="Recordármelo después">
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
      }
    >
      <AlertTitle sx={{ mb: 1 }}>{headline}</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {missing.length} de {items.length} secciones pendientes ({percentage}% completo).
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={hasBlockingGap ? 'warning' : 'info'}
        sx={{ height: 6, borderRadius: 3, mb: 1 }}
      />

      <Collapse in={expanded}>
        <Box sx={{ mt: 1 }}>{items.map(renderItem)}</Box>
      </Collapse>

      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="contained"
          color={hasBlockingGap ? 'warning' : 'primary'}
          onClick={() => onNavigateToProfile?.(missing[0]?.target)}
        >
          Completar ahora
        </Button>
        {!expanded && (
          <Button size="small" variant="text" onClick={() => setExpanded(true)}>
            Ver pendientes
          </Button>
        )}
      </Box>
    </Alert>
  );
};

export default ProfileCompletionBanner;
