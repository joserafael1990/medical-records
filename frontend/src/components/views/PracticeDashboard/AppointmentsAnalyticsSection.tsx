/**
 * Appointment-centric analytics block — ported from the old
 * `AnalyticsView` (now folded into PracticeDashboard).
 *
 * Wraps `useAnalytics` + the 4 subcomponents it was driving
 * (MetricsCards, AppointmentTrendsChart, AppointmentTypeChart,
 * AppointmentFlowSankey) with a local date-range state so this
 * section can be refreshed independently from the rest of the
 * practice dashboard. Keeping the shape identical to the original
 * view means no subcomponent edits are required.
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { MetricsCards } from '../AnalyticsView/MetricsCards';
import { AppointmentFlowSankey } from '../AnalyticsView/AppointmentFlowSankey';
import { AppointmentTrendsChart } from '../AnalyticsView/AppointmentTrendsChart';
import { AppointmentTypeChart } from '../AnalyticsView/AppointmentTypeChart';

export const AppointmentsAnalyticsSection: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { metrics, isLoading, error, fetchDashboardData } = useAnalytics(
    dateFrom || undefined,
    dateTo || undefined
  );

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    fetchDashboardData(from, to);
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Analíticas de citas
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tendencias, tipos y flujo de tus citas. Usa el selector de fechas del
            gráfico de flujo para acotar el rango.
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {isLoading && !metrics && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={110} sx={{ flex: 1, minWidth: 180, borderRadius: 2 }} />
              ))}
            </Stack>
            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!isLoading && !error && !metrics && (
          <Alert severity="info">No hay datos de citas disponibles para el rango seleccionado.</Alert>
        )}

        {metrics && (
          <>
            <MetricsCards metrics={metrics} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 }, mt: 2 }}>
              <AppointmentTrendsChart data={metrics.appointmentTrends.data} />
              <AppointmentTypeChart trends={metrics.appointmentTypeTrends.data} />
              <AppointmentFlowSankey
                appointmentFlow={metrics.appointmentFlow}
                onDateChange={handleDateChange}
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsAnalyticsSection;
