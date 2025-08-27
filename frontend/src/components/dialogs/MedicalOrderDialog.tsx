// ============================================================================
// MEDICAL ORDER DIALOG - Diálogo para crear órdenes médicas
// Compatible con MUI v7
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Autocomplete,
  Typography,
  Chip,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  MedicalServices as MedicalIcon
} from '@mui/icons-material';
import { 
  MedicalOrderFormData
} from '../../types';
import {
  ORDER_TYPES,
  ORDER_PRIORITIES,
  STUDY_TYPES,
  COMMON_DIAGNOSTIC_ORDERS,
  COMMON_PREPARATION_INSTRUCTIONS
} from '../../constants';

interface MedicalOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (orderData: MedicalOrderFormData) => void;
  patientId?: string;
  consultationId?: string;
  loading?: boolean;
}

const MedicalOrderDialog: React.FC<MedicalOrderDialogProps> = ({
  open,
  onClose,
  onSubmit,
  patientId = '',
  consultationId = '',
  loading = false
}) => {
  // Form state
  const [formData, setFormData] = useState<MedicalOrderFormData>({
    order_type: 'laboratorio',
    study_type: 'hematologia',
    study_name: '',
    study_description: '',
    clinical_indication: '',
    provisional_diagnosis: '',
    diagnosis_cie10: '',
    priority: 'rutina',
    estimated_cost: '',
    requires_preparation: false,
    preparation_instructions: '',
    relevant_clinical_data: '',
    special_instructions: '',
    patient_id: patientId,
    consultation_id: consultationId
  });

  // Available options state
  const [availableStudies, setAvailableStudies] = useState<string[]>([]);
  const [availablePreparations, setAvailablePreparations] = useState<string[]>([]);

  // Update available studies when study type changes
  useEffect(() => {
    const studyType = formData.study_type as keyof typeof COMMON_DIAGNOSTIC_ORDERS;
    if (COMMON_DIAGNOSTIC_ORDERS[studyType]) {
      setAvailableStudies([...COMMON_DIAGNOSTIC_ORDERS[studyType]]);
    } else {
      setAvailableStudies([]);
    }

    // Update available preparations
    const prepType = formData.study_type as keyof typeof COMMON_PREPARATION_INSTRUCTIONS;
    if (COMMON_PREPARATION_INSTRUCTIONS[prepType]) {
      setAvailablePreparations([...COMMON_PREPARATION_INSTRUCTIONS[prepType]]);
    } else {
      setAvailablePreparations([]);
    }
  }, [formData.study_type]);

  const handleChange = (field: keyof MedicalOrderFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clinical_indication.trim()) {
      alert('La indicación clínica es obligatoria');
      return;
    }
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      order_type: 'laboratorio',
      study_type: 'hematologia',
      study_name: '',
      study_description: '',
      clinical_indication: '',
      provisional_diagnosis: '',
      diagnosis_cie10: '',
      priority: 'rutina',
      estimated_cost: '',
      requires_preparation: false,
      preparation_instructions: '',
      relevant_clinical_data: '',
      special_instructions: '',
      patient_id: patientId,
      consultation_id: consultationId
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(21, 101, 192, 0.2)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: 'primary.main',
        color: 'white',
        borderRadius: '16px 16px 0 0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MedicalIcon />
          <Typography variant="h6" component="span">
            Nueva Orden Médica
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose}
          sx={{ color: 'white' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Row 1: Order Type and Study Type */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Orden</InputLabel>
                  <Select
                    value={formData.order_type}
                    label="Tipo de Orden"
                    onChange={(e) => handleChange('order_type', e.target.value)}
                  >
                    {ORDER_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Estudio</InputLabel>
                  <Select
                    value={formData.study_type}
                    label="Tipo de Estudio"
                    onChange={(e) => handleChange('study_type', e.target.value)}
                  >
                    {STUDY_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Study Name */}
            <Autocomplete
              freeSolo
              options={availableStudies}
              value={formData.study_name}
              onChange={(_, newValue) => handleChange('study_name', newValue || '')}
              onInputChange={(_, newInputValue) => handleChange('study_name', newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nombre del Estudio *"
                  placeholder="Selecciona o escribe el nombre del estudio"
                  fullWidth
                />
              )}
            />

            {/* Study Description */}
            <TextField
              label="Descripción del Estudio"
              multiline
              rows={2}
              value={formData.study_description}
              onChange={(e) => handleChange('study_description', e.target.value)}
              placeholder="Descripción detallada del estudio solicitado"
              fullWidth
            />

            {/* Clinical Indication */}
            <TextField
              label="Indicación Clínica *"
              multiline
              rows={2}
              value={formData.clinical_indication}
              onChange={(e) => handleChange('clinical_indication', e.target.value)}
              placeholder="Motivo médico para solicitar este estudio"
              required
              fullWidth
            />

            {/* Row 2: Diagnosis and CIE-10 */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '2 1 400px', minWidth: '300px' }}>
                <TextField
                  label="Diagnóstico Provisional"
                  fullWidth
                  value={formData.provisional_diagnosis}
                  onChange={(e) => handleChange('provisional_diagnosis', e.target.value)}
                  placeholder="Diagnóstico presuntivo del paciente"
                />
              </Box>

              <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
                <TextField
                  label="Código CIE-10"
                  fullWidth
                  value={formData.diagnosis_cie10}
                  onChange={(e) => handleChange('diagnosis_cie10', e.target.value)}
                  placeholder="A00.0"
                />
              </Box>
            </Box>

            {/* Row 3: Priority and Cost */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Prioridad"
                    onChange={(e) => handleChange('priority', e.target.value)}
                  >
                    {ORDER_PRIORITIES.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        <Chip 
                          label={priority.label}
                          size="small"
                          color={
                            priority.value === 'urgente' ? 'error' :
                            priority.value === 'preferente' ? 'warning' : 'default'
                          }
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                <TextField
                  label="Costo Estimado"
                  fullWidth
                  value={formData.estimated_cost}
                  onChange={(e) => handleChange('estimated_cost', e.target.value)}
                  placeholder="$0.00"
                />
              </Box>
            </Box>

            {/* Preparation Switch */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requires_preparation}
                  onChange={(e) => handleChange('requires_preparation', e.target.checked)}
                />
              }
              label="Requiere preparación especial"
            />

            {/* Preparation Instructions */}
            {formData.requires_preparation && (
              <Autocomplete
                freeSolo
                options={availablePreparations}
                value={formData.preparation_instructions}
                onChange={(_, newValue) => handleChange('preparation_instructions', newValue || '')}
                onInputChange={(_, newInputValue) => handleChange('preparation_instructions', newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Instrucciones de Preparación"
                    placeholder="Selecciona o describe las instrucciones"
                    multiline
                    rows={2}
                    fullWidth
                  />
                )}
              />
            )}

            {/* Clinical Data */}
            <TextField
              label="Datos Clínicos Relevantes"
              multiline
              rows={2}
              value={formData.relevant_clinical_data}
              onChange={(e) => handleChange('relevant_clinical_data', e.target.value)}
              placeholder="Información clínica relevante para el estudio"
              fullWidth
            />

            {/* Special Instructions */}
            <TextField
              label="Instrucciones Especiales"
              multiline
              rows={2}
              value={formData.special_instructions}
              onChange={(e) => handleChange('special_instructions', e.target.value)}
              placeholder="Instrucciones adicionales para el laboratorio o estudio"
              fullWidth
            />

          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Creando...' : 'Crear Orden'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MedicalOrderDialog;