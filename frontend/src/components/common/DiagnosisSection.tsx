import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Divider
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';

interface DiagnosisSectionProps {
  diagnoses: DiagnosisCatalog[];
  onAddDiagnosis: () => void;
  onRemoveDiagnosis: (diagnosisId: string) => void;
  onEditDiagnosis?: (diagnosis: DiagnosisCatalog) => void;
  title?: string;
  maxSelections?: number;
  showAddButton?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

const DiagnosisSection: React.FC<DiagnosisSectionProps> = ({
  diagnoses,
  onAddDiagnosis,
  onRemoveDiagnosis,
  onEditDiagnosis,
  title = "Diagnósticos",
  maxSelections = 10,
  showAddButton = true,
  isLoading = false,
  error
}) => {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'severe': return 'warning';
      case 'moderate': return 'info';
      case 'mild': return 'success';
      default: return 'default';
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'severe': return 'Severa';
      case 'moderate': return 'Moderada';
      case 'mild': return 'Leve';
      default: return severity;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <MedicalServicesIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${diagnoses.length}/${maxSelections}`} 
            size="small" 
            color={diagnoses.length >= maxSelections ? 'error' : 'primary'}
          />
        </Box>
        
        {showAddButton && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddDiagnosis}
            disabled={diagnoses.length >= maxSelections || isLoading}
            size="small"
          >
            Nuevo Diagnóstico
          </Button>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Diagnoses List */}
      {diagnoses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No se han registrado diagnósticos. Haz clic en "Nuevo Diagnóstico" para agregar uno.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {diagnoses.map((diagnosis) => (
            <Grid item xs={12} sm={6} md={4} key={diagnosis.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  '&:hover': {
                    boxShadow: 2
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                      {diagnosis.code}
                    </Typography>
                    <Box>
                      <Tooltip title="Eliminar diagnóstico">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => onRemoveDiagnosis(diagnosis.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {onEditDiagnosis && (
                        <Tooltip title="Editar diagnóstico">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => onEditDiagnosis(diagnosis)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1, minHeight: '2.5em' }}>
                    {diagnosis.name}
                  </Typography>
                  
                  {diagnosis.description && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {diagnosis.description.length > 100 
                        ? `${diagnosis.description.substring(0, 100)}...` 
                        : diagnosis.description
                      }
                    </Typography>
                  )}
                  
                  <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                    {diagnosis.category && (
                      <Chip 
                        label={diagnosis.category} 
                        size="small" 
                        variant="outlined"
                        color="default"
                      />
                    )}
                    {diagnosis.specialty && (
                      <Chip 
                        label={diagnosis.specialty} 
                        size="small" 
                        variant="outlined"
                        color="info"
                      />
                    )}
                    {diagnosis.severity_level && (
                      <Chip 
                        label={getSeverityLabel(diagnosis.severity_level)} 
                        size="small" 
                        color={getSeverityColor(diagnosis.severity_level)}
                      />
                    )}
                    {diagnosis.is_chronic && (
                      <Chip 
                        label="Crónico" 
                        size="small" 
                        color="warning"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Max Selections Warning */}
      {diagnoses.length >= maxSelections && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Has alcanzado el máximo de {maxSelections} diagnósticos permitidos.
        </Alert>
      )}
    </Box>
  );
};

export default DiagnosisSection;
