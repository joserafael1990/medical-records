import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  LocalPharmacy as PharmacyIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  via_administracion: string;
  instructions: string;
}

interface PrescriptionsSectionProps {
  prescriptions: Prescription[];
  availableMedications: any[];
  onAddPrescription: (prescription: any) => void;
  onRemovePrescription: (prescriptionId: string) => void;
  errors: Record<string, string>;
}

export const PrescriptionsSection: React.FC<PrescriptionsSectionProps> = ({
  prescriptions,
  availableMedications,
  onAddPrescription,
  onRemovePrescription,
  errors
}) => {
  const [addPrescriptionDialogOpen, setAddPrescriptionDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [prescriptionData, setPrescriptionData] = useState({
    dosage: '',
    frequency: '',
    duration: '',
    quantity: 0,
    via_administracion: '',
    instructions: ''
  });

  const frequencyOptions = [
    'Cada 8 horas',
    'Cada 12 horas',
    'Cada 24 horas',
    '2 veces al día',
    '3 veces al día',
    '4 veces al día',
    'Según necesidad'
  ];

  const viaAdministracionOptions = [
    'Oral',
    'Intramuscular',
    'Intravenoso',
    'Subcutáneo',
    'Tópico',
    'Inhalado',
    'Rectal',
    'Vaginal'
  ];

  const handleAddPrescription = () => {
    if (selectedMedication) {
      onAddPrescription({
        ...selectedMedication,
        ...prescriptionData
      });
      setSelectedMedication(null);
      setPrescriptionData({
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 0,
        via_administracion: '',
        instructions: ''
      });
      setAddPrescriptionDialogOpen(false);
    }
  };

  const handleRemovePrescription = (prescriptionId: string) => {
    onRemovePrescription(prescriptionId);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PharmacyIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h3">
              Prescripciones
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddPrescriptionDialogOpen(true)}
            size="small"
          >
            Agregar Prescripción
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {prescriptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No hay prescripciones agregadas
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {prescriptions.map((prescription) => (
              <Grid item xs={12} sm={6} md={4} key={prescription.id}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {prescription.medication_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {prescription.dosage} - {prescription.frequency}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {prescription.duration} - {prescription.quantity} unidades
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Vía: {prescription.via_administracion}
                      </Typography>
                      {prescription.instructions && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {prescription.instructions}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleRemovePrescription(prescription.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Add Prescription Dialog */}
        <Dialog
          open={addPrescriptionDialogOpen}
          onClose={() => setAddPrescriptionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Agregar Prescripción</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Autocomplete
                options={availableMedications || []}
                getOptionLabel={(option) => option.name || option.medication_name}
                value={selectedMedication}
                onChange={(event, newValue) => setSelectedMedication(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar Medicamento"
                    placeholder="Escribe para buscar..."
                    fullWidth
                  />
                )}
                sx={{ mb: 2 }}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Dosis"
                    value={prescriptionData.dosage}
                    onChange={(e) => setPrescriptionData(prev => ({ ...prev, dosage: e.target.value }))}
                    fullWidth
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Frecuencia</InputLabel>
                    <Select
                      value={prescriptionData.frequency}
                      onChange={(e) => setPrescriptionData(prev => ({ ...prev, frequency: e.target.value }))}
                      label="Frecuencia"
                    >
                      {frequencyOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Duración"
                    value={prescriptionData.duration}
                    onChange={(e) => setPrescriptionData(prev => ({ ...prev, duration: e.target.value }))}
                    fullWidth
                    size="small"
                    placeholder="ej. 7 días"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Cantidad"
                    type="number"
                    value={prescriptionData.quantity}
                    onChange={(e) => setPrescriptionData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    fullWidth
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Vía de Administración</InputLabel>
                    <Select
                      value={prescriptionData.via_administracion}
                      onChange={(e) => setPrescriptionData(prev => ({ ...prev, via_administracion: e.target.value }))}
                      label="Vía de Administración"
                    >
                      {viaAdministracionOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Instrucciones adicionales"
                    multiline
                    rows={2}
                    value={prescriptionData.instructions}
                    onChange={(e) => setPrescriptionData(prev => ({ ...prev, instructions: e.target.value }))}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddPrescriptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddPrescription}
              variant="contained"
              disabled={!selectedMedication}
            >
              Agregar
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
