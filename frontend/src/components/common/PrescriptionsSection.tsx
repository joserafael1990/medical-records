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
  Grid,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Medication as MedicationIcon,
  LocalPharmacy as PharmacyIcon
} from '@mui/icons-material';
import { ConsultationPrescription } from '../../types';

interface PrescriptionsSectionProps {
  consultationId: string;
  prescriptions: ConsultationPrescription[];
  isLoading?: boolean;
  onAddPrescription: () => void;
  onEditPrescription: (prescription: ConsultationPrescription) => void;
  onDeletePrescription: (prescriptionId: number) => void;
}

const PrescriptionsSection: React.FC<PrescriptionsSectionProps> = ({
  consultationId,
  prescriptions,
  isLoading = false,
  onAddPrescription,
  onEditPrescription,
  onDeletePrescription
}) => {
  if (isLoading) {
    return (
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PharmacyIcon sx={{ fontSize: 20 }} />
          Medicamentos Prescritos
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PharmacyIcon sx={{ fontSize: 20 }} />
        Medicamentos Prescritos
      </Typography>

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onAddPrescription}
        sx={{ mb: 2 }}
      >
        Agregar Medicamento
      </Button>

      {/* Prescriptions List */}
      {prescriptions.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center', backgroundColor: '#fafafa' }}>
          <MedicationIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No se han prescrito medicamentos para esta consulta.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {prescriptions.map((prescription) => (
            <Grid item xs={12} md={6} key={prescription.id}>
              <Card 
                sx={{ 
                  border: '2px solid #2196f3',
                  backgroundColor: '#2196f308',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Medication Name */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <MedicationIcon sx={{ color: '#2196f3' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#2196f3' }}>
                      {prescription.medication_name}
                    </Typography>
                  </Box>

                  {/* Dosage, Frequency, Duration */}
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Dosis
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {prescription.dosage}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Frecuencia
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {prescription.frequency}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Duración
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {prescription.duration}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Quantity and Via */}
                  {(prescription.quantity || prescription.via_administracion) && (
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={1}>
                        {prescription.quantity && (
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Cantidad
                            </Typography>
                            <Chip 
                              label={`${prescription.quantity}`} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                          </Grid>
                        )}
                        {prescription.via_administracion && (
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Vía
                            </Typography>
                            <Chip 
                              label={prescription.via_administracion} 
                              size="small" 
                              color="secondary"
                              variant="outlined"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  )}

                  {/* Instructions */}
                  {prescription.instructions && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Instrucciones
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        {prescription.instructions}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ p: 1, pt: 0, justifyContent: 'flex-end' }}>
                  <Tooltip title="Editar">
                    <IconButton 
                      size="small" 
                      onClick={() => onEditPrescription(prescription)}
                      sx={{ color: '#2196f3' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton 
                      size="small" 
                      onClick={() => onDeletePrescription(prescription.id)}
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

export default PrescriptionsSection;

