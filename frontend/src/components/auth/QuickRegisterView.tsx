import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import {
  ArrowBack,
  Cancel,
  CheckCircle,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import CortexLogo from '../common/CortexLogo';
import { apiService } from '../../services';
import { logger } from '../../utils/logger';
import { extractErrorMessage } from '../../utils/errorMessages';

interface QuickRegisterViewProps {
  onBackToLogin: () => void;
  onSwitchToFull: () => void;
}

interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

const evaluatePassword = (password: string): PasswordCriteria => ({
  minLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumbers: /\d/.test(password),
  hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
});

const CEDULA_DOCUMENT_NAMES = ['cédula profesional', 'cedula profesional'];

/**
 * Minimum-compliance registration: captures only the fields that NOM-004-SSA3-2012
 * and LFPDPPP require before a doctor can sign in. Office, schedule and optional
 * personal data are deferred to the in-app profile completion flow.
 */
const QuickRegisterView: React.FC<QuickRegisterViewProps> = ({
  onBackToLogin,
  onSwitchToFull
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [specialtyId, setSpecialtyId] = useState<string>('');
  const [cedula, setCedula] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [specialties, setSpecialties] = useState<any[]>([]);
  const [cedulaDocumentId, setCedulaDocumentId] = useState<number | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogs = async () => {
      try {
        const [specs, documents] = await Promise.all([
          apiService.catalogs.getSpecialties(),
          apiService.documents.getDocuments(undefined, true).catch(() => [] as any[])
        ]);
        if (cancelled) return;

        const active = (Array.isArray(specs) ? specs : []).filter(
          (s: any) => s.is_active !== false
        );
        setSpecialties(active);

        const cedulaDoc = (Array.isArray(documents) ? documents : []).find(
          (d: any) => CEDULA_DOCUMENT_NAMES.some(n =>
            (d?.name || '').toString().toLowerCase().includes(n)
          )
        );
        if (cedulaDoc?.id) setCedulaDocumentId(cedulaDoc.id);
      } catch (err) {
        logger.error('Error loading quick-register catalogs', err, 'auth');
      } finally {
        if (!cancelled) setLoadingCatalogs(false);
      }
    };
    loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  const passwordCriteria = useMemo(() => evaluatePassword(password), [password]);
  const passwordScore = Object.values(passwordCriteria).filter(Boolean).length;
  const isPasswordStrong = passwordScore >= 4;
  const passwordsMatch = !!password && password === confirmPassword;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const trimmedCedula = cedula.trim();
  const cedulaLooksValid = /^\d{7,8}$/.test(trimmedCedula); // NOM-024 format (7-8 digits)

  const canSubmit =
    emailValid &&
    isPasswordStrong &&
    passwordsMatch &&
    name.trim().length >= 2 &&
    !!specialtyId &&
    cedulaLooksValid &&
    consent &&
    !isSubmitting;

  const firstError = (): string | null => {
    if (!emailValid) return 'Ingresa un correo electrónico válido';
    if (!isPasswordStrong)
      return 'La contraseña debe cumplir al menos 4 de los 5 criterios de seguridad';
    if (!passwordsMatch) return 'Las contraseñas no coinciden';
    if (name.trim().length < 2) return 'Ingresa tu nombre completo';
    if (!specialtyId) return 'Selecciona tu especialidad';
    if (!cedulaLooksValid)
      return 'La cédula profesional debe tener 7 u 8 dígitos (formato NOM-024)';
    if (!consent) return 'Debes aceptar el aviso de privacidad para continuar';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    const err = firstError();
    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const documents = cedulaDocumentId
        ? [{ document_id: cedulaDocumentId, document_value: trimmedCedula }]
        : [];

      // Backend contract: see docs/REGISTER_COMPLIANCE_SPEC.md
      // - `quick_registration: true` tells the backend to skip validation of
      //   office/schedule/personal-docs fields and mark the profile as
      //   pending completion.
      // - `privacy_consent` carries the LFPDPPP acceptance metadata.
      const payload: any = {
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        specialty_id: parseInt(specialtyId, 10),
        documents,
        // Stub values backend can accept/ignore under quick_registration=true.
        title: 'Dr.',
        gender: '',
        birth_date: '',
        primary_phone: '',
        university: '',
        graduation_year: '',
        office_name: '',
        office_address: '',
        office_city: '',
        office_state_id: null,
        office_phone: '',
        office_maps_url: '',
        appointment_duration: null,
        schedule_data: {},
        created_by: name.trim(),
        quick_registration: true,
        privacy_consent: {
          accepted: true,
          accepted_at: new Date().toISOString(),
          notice_version: 'v1', // backend owns the canonical version
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const response = await apiService.auth.register(payload);

      if (response?.access_token) {
        try {
          const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
          trackAmplitudeEvent('registration_completed', {
            mode: 'quick',
            has_specialty: true
          });
        } catch (_) {
          // analytics best-effort only
        }
        window.location.reload();
      } else {
        throw new Error('No se recibió token de autenticación');
      }
    } catch (err: any) {
      logger.error('Quick registration failed', err, 'auth');
      setError(extractErrorMessage(err, 'No se pudo crear la cuenta. Intenta nuevamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCriterion = (label: string, met: boolean) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {met ? (
        <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
      ) : (
        <Cancel sx={{ fontSize: 16, color: 'text.disabled' }} />
      )}
      <Typography variant="caption" color={met ? 'success.main' : 'text.secondary'}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper elevation={3} sx={{ width: '100%', p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={onBackToLogin}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              Volver al login
            </Button>
            <CortexLogo variant="full" sx={{ fontSize: 36, color: 'primary.main', ml: 'auto' }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            Crear cuenta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Solo los datos mínimos requeridos por la NOM-004 para empezar. Podrás completar
            consultorios, horarios y demás desde tu perfil más tarde.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Correo electrónico"
              type="email"
              fullWidth
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={attempted && !emailValid}
              helperText={attempted && !emailValid ? 'Formato de correo inválido' : ' '}
              sx={{ mb: 1 }}
            />

            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={attempted && !isPasswordStrong}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 1 }}
            />

            {password && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(passwordScore / 5) * 100}
                  color={passwordScore >= 4 ? 'success' : passwordScore >= 2 ? 'warning' : 'error'}
                  sx={{ height: 6, borderRadius: 3, mb: 1 }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  {renderCriterion('8+ caracteres', passwordCriteria.minLength)}
                  {renderCriterion('Mayúscula', passwordCriteria.hasUppercase)}
                  {renderCriterion('Minúscula', passwordCriteria.hasLowercase)}
                  {renderCriterion('Número', passwordCriteria.hasNumbers)}
                  {renderCriterion('Carácter especial', passwordCriteria.hasSpecialChars)}
                </Box>
              </Box>
            )}

            <TextField
              label="Confirmar contraseña"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={attempted && !!confirmPassword && !passwordsMatch}
              helperText={
                attempted && !!confirmPassword && !passwordsMatch
                  ? 'Las contraseñas no coinciden'
                  : ' '
              }
              sx={{ mb: 1 }}
            />

            <TextField
              label="Nombre completo"
              fullWidth
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={attempted && name.trim().length < 2}
              helperText="Como aparece en tu cédula profesional"
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth required sx={{ mb: 2 }} error={attempted && !specialtyId}>
              <InputLabel>Especialidad</InputLabel>
              <Select
                label="Especialidad"
                value={specialtyId}
                onChange={(e) => setSpecialtyId(e.target.value as string)}
                disabled={loadingCatalogs}
              >
                {specialties.map((s: any) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {loadingCatalogs ? 'Cargando…' : 'Requerido por NOM-004 para emitir recetas'}
              </FormHelperText>
            </FormControl>

            <TextField
              label="Cédula profesional"
              fullWidth
              required
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
              error={attempted && !cedulaLooksValid}
              helperText={
                attempted && !cedulaLooksValid
                  ? 'Debe tener 7 u 8 dígitos'
                  : 'Formato NOM-024: 7 u 8 dígitos numéricos'
              }
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
              }
              label={
                <Typography variant="body2">
                  He leído y acepto el{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                    Aviso de Privacidad
                  </Link>{' '}
                  y los{' '}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer">
                    Términos y Condiciones
                  </Link>{' '}
                  (LFPDPPP Art. 16).
                </Typography>
              }
              sx={{ alignItems: 'flex-start', mb: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={!canSubmit || loadingCatalogs}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              sx={{ mb: 2 }}
            >
              {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                ¿Prefieres configurar oficinas y horarios ahora?{' '}
                <Link component="button" type="button" onClick={onSwitchToFull} underline="hover">
                  Usar registro completo
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default QuickRegisterView;
