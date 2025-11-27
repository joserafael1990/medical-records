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
  // Filtrar meses que tienen al menos un dato (citas agendadas, canceladas o consultas)
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Encontrar el primer mes con datos
    const firstMonthWithData = data.findIndex(
      (item) => 
        (item.scheduled && item.scheduled > 0) ||
        (item.cancelledByPatient && item.cancelledByPatient > 0) ||
        (item.consultations && item.consultations > 0)
    );
    
    // Si no hay datos, retornar array vacío
    if (firstMonthWithData === -1) return [];
    
    // Retornar desde el primer mes con datos hasta el final
    return data.slice(firstMonthWithData);
  }, [data]);

  return (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tendencia Mensual de Citas y Consultas
        </Typography>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={filteredData} margin={{ top: 10, right: 40, left: 10, bottom: 5 }}>
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






