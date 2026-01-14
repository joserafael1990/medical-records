import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  AttachFile as AttachFileIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { CreateClinicalStudyData, StudyType, StudyStatus, UrgencyLevel } from '../../types';
import { STUDY_TYPES, STUDY_STATUS_OPTIONS, URGENCY_LEVELS } from '../../constants';

interface ClinicalStudyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClinicalStudyData) => Promise<void>;
  formData: CreateClinicalStudyData;
  onFormDataChange: (data: Partial<CreateClinicalStudyData>) => void;
  isEditing: boolean;
  isSubmitting: boolean;
  error?: string | null;
}

const ClinicalStudyDialog: React.FC<ClinicalStudyDialogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  isEditing,
  isSubmitting,
  error
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setFieldErrors({});
    }
  }, [open]);

  const handleFieldChange = (field: keyof CreateClinicalStudyData, value: any) => {
    onFormDataChange({ [field]: value });
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFormDataChange({ file });
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.study_name.trim()) {
      errors.study_name = 'El nombre del estudio es requerido';
    }

    if (!formData.ordered_date) {
      errors.ordered_date = 'La fecha de solicitud es requerida';
    }

    if (!formData.ordering_doctor.trim()) {
      errors.ordering_doctor = 'El médico solicitante es requerido';
    }

    if (!formData.clinical_indication?.trim()) {
      errors.clinical_indication = 'La indicación clínica es requerida';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting clinical study:', err);
    }
  };

  const getStatusColor = (status: StudyStatus) => {
    const statusOption = STUDY_STATUS_OPTIONS.find(option => option.value === status);
    return statusOption?.color || '#gray';
  };

  const getUrgencyColor = (urgency: UrgencyLevel) => {
    const urgencyOption = URGENCY_LEVELS.find(option => option.value === urgency);
    return urgencyOption?.color || '#4caf50';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Estudio Clínico' : 'Nuevo Estudio Clínico'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
          <Box 
            data-testid="error-message"
            sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: 'error.main', 
              borderRadius: 1,
              backgroundColor: '#d32f2f !important' // Force red background
            }}
          >
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left Column - Basic Information */}
          <Box sx={{ flex: { md: '0 0 50%' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              
              {/* Basic Information */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon color="primary" />
                  Información Básica
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Nombre del Estudio"
                    value={formData.study_name}
                    onChange={(e) => handleFieldChange('study_name', e.target.value)}
                    error={!!fieldErrors.study_name}
                    helperText={fieldErrors.study_name}
                    required
                    size="small"
                  />

                  <FormControl fullWidth required size="small">
                    <InputLabel>Tipo de Estudio</InputLabel>
                    <Select
                      value={formData.study_type}
                      onChange={(e) => handleFieldChange('study_type', e.target.value)}
                      label="Tipo de Estudio"
                    >
                      {STUDY_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Descripción del Estudio"
                    value={formData.study_description || ''}
                    onChange={(e) => handleFieldChange('study_description', e.target.value)}
                    multiline
                    rows={2}
                    placeholder="Descripción detallada del estudio a realizar..."
                    size="small"
                  />
                </Box>
              </Box>

              {/* Dates and Status */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon color="info" />
                  Fechas y Estado
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Fecha de Solicitud"
                    type="date"
                    value={formData.ordered_date}
                    onChange={(e) => handleFieldChange('ordered_date', e.target.value)}
                    error={!!fieldErrors.ordered_date}
                    helperText={fieldErrors.ordered_date}
                    InputLabelProps={{ shrink: true }}
                    required
                    size="small"
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      label="Estado"
                    >
                      {STUDY_STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: status.color
                              }}
                            />
                            {status.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Urgencia</InputLabel>
                    <Select
                      value={formData.urgency}
                      onChange={(e) => handleFieldChange('urgency', e.target.value)}
                      label="Urgencia"
                    >
                      {URGENCY_LEVELS.map((urgency) => (
                        <MenuItem key={urgency.value} value={urgency.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: urgency.color
                              }}
                            />
                            {urgency.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right Column - Medical Information */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              
              {/* Medical Information */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon color="success" />
                  Información Médica
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Médico Solicitante"
                    value={formData.ordering_doctor}
                    onChange={(e) => handleFieldChange('ordering_doctor', e.target.value)}
                    error={!!fieldErrors.ordering_doctor}
                    helperText={fieldErrors.ordering_doctor}
                    required
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="Médico Ejecutor"
                    value={formData.performing_doctor || ''}
                    onChange={(e) => handleFieldChange('performing_doctor', e.target.value)}
                    placeholder="Opcional"
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="Institución"
                    value={formData.institution || ''}
                    onChange={(e) => handleFieldChange('institution', e.target.value)}
                    placeholder="Hospital, clínica o laboratorio donde se realizará el estudio"
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="Indicación Clínica"
                    value={formData.clinical_indication || ''}
                    onChange={(e) => handleFieldChange('clinical_indication', e.target.value)}
                    error={!!fieldErrors.clinical_indication}
                    helperText={fieldErrors.clinical_indication}
                    multiline
                    rows={3}
                    placeholder="Motivo clínico para la realización del estudio..."
                    required
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="Historia Relevante"
                    value={formData.relevant_history || ''}
                    onChange={(e) => handleFieldChange('relevant_history', e.target.value)}
                    multiline
                    rows={2}
                    placeholder="Antecedentes médicos relevantes para la interpretación del estudio..."
                    size="small"
                  />
                </Box>
              </Box>

              {/* Results Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon color="warning" />
                  Resultados
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Resultados del Estudio"
                    value={formData.results_text || ''}
                    onChange={(e) => handleFieldChange('results_text', e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Resultados obtenidos del estudio..."
                    size="small"
                  />

                  <TextField
                    fullWidth
                    label="Interpretación"
                    value={formData.interpretation || ''}
                    onChange={(e) => handleFieldChange('interpretation', e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Interpretación de los resultados y recomendaciones..."
                    size="small"
                  />
                </Box>
              </Box>

              {/* File Upload */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UploadIcon color="action" />
                  Archivo Adjunto
                </Typography>
                
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: 'grey.50',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'primary.50'
                    }
                  }}
                >
                  <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <label htmlFor="file-upload">
                    <Box sx={{ cursor: 'pointer' }}>
                      <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {selectedFile ? selectedFile.name : 'Hacer clic para seleccionar archivo'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PDF, JPG, PNG, DOC, DOCX (máx. 10MB)
                      </Typography>
                    </Box>
                  </label>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          sx={{ borderRadius: '8px' }}
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Estudio' : 'Crear Estudio')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClinicalStudyDialog;
