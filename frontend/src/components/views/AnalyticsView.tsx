import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Skeleton,
  Stack
} from '@mui/material';
import { useAnalytics } from '../../hooks/useAnalytics';
import { MetricsCards } from './AnalyticsView/MetricsCards';
import { AppointmentFlowSankey } from './AnalyticsView/AppointmentFlowSankey';
import { AppointmentTrendsChart } from './AnalyticsView/AppointmentTrendsChart';
import { AppointmentTypeChart } from './AnalyticsView/AppointmentTypeChart';

export const AnalyticsView: React.FC = () => {
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

  if (isLoading && !metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 3 }} />
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={110} sx={{ flex: 1, minWidth: 180, borderRadius: 2 }} />
          ))}
        </Stack>
        <Stack spacing={{ xs: 2, md: 3 }}>
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
        </Stack>
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

  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No hay datos disponibles</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard de Analíticas
      </Typography>

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} />

      {/* Charts */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
        <AppointmentTrendsChart data={metrics.appointmentTrends.data} />
        <AppointmentTypeChart trends={metrics.appointmentTypeTrends.data} />
        <AppointmentFlowSankey
          appointmentFlow={metrics.appointmentFlow}
          onDateChange={handleDateChange}
        />
      </Box>
    </Box>
  );
};

export default AnalyticsView;

