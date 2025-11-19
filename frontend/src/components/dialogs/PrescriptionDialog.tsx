import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Autocomplete,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText
} from '@mui/material';
import {
  Close as CloseIcon,
  Medication as MedicationIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Medication, CreatePrescriptionData } from '../../types';
import { preventBackdropClose } from '../../utils/dialogHelpers';

interface PrescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (consultationId: string) => Promise<void>;
  formData: CreatePrescriptionData;
  onFormDataChange: (data: Partial<CreatePrescriptionData>) => void;
  medications: Medication[];
  onFetchMedications: (search?: string) => Promise<void>;
  onCreateMedication: (name: string) => Promise<Medication>;
  isEditing?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  consultationId: string;
}

const PrescriptionDialog: React.FC<PrescriptionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  medications,
  onFetchMedications,
  onCreateMedication,
  isEditing = false,
  isSubmitting = false,
  error = null,
  consultationId
}) => {
  const [medicationInputValue, setMedicationInputValue] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [creatingMedication, setCreatingMedication] = useState(false);

  // Load medications on mount
  useEffect(() => {
    if (open) {
      onFetchMedications();
    }
  }, [open, onFetchMedications]);

  // Set selected medication when editing
  useEffect(() => {
    if (isEditing && formData.medication_id > 0 && medications.length > 0) {
      const medication = medications.find(m => m.id === formData.medication_id);
      if (medication) {
        setSelectedMedication(medication);
        setMedicationInputValue(medication.name);
      }
    }
  }, [isEditing, formData.medication_id, medications]);

  // Reset fields when dialog closes
  useEffect(() => {
    if (!open) {
      setMedicationInputValue('');
      setSelectedMedication(null);
    }
  }, [open]);

  const handleMedicationChange = (event: any, newValue: Medication | string | null) => {
    if (typeof newValue === 'string') {
      // User typed a new medication name
      setMedicationInputValue(newValue);
      setSelectedMedication(null);
      onFormDataChange({ medication_id: 0 });
    } else if (newValue && newValue.id) {
      // User selected an existing medication
      setSelectedMedication(newValue);
      setMedicationInputValue(newValue.name);
      onFormDataChange({ medication_id: newValue.id });
    } else {
      // Cleared
      setSelectedMedication(null);
      setMedicationInputValue('');
      onFormDataChange({ medication_id: 0 });
    }
  };

  const handleCreateNewMedication = async () => {
    if (!medicationInputValue.trim()) return;
    
    setCreatingMedication(true);
    try {
      const newMedication = await onCreateMedication(medicationInputValue.trim());
      setSelectedMedication(newMedication);
      onFormDataChange({ medication_id: newMedication.id });
    } catch (error) {
      console.error('Error creating medication:', error);
    } finally {
      setCreatingMedication(false);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(consultationId);
  };

  const isFormValid = 
    formData.medication_id > 0 &&
    formData.dosage.trim() !== '' &&
    formData.frequency.trim() !== '' &&
    formData.duration.trim() !== '';

  return (
    <Dialog open={open} onClose={preventBackdropClose(onClose)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MedicationIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Medicamento' : 'Agregar Medicamento'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error.contrastText">
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Medication Selection with Option to Create New */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Medicamento *
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
              <Autocomplete
                sx={{ flexGrow: 1, minWidth: 0 }}
                options={medications || []}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                value={selectedMedication}
                onChange={handleMedicationChange}
                inputValue={medicationInputValue}
                onInputChange={(event, newInputValue) => {
                  setMedicationInputValue(newInputValue);
                  if (newInputValue.length > 2) {
                    onFetchMedications(newInputValue);
                  }
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar o crear medicamento"
                    placeholder="Empiece a escribir para buscar..."
                    required
                  />
                )}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateNewMedication}
                disabled={
                  creatingMedication ||
                  !medicationInputValue.trim() ||
                  Boolean(
                    selectedMedication &&
                    selectedMedication.name?.toLowerCase().trim() === medicationInputValue.toLowerCase().trim()
                  )
                }
                sx={{ minWidth: 140, whiteSpace: 'nowrap' }}
              >
                {creatingMedication ? 'Creando...' : 'Guardar medicamento'}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Escriba el nombre completo. Si no encuentra coincidencias, use el botón para guardarlo y reutilizarlo.
            </Typography>
          </Box>

          {/* Dosage, Frequency, Duration */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Dosis"
                value={formData.dosage}
                onChange={(e) => onFormDataChange({ dosage: e.target.value })}
                placeholder="Ej: 500mg"
                helperText="Ej: 500mg, 1 tableta, 10ml"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Frecuencia"
                value={formData.frequency}
                onChange={(e) => onFormDataChange({ frequency: e.target.value })}
                placeholder="Ej: Cada 8 horas"
                helperText="Ej: Cada 8 horas, 2 veces al día"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Duración"
                value={formData.duration}
                onChange={(e) => onFormDataChange({ duration: e.target.value })}
                placeholder="Ej: 7 días"
                helperText="Ej: 7 días, 2 semanas"
              />
            </Grid>
          </Grid>

          {/* Quantity and Via de Administración */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad (opcional)"
                value={formData.quantity || ''}
                onChange={(e) => onFormDataChange({ quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Ej: 21"
                helperText="Cantidad total a surtir"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel 
                  id="via-administracion-label"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 'calc(100% - 50px)'
                  }}
                >
                  Vía (opcional)
                </InputLabel>
                <Select
                  labelId="via-administracion-label"
                  value={formData.via_administracion || ''}
                  onChange={(e) => onFormDataChange({ via_administracion: e.target.value })}
                  label="Vía (opcional)"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300
                      }
                    }
                  }}
                >
                  <MenuItem value=""><em>Ninguna</em></MenuItem>
                  <MenuItem value="Oral">Oral</MenuItem>
                  <MenuItem value="Intravenosa">Intravenosa</MenuItem>
                  <MenuItem value="Intramuscular">Intramuscular</MenuItem>
                  <MenuItem value="Subcutánea">Subcutánea</MenuItem>
                  <MenuItem value="Tópica">Tópica</MenuItem>
                  <MenuItem value="Oftálmica">Oftálmica</MenuItem>
                  <MenuItem value="Ótica">Ótica</MenuItem>
                  <MenuItem value="Nasal">Nasal</MenuItem>
                  <MenuItem value="Rectal">Rectal</MenuItem>
                  <MenuItem value="Vaginal">Vaginal</MenuItem>
                  <MenuItem value="Inhalatoria">Inhalatoria</MenuItem>
                  <MenuItem value="Sublingual">Sublingual</MenuItem>
                </Select>
                <FormHelperText>Vía de administración del medicamento</FormHelperText>
              </FormControl>
            </Grid>
          </Grid>

          {/* Instructions */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Instrucciones (opcional)"
            value={formData.instructions || ''}
            onChange={(e) => onFormDataChange({ instructions: e.target.value })}
            placeholder="Ej: Tomar con alimentos, evitar bebidas alcohólicas..."
            helperText="Indicaciones especiales para el paciente"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !isFormValid}
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Agregar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrescriptionDialog;

