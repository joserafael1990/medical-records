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

interface AppointmentTypeChartProps {
  trends: DashboardMetrics['appointmentTypeTrends']['data'];
}

export const AppointmentTypeChart: React.FC<AppointmentTypeChartProps> = ({ trends }) => {
  // Filtrar meses que tienen al menos un dato (cualquier tipo de consulta)
  const filteredData = React.useMemo(() => {
    if (!trends || trends.length === 0) return [];
    
    // Encontrar el primer mes con datos
    const firstMonthWithData = trends.findIndex(
      (item) => 
        (item.newPatient && item.newPatient > 0) ||
        (item.followUp && item.followUp > 0) ||
        (item.other && item.other > 0)
    );
    
    // Si no hay datos, retornar array vacío
    if (firstMonthWithData === -1) return [];
    
    // Retornar desde el primer mes con datos hasta el final
    return trends.slice(firstMonthWithData);
  }, [trends]);

  return (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tendencia mensual por tipo de consulta
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
              dataKey="newPatient"
              name="Nuevo paciente"
              stroke="#7b1fa2"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="followUp"
              name="Seguimiento"
              stroke="#0288d1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="other"
              name="Otros"
              stroke="#8d6e63"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};


