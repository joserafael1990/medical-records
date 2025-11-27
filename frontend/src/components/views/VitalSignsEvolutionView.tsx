import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Button
} from '@mui/material';
import {
  MonitorHeart as MonitorHeartIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PatientVitalSignsHistory } from '../../hooks/useVitalSigns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VitalSignsEvolutionViewProps {
  patientId: number;
  patientName: string;
  onBack?: () => void; // Optional since Dialog handles closing
  fetchHistory: (patientId: number) => Promise<PatientVitalSignsHistory>;
}

const VitalSignsEvolutionView: React.FC<VitalSignsEvolutionViewProps> = ({
  patientId,
  patientName,
  onBack,
  fetchHistory
}) => {
  const [history, setHistory] = useState<PatientVitalSignsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHistory(patientId);
        setHistory(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el historial de signos vitales');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      loadHistory();
    }
  }, [patientId, fetchHistory]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const prepareChartData = (vitalSignData: PatientVitalSignsHistory['vital_signs_history'][0]) => {
    return vitalSignData.data
      .filter(item => item.value !== null && item.date !== null)
      .map(item => ({
        date: formatDate(item.date),
        value: item.value,
        fullDate: item.date
      }))
      .sort((a, b) => {
        if (!a.fullDate || !b.fullDate) return 0;
        return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime();
      });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
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

  if (!history || !history.vital_signs_history || history.vital_signs_history.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No hay historial de signos vitales disponible para este paciente.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Evolución de Signos Vitales
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Paciente: {history.patient_name || patientName}
          </Typography>
        </Box>
        {onBack && (
          <Button
            variant="outlined"
            onClick={onBack}
            sx={{ minWidth: 'auto' }}
          >
            Volver
          </Button>
        )}
      </Box>

      {/* Charts */}
      <Grid container spacing={3} sx={{ width: '100%' }}>
        {history.vital_signs_history.map((vitalSign) => {
          const chartData = prepareChartData(vitalSign);
          
          if (chartData.length === 0) {
            return null;
          }

          return (
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12} key={vitalSign.vital_sign_id} sx={{ width: '100%' }}>
              <Card sx={{ display: 'flex', flexDirection: 'column', mb: 3, width: '100%' }}>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <MonitorHeartIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {vitalSign.vital_sign_name}
                      {vitalSign.unit && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({vitalSign.unit})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: '450px', minHeight: '450px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={chartData} 
                        margin={{ top: 20, right: 40, left: 60, bottom: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          interval="preserveStartEnd"
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Fecha', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: 14 } }}
                        />
                        <YAxis 
                          label={{ value: 'Valor', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 14 } }}
                          tick={{ fontSize: 12 }}
                          width={60}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Valor']}
                          labelFormatter={(label) => `Fecha: ${label}`}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconSize={12}
                          iconType="line"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#1976d2" 
                          strokeWidth={2}
                          dot={{ r: 5 }}
                          activeDot={{ r: 7 }}
                          name={vitalSign.vital_sign_name}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default VitalSignsEvolutionView;

