import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  MonitorHeart as MonitorHeartIcon,
  ShowChart as ShowChartIcon
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
  initialHistory?: PatientVitalSignsHistory | null; // Optional pre-loaded history
}

const VitalSignsEvolutionView: React.FC<VitalSignsEvolutionViewProps> = ({
  patientId,
  patientName,
  onBack,
  fetchHistory,
  initialHistory
}) => {
  const [history, setHistory] = useState<PatientVitalSignsHistory | null>(initialHistory || null);
  const [loading, setLoading] = useState(!initialHistory);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If initialHistory is provided, use it and don't fetch
    if (initialHistory) {
      setHistory(initialHistory);
      setLoading(false);
      return;
    }

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
  }, [patientId, fetchHistory, initialHistory]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const prepareChartData = (vitalSignData: PatientVitalSignsHistory['vital_signs_history'][0]) => {
    if (!vitalSignData || !vitalSignData.data || !Array.isArray(vitalSignData.data)) {
      return [];
    }
    
    return vitalSignData.data
      .filter(item => {
        // Include items with valid date and value (including 0)
        // value can be 0, so we check for !== null and !== undefined
        return item.date !== null && 
               item.date !== undefined && 
               item.value !== null && 
               item.value !== undefined;
      })
      .map(item => ({
        date: formatDate(item.date),
        value: Number(item.value), // Ensure value is a number
        fullDate: item.date
      }))
      .sort((a, b) => {
        if (!a.fullDate || !b.fullDate) return 0;
        try {
          return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime();
        } catch {
          return 0;
        }
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
    <Box sx={{ width: '100%', overflow: 'visible' }}>
      {/* Header - Only show if onBack is provided (modal view) */}
      {onBack && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Evolución de Signos Vitales
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Paciente: {history.patient_name || patientName}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={onBack}
            sx={{ minWidth: 'auto' }}
          >
            Volver
          </Button>
        </Box>
      )}
      
      {/* Inline header when no back button */}
      {!onBack && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChartIcon color="primary" />
            Evolución de Signos Vitales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historial completo de signos vitales del paciente
          </Typography>
        </Box>
      )}

      {/* Charts */}
      <Box sx={{ width: '100%' }}>
        {history.vital_signs_history.map((vitalSign) => {
          const chartData = prepareChartData(vitalSign);
          
          if (chartData.length === 0) {
            return null;
          }

          // Get unit from first data item if available
          const unit = vitalSign.data && vitalSign.data.length > 0 
            ? vitalSign.data.find(item => item.unit)?.unit 
            : null;

          return (
            <Card key={vitalSign.vital_sign_id} sx={{ display: 'flex', flexDirection: 'column', mb: 3, width: '100%' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                  <MonitorHeartIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {vitalSign.vital_sign_name}
                    {unit && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({unit})
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
          );
        })}
      </Box>
    </Box>
  );
};

export default VitalSignsEvolutionView;

