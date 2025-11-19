import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, TextField } from '@mui/material';
import { ResponsiveSankey } from '@nivo/sankey';
import type { DashboardMetrics } from '../../../services/analytics/AnalyticsService';

interface AppointmentFlowSankeyProps {
  appointmentFlow: DashboardMetrics['appointmentFlow'];
  onDateChange?: (dateFrom: string, dateTo: string) => void;
}

export const AppointmentFlowSankey: React.FC<AppointmentFlowSankeyProps> = ({
  appointmentFlow,
  onDateChange
}) => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDateFrom(value);
    if (value && dateTo && onDateChange) {
      onDateChange(value, dateTo);
    }
  };

  const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDateTo(value);
    if (dateFrom && value && onDateChange) {
      onDateChange(dateFrom, value);
    }
  };

  const { sankeyData, percentages, totalScheduled } = appointmentFlow;

  if (totalScheduled === 0) {
    return (
      <Card sx={{ height: '100%', boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Flujo de Citas
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No hay datos de citas para el período seleccionado
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Flujo de Citas
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
            mb: 2
          }}
        >
          <TextField
            label="Fecha Inicio"
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="Fecha Fin"
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Box>

        <Box sx={{ height: { xs: 320, sm: 380, md: 420 } }}>
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 40, right: 120, bottom: 40, left: 50 }}
            align="justify"
            colors={{ scheme: 'category10' }}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={36}
            nodeBorderWidth={0}
            nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="vertical"
            labelPadding={20}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
            animate={true}
            motionConfig="wobbly"
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))'
            },
            gap: 1.5,
            mt: 2
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Total Agendadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalScheduled}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Completadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {appointmentFlow.completedConsultations} ({percentages.completed}%)
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Canceladas por Médico
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {appointmentFlow.cancelledByDoctor} ({percentages.cancelledByDoctor}%)
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Canceladas por Paciente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {appointmentFlow.cancelledByPatient} ({percentages.cancelledByPatient}%)
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Pacientes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {appointmentFlow.pending} ({percentages.pending}%)
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AppointmentFlowSankey;

