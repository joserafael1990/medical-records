import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Grid
} from '@mui/material';
import {
  Favorite as HeartIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MonitorHeart as MonitorHeartIcon,
  Thermostat as ThermostatIcon,
  Scale as ScaleIcon,
  Height as HeightIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { ConsultationVitalSign } from '../../types';

interface VitalSignsSectionProps {
  consultationId: string;
  patientId: number;
  vitalSigns: ConsultationVitalSign[];
  isLoading?: boolean;
  onAddVitalSign: () => void;
  onEditVitalSign: (vitalSign: ConsultationVitalSign) => void;
  onDeleteVitalSign: (vitalSignId: number) => void;
}

const VitalSignsSection: React.FC<VitalSignsSectionProps> = ({
  consultationId,
  patientId,
  vitalSigns,
  isLoading = false,
  onAddVitalSign,
  onEditVitalSign,
  onDeleteVitalSign
}) => {
  const getVitalSignIcon = (vitalSignName: string) => {
    const name = vitalSignName.toLowerCase();
    if (name.includes('cardíaca') || name.includes('cardiac')) return <HeartIcon />;
    if (name.includes('temperatura')) return <ThermostatIcon />;
    if (name.includes('peso')) return <ScaleIcon />;
    if (name.includes('estatura') || name.includes('altura')) return <HeightIcon />;
    if (name.includes('presión') || name.includes('presion')) return <MonitorHeartIcon />;
    return <HospitalIcon />;
  };

  const getVitalSignColor = (vitalSignName: string) => {
    const name = vitalSignName.toLowerCase();
    if (name.includes('cardíaca') || name.includes('cardiac')) return '#f44336';
    if (name.includes('temperatura')) return '#ff9800';
    if (name.includes('peso')) return '#4caf50';
    if (name.includes('estatura') || name.includes('altura')) return '#2196f3';
    if (name.includes('presión') || name.includes('presion')) return '#9c27b0';
    return '#607d8b';
  };

  if (isLoading) {
    return (
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonitorHeartIcon sx={{ fontSize: 20 }} />
          Signos Vitales
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MonitorHeartIcon sx={{ fontSize: 20 }} />
        Signos Vitales
      </Typography>

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onAddVitalSign}
        sx={{ mb: 2 }}
      >
        Agregar Signo Vital
      </Button>

      {/* Vital Signs List */}
      {vitalSigns.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center', backgroundColor: '#fafafa' }}>
          <HeartIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No se han registrado signos vitales para esta consulta.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {vitalSigns.map((vitalSign) => (
            <Grid item xs={12} sm={6} md={4} key={vitalSign.id}>
              <Card 
                sx={{ 
                  border: `2px solid ${getVitalSignColor(vitalSign.vital_sign_name)}`,
                  backgroundColor: `${getVitalSignColor(vitalSign.vital_sign_name)}08`
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box 
                      sx={{ 
                        color: getVitalSignColor(vitalSign.vital_sign_name),
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {getVitalSignIcon(vitalSign.vital_sign_name)}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {vitalSign.vital_sign_name}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: getVitalSignColor(vitalSign.vital_sign_name) }}>
                    {vitalSign.value} {vitalSign.unit && <span style={{ fontSize: '0.8em', fontWeight: 400 }}>{vitalSign.unit}</span>}
                  </Typography>
                  {vitalSign.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {vitalSign.notes}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ p: 1, pt: 0 }}>
                  <Tooltip title="Editar">
                    <IconButton 
                      size="small" 
                      onClick={() => onEditVitalSign(vitalSign)}
                      sx={{ color: '#2196f3' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton 
                      size="small" 
                      onClick={() => onDeleteVitalSign(vitalSign.id)}
                      sx={{ color: '#f44336' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default VitalSignsSection;