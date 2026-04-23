import React, { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import { LicenseService } from '../../services/licenses/LicenseService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { formatDateOnly } from '../../utils/dateHelpers';

const licenseService = new LicenseService();

interface DoctorDetailsDialogProps {
  open: boolean;
  doctorId: number | null;
  onClose: () => void;
}

interface OfficeDetail {
  id: number;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state_name?: string | null;
  country_name?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  timezone?: string | null;
  is_active?: boolean;
}

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.25 }}>
      {value === null || value === undefined || value === '' ? '—' : value}
    </Typography>
  </Box>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1, mb: 1 }}>
    {children}
  </Typography>
);

export const DoctorDetailsDialog: React.FC<DoctorDetailsDialogProps> = ({ open, doctorId, onClose }) => {
  const snackbar = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!open || !doctorId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setProfile(null);
      try {
        const data = await licenseService.getDoctorProfile(doctorId);
        if (!cancelled) setProfile(data);
      } catch (err: any) {
        if (!cancelled) snackbar.error(err?.message || 'Error al cargar los datos del doctor');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, doctorId, snackbar]);

  const formatDate = (value: string | null | undefined): string =>
    value ? formatDateOnly(value, { year: 'numeric', month: '2-digit', day: '2-digit' }) || '—' : '—';

  const offices: OfficeDetail[] = Array.isArray(profile?.offices) ? profile.offices : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {loading || !profile ? 'Datos del doctor' : `${profile.title ? profile.title + ' ' : ''}${profile.full_name || profile.name || ''}`}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !profile ? (
          <Typography variant="body2" color="text.secondary">
            No hay datos para mostrar.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <SectionTitle>Información general</SectionTitle>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Nombre completo" value={profile.full_name || profile.name} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Correo" value={profile.email} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Teléfono" value={profile.primary_phone} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Género" value={profile.gender} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Fecha de nacimiento" value={formatDate(profile.birth_date)} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Estado civil" value={profile.civil_status} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field
                    label="Estatus"
                    value={
                      <Chip
                        size="small"
                        label={profile.is_active ? 'Activo' : 'Inactivo'}
                        color={profile.is_active ? 'success' : 'default'}
                      />
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Código" value={profile.person_code} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Documentos e identificación</SectionTitle>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="CURP" value={profile.curp} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="RFC" value={profile.rfc} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Cédula profesional" value={profile.professional_license} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Especialidad" value={profile.specialty_name} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Universidad" value={profile.university} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Año de graduación" value={profile.graduation_year} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Dirección</SectionTitle>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}><Field label="Domicilio" value={profile.home_address} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Ciudad" value={profile.address_city} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Estado" value={profile.address_state_name} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="País" value={profile.address_country_name} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Código postal" value={profile.address_postal_code} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Consultorios ({offices.length})</SectionTitle>
              {offices.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin consultorios registrados.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {offices.map((office) => (
                    <Paper key={office.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, sm: 6 }}><Field label="Nombre" value={office.name} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Field label="Teléfono" value={office.phone} /></Grid>
                        <Grid size={{ xs: 12 }}><Field label="Dirección" value={office.address} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Field label="Ciudad" value={office.city} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Field label="Estado" value={office.state_name} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Field label="Código postal" value={office.postal_code} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Field label="Zona horaria" value={office.timezone} /></Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            <Divider />

            <Box>
              <SectionTitle>Contacto de emergencia</SectionTitle>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Nombre" value={profile.emergency_contact_name} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Teléfono" value={profile.emergency_contact_phone} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Field label="Parentesco" value={profile.emergency_contact_relationship} /></Grid>
              </Grid>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
