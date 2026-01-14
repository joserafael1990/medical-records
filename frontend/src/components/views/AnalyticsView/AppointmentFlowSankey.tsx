import React, { useState, useMemo } from 'react';
import { Card, CardContent, Typography, Box, TextField, FormControlLabel, Checkbox } from '@mui/material';
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
  const [showPercentages, setShowPercentages] = useState<boolean>(false);

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

  const { sankeyData, percentages, totalScheduled, confirmedAppointments, completedConsultations, cancelledByDoctor, cancelledByPatient } = appointmentFlow;
  
  // Calculate total cancelled for display
  const totalCancelled = cancelledByDoctor + cancelledByPatient;

  // Enhance sankey data with labels that include percentages if enabled
  // Filter links to only show those with real values (> 0), but keep all nodes
  const enhancedSankeyData = useMemo(() => {
    // Filter links: only keep those with meaningful values
    const activeLinks = sankeyData.links.filter(link => link.value > 0);
    
    // Get all node IDs from active links
    const activeNodeIds = new Set<string>();
    activeLinks.forEach(link => {
      activeNodeIds.add(link.source);
      activeNodeIds.add(link.target);
    });
    
    // Always include starting node
    activeNodeIds.add('Citas Agendadas');
    
    // Filter nodes to only include those that are connected by active links
    const visibleNodes = sankeyData.nodes.filter(node => activeNodeIds.has(node.id));
    
    let processedData = {
      nodes: visibleNodes,
      links: activeLinks
    };
    
    if (showPercentages) {
      processedData = {
        ...processedData,
        nodes: visibleNodes.map(node => {
          // Find links that connect to this node to show percentage
          const incomingLinks = activeLinks.filter(link => link.target === node.id);
          
          let label = node.label;
          
          // Add percentage to label if it's a target node (has incoming links)
          if (incomingLinks.length > 0 && node.id !== 'Citas Agendadas') {
            const link = incomingLinks[0];
            label = `${node.label} (${link.percentage.toFixed(1)}%)`;
          }
          
          return { ...node, label };
        }),
        links: activeLinks
      };
    }
    
    return processedData;
  }, [sankeyData, showPercentages]);

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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showPercentages}
                onChange={(e) => setShowPercentages(e.target.checked)}
                size="small"
              />
            }
            label="Mostrar porcentajes"
          />
        </Box>

        <Box sx={{ height: { xs: 400, sm: 450, md: 500 } }}>
          <ResponsiveSankey
            data={enhancedSankeyData}
            margin={{ top: 40, right: 160, bottom: 40, left: 80 }}
            align="justify"
            colors={{ scheme: 'category10' }}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={20}
            nodeSpacing={50}
            nodeBorderWidth={0}
            nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
            linkOpacity={0.6}
            linkHoverOthersOpacity={0.1}
            linkContract={2}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="vertical"
            labelPadding={25}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
            animate={true}
            motionConfig="gentle"
            linkTooltip={(link: any) => {
              // Don't show tooltip for placeholder links or if link data is invalid
              if (!link || link.value <= 0.01) return null;
              
              // Safely get source and target labels
              const sourceLabel = link.source?.label || link.source?.id || 'Origen';
              const targetLabel = link.target?.label || link.target?.id || 'Destino';
              
              return (
                <Box
                  sx={{
                    bgcolor: 'background.paper',
                    p: 1.5,
                    borderRadius: 1,
                    boxShadow: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    minWidth: 200
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {sourceLabel} → {targetLabel}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Math.round(link.value)} {showPercentages && link.percentage !== undefined && `(${link.percentage.toFixed(1)}%)`}
                  </Typography>
                </Box>
              );
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(6, minmax(0, 1fr))'
            },
            gap: 1.5,
            mt: 2
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Citas Agendadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalScheduled}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Citas Confirmadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {confirmedAppointments} {showPercentages && `(${percentages.confirmed.toFixed(1)}%)`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Consultas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedConsultations} {showPercentages && `(${percentages.completed.toFixed(1)}%)`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Citas Canceladas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalCancelled} {showPercentages && `(${(totalCancelled / totalScheduled * 100).toFixed(1)}%)`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Canceladas por Médico
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {cancelledByDoctor} {showPercentages && totalCancelled > 0 && `(${(cancelledByDoctor / totalCancelled * 100).toFixed(1)}%)`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Canceladas por Paciente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {cancelledByPatient} {showPercentages && totalCancelled > 0 && `(${(cancelledByPatient / totalCancelled * 100).toFixed(1)}%)`}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AppointmentFlowSankey;

