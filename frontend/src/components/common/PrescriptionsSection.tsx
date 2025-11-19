import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Grid,
  Chip,
  Autocomplete,
  TextField,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Medication as MedicationIcon,
  LocalPharmacy as PharmacyIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { ConsultationPrescription, Medication, CreatePrescriptionData } from '../../types';
import { logger } from '../../utils/logger';

interface PrescriptionsSectionProps {
  consultationId: string;
  prescriptions: ConsultationPrescription[];
  isLoading?: boolean;
  onAddPrescription: (prescriptionData: CreatePrescriptionData) => Promise<void>;
  onEditPrescription?: (prescription: ConsultationPrescription, prescriptionData: CreatePrescriptionData) => Promise<void>;
  onDeletePrescription: (prescriptionId: number) => void;
  medications?: Medication[];
  onFetchMedications?: (search?: string) => Promise<void>;
  onCreateMedication?: (name: string) => Promise<Medication>;
}

const PrescriptionsSection: React.FC<PrescriptionsSectionProps> = ({
  consultationId,
  prescriptions,
  isLoading = false,
  onAddPrescription,
  onEditPrescription,
  onDeletePrescription,
  medications = [],
  onFetchMedications,
  onCreateMedication
}) => {
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [medicationSearch, setMedicationSearch] = useState('');
  const [isCreatingMedication, setIsCreatingMedication] = useState(false);
  const [formData, setFormData] = useState<CreatePrescriptionData>({
    medication_id: 0,
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: undefined,
    via_administracion: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch medications on mount and when search changes
  useEffect(() => {
    if (onFetchMedications) {
      const timeoutId = setTimeout(() => {
        onFetchMedications(medicationSearch || undefined);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [medicationSearch, onFetchMedications]);

  // Update medication_id when medication is selected
  useEffect(() => {
    if (selectedMedication) {
      setFormData(prev => ({ ...prev, medication_id: selectedMedication.id }));
      setMedicationSearch(selectedMedication.name);
    }
  }, [selectedMedication]);

  const medicationExists = medications.some(
    (medication) => medication.name?.toLowerCase().trim() === medicationSearch.toLowerCase().trim()
  );

  const handleMedicationChange = (
    _event: any,
    newValue: Medication | string | null
  ) => {
    if (typeof newValue === 'string') {
      setMedicationSearch(newValue);
      setSelectedMedication(null);
      setFormData(prev => ({ ...prev, medication_id: 0 }));
    } else if (newValue && newValue.id) {
      setSelectedMedication(newValue);
      setMedicationSearch(newValue.name);
      setFormData(prev => ({ ...prev, medication_id: newValue.id }));
    } else {
      setSelectedMedication(null);
      setFormData(prev => ({ ...prev, medication_id: 0 }));
    }
  };

  const handleCreateMedication = async () => {
    if (!onCreateMedication || !medicationSearch.trim() || medicationExists) {
      return;
    }

    try {
      setIsCreatingMedication(true);
      const newMedication = await onCreateMedication(medicationSearch.trim());
      setSelectedMedication(newMedication);
      setFormData(prev => ({ ...prev, medication_id: newMedication.id }));
    } catch (error) {
      logger.error('Error creating medication', error, 'api');
    } finally {
      setIsCreatingMedication(false);
    }
  };

  const handleSave = async () => {
    if (!formData.medication_id || !formData.dosage || !formData.frequency || !formData.duration) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddPrescription(formData);
      // Clear form
      setSelectedMedication(null);
      setMedicationSearch('');
      setFormData({
        medication_id: 0,
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: undefined,
        via_administracion: ''
      });
    } catch (error) {
      logger.error('Error saving prescription', error, 'api');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Add Prescription - Inline Form */}
      <Card sx={{ mb: 3, border: '1px dashed', borderColor: 'grey.300', backgroundColor: '#fafafa' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Primera fila: nombre del medicamento y botón guardar */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Autocomplete
                  freeSolo
                  options={medications}
                  getOptionLabel={(option) => option.name || ''}
                  value={selectedMedication}
                  onChange={handleMedicationChange}
                  onInputChange={(_event, newInputValue) => {
                    setMedicationSearch(newInputValue);
                  }}
                  filterOptions={(x) => x}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Nombre del medicamento"
                      size="small"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  )}
                />
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateMedication}
                disabled={
                  isCreatingMedication ||
                  !medicationSearch.trim() ||
                  medicationExists ||
                  !onCreateMedication
                }
                sx={{ flexShrink: 0, whiteSpace: 'nowrap', minHeight: 40 }}
              >
                {isCreatingMedication ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>
            {/* Segunda fila: Dosis, Frecuencia, Duración */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 0%' }, minWidth: { xs: '100%', sm: '160px' } }}>
                <TextField
                  placeholder="Dosis"
                  value={formData.dosage}
                  onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 0%' }, minWidth: { xs: '100%', sm: '160px' } }}>
                <TextField
                  placeholder="Frecuencia"
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 0%' }, minWidth: { xs: '100%', sm: '160px' } }}>
                <TextField
                  placeholder="Duración"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Box>
            </Box>
            {/* Tercera fila: Cantidad y Vía de administración */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              {/* Cantidad a surtir - Half size */}
              <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 0%' }, minWidth: { xs: 'calc(50% - 8px)', sm: '120px' } }}>
                <TextField
                  type="number"
                  placeholder="Cantidad a surtir"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value ? parseInt(e.target.value) : undefined }))}
                  size="small"
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Box>
              {/* Vía de administración - Half size */}
              <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 0%' }, minWidth: { xs: 'calc(50% - 8px)', sm: '120px' } }}>
                <TextField
                  placeholder="Vía de administración"
                  value={formData.via_administracion}
                  onChange={(e) => setFormData(prev => ({ ...prev, via_administracion: e.target.value }))}
                  size="small"
                  fullWidth
                />
              </Box>
            </Box>
            
            {/* Third row: Instrucciones and Add button */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Instrucciones (opcional)"
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                size="small"
                sx={{ flex: 1 }}
              />
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant="contained"
                  startIcon={isSubmitting ? undefined : <MedicationIcon />}
                  onClick={handleSave}
                  disabled={isSubmitting || !formData.medication_id || !formData.dosage || !formData.frequency || !formData.duration}
                >
                  {isSubmitting ? <CircularProgress size={20} /> : 'Agregar a la receta'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

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
                <CardContent sx={{ p: 1, pt: 0, display: 'flex', justifyContent: 'flex-end' }}>
                  <Tooltip title="Eliminar">
                    <IconButton 
                      size="small" 
                      onClick={() => onDeletePrescription(prescription.id)}
                      sx={{ color: '#f44336' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default PrescriptionsSection;

