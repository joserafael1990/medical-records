import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { DashboardMetrics } from '../../../services/analytics/AnalyticsService';

interface AppointmentTrendsChartProps {
  data: DashboardMetrics['appointmentTrends']['data'];
}

export const AppointmentTrendsChart: React.FC<AppointmentTrendsChartProps> = ({ data }) => {
  return (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tendencia Mensual de Citas y Consultas
        </Typography>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={data} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="scheduled"
              name="Citas agendadas"
              stroke="#1976d2"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="cancelledByPatient"
              name="Canceladas por paciente"
              stroke="#d32f2f"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="consultations"
              name="Consultas realizadas"
              stroke="#2e7d32"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};






