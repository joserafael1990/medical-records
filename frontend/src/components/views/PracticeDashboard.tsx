/**
 * PracticeDashboard — 12-month deep analytics view.
 *
 * Complements the existing appointment-centric AnalyticsView with a
 * clinical-practice lens: consultation volume, top diagnoses,
 * patient demographics, busy hours, and a studies-ordered trend.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Group as GroupIcon,
  AccessTime as ClockIcon,
  Assignment as ConsultationIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/ApiService';
import type { PracticeSummary } from '../../services/ApiService';
import { logger } from '../../utils/logger';
import { AppointmentsAnalyticsSection } from './PracticeDashboard/AppointmentsAnalyticsSection';

const PIE_COLORS = ['#1976d2', '#9c27b0', '#ff9800', '#4caf50', '#f44336', '#9e9e9e'];

export const PracticeDashboard: React.FC = () => {
  const [data, setData] = useState<PracticeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiService.practiceAnalytics
      .getPracticeSummary()
      .then((s) => {
        if (active) setData(s);
      })
      .catch((err) => {
        logger.error('Failed to load practice summary', err, 'ui');
        if (active) setError('No pudimos cargar el dashboard de consultorio.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  if (!data) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Mi consultorio
        </Typography>
        {data.scope === 'admin' && <Chip size="small" color="primary" label="Vista admin" />}
        <Typography variant="caption" color="text.secondary">
          Actualizado {new Date(data.generated_at).toLocaleString('es-MX')}
        </Typography>
      </Box>

      <KPIRow kpis={data.kpis} />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <DashboardCard title="Consultas por mes (últimos 12 meses)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.consultations_by_month}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </DashboardCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardCard title="Pacientes por género">
            {data.demographics.by_gender.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.demographics.by_gender}
                    dataKey="count"
                    nameKey="gender"
                    outerRadius={90}
                    label
                  >
                    {data.demographics.by_gender.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Aún no hay pacientes registrados." />
            )}
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardCard title="Top diagnósticos (últimos 12 meses)">
            {data.top_diagnoses.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.top_diagnoses}
                  layout="vertical"
                  margin={{ left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="diagnosis"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#9c27b0" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Aún no hay consultas con diagnóstico registrado." />
            )}
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardCard title="Pacientes por rango de edad">
            {data.demographics.by_age_bucket.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.demographics.by_age_bucket}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Aún no hay pacientes con fecha de nacimiento registrada." />
            )}
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <DashboardCard title="Estudios clínicos ordenados (últimos 12 meses)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.studies_by_month}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </DashboardCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DashboardCard title="Horas con mayor carga (últimos 3 meses)">
            <BusyHoursList rows={data.busy_heatmap} />
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Appointment-centric analytics — merged from the old "Analíticas" view */}
      <AppointmentsAnalyticsSection />
    </Box>
  );
};


// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------


const KPIRow: React.FC<{ kpis: PracticeSummary['kpis'] }> = ({ kpis }) => {
  return (
    <Grid container spacing={2}>
      <KPICard
        icon={<ConsultationIcon />}
        label={`Consultas en ${kpis.current_month}`}
        value={String(kpis.consultations_this_month)}
        delta={kpis.consultations_delta_pct}
      />
      <KPICard
        icon={<GroupIcon />}
        label="Pacientes nuevos (mes)"
        value={String(kpis.new_patients_this_month)}
      />
      <KPICard
        icon={<ClockIcon />}
        label="Duración promedio"
        value={
          kpis.avg_consultation_duration_minutes != null
            ? `${kpis.avg_consultation_duration_minutes} min`
            : '—'
        }
      />
      <KPICard
        icon={<ConsultationIcon />}
        label="Consultas mes previo"
        value={String(kpis.consultations_last_month)}
      />
    </Grid>
  );
};


interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
}

const KPICard: React.FC<KPICardProps> = ({ icon, label, value, delta }) => {
  let trendIcon = <TrendingFlatIcon fontSize="small" />;
  let trendColor: string = 'text.secondary';
  if (delta != null) {
    if (delta > 0.1) {
      trendIcon = <TrendingUpIcon fontSize="small" />;
      trendColor = 'success.main';
    } else if (delta < -0.1) {
      trendIcon = <TrendingDownIcon fontSize="small" />;
      trendColor = 'error.main';
    }
  }
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mb: 1 }}>
            {icon}
            <Typography variant="caption">{label}</Typography>
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {delta != null && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: trendColor, mt: 0.5 }}>
              {trendIcon}
              <Typography variant="caption">
                {delta > 0 ? '+' : ''}
                {delta}% vs mes previo
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
};


const DashboardCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);


const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  </Box>
);


const BusyHoursList: React.FC<{ rows: PracticeSummary['busy_heatmap'] }> = ({ rows }) => {
  const sorted = [...rows].sort((a, b) => b.count - a.count).slice(0, 8);
  if (sorted.length === 0) {
    return <EmptyState text="Sin datos de horarios aún." />;
  }
  const max = sorted[0].count || 1;
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {sorted.map((r) => (
        <Box key={`${r.weekday}-${r.hour}`}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">
              {r.weekday} · {String(r.hour).padStart(2, '0')}:00
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {r.count}
            </Typography>
          </Stack>
          <Box
            sx={{
              mt: 0.5,
              height: 6,
              width: `${Math.round((r.count / max) * 100)}%`,
              bgcolor: 'primary.main',
              borderRadius: 3,
            }}
          />
        </Box>
      ))}
    </Stack>
  );
};

export default PracticeDashboard;
