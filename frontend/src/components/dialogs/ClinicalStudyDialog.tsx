import React, { memo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Autocomplete,
  Alert,
  Collapse,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Science as ScienceIcon,
  Assignment as AssignmentIcon,
  CloudUpload as UploadIcon,
  Attachment as AttachmentIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { ClinicalStudyFormData, StudyType, StudyStatus } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { 
  STUDY_TYPES, 
  STUDY_STATUS_OPTIONS, 
  URGENCY_LEVELS, 
  COMMON_STUDY_NAMES 
} from '../../constants';

interface ClinicalStudyDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: ClinicalStudyFormData;
  setFormData: (data: ClinicalStudyFormData | ((prev: ClinicalStudyFormData) => ClinicalStudyFormData)) => void;
  onSubmit: () => void;
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  fieldErrors?: { [key: string]: string };
  onFileUpload?: (studyId: string, file: File) => Promise<void>;
  onFileDelete?: (studyId: string) => Promise<void>;
  existingFile?: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
}

const ClinicalStudyDialog: React.FC<ClinicalStudyDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting,
  fieldErrors = {},
  onFileUpload,
  onFileDelete,
  existingFile
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Simplified for clinical study ORDER creation (not results review)
  const steps = [
    {
      label: 'Orden de Estudio',
      icon: <AssignmentIcon />,
      description: 'Información para generar la orden médica'
    }
  ];

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setFormErrorMessage('');
    }
  }, [open, setFormErrorMessage]);

  const handleNext = () => {
    console.log('🚀 Intentando avanzar desde step:', activeStep);
    console.log('🔍 Validación actual:', isStepValid(activeStep));
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleStudyTypeChange = (newType: StudyType) => {
    setFormData(prev => ({
      ...prev,
      study_type: newType,
      study_name: '' // Reset study name when type changes
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onFileUpload || !isEditing) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      await onFileUpload(formData.consultation_id, file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);
      setIsUploading(false);
      setFormErrorMessage('Error al cargar el archivo');
    }

    // Reset input
    event.target.value = '';
  };

  // Simplified validation for clinical study ORDER (single step)
  const isStepValid = (step: number): boolean => {
    if (step === 0) {
      const isValid = !!(
        formData.study_type &&
        formData.study_name &&
        formData.ordered_date &&
        formData.ordering_doctor
      );
      console.log('🔍 Order validation:', {
        isValid,
        study_type: formData.study_type,
        study_name: formData.study_name,
        ordered_date: formData.ordered_date,
        ordering_doctor: formData.ordering_doctor
      });
      return isValid;
    }
    return false;
  };

  const getStepIcon = (stepIndex: number) => {
    return steps[stepIndex].icon;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Study Type */}
            <FormControl fullWidth required error={!!fieldErrors.study_type}>
              <InputLabel>Tipo de Estudio</InputLabel>
              <Select
                value={formData.study_type || ''}
                onChange={(e) => handleStudyTypeChange(e.target.value as StudyType)}
                label="Tipo de Estudio"
              >
                {STUDY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.study_type && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {fieldErrors.study_type}
                </Typography>
              )}
            </FormControl>

            {/* Study Name */}
            <Autocomplete
              options={formData.study_type ? (COMMON_STUDY_NAMES[formData.study_type as keyof typeof COMMON_STUDY_NAMES] || []) : []}
              value={formData.study_name || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, study_name: newValue || '' }))}
              onInputChange={(_, newInputValue) => {
                console.log('📝 Escribiendo en study_name:', newInputValue);
                setFormData(prev => ({ ...prev, study_name: newInputValue || '' }));
              }}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nombre del Estudio"
                  required
                  error={!!fieldErrors.study_name}
                  helperText={fieldErrors.study_name || "Selecciona de la lista o escribe un nombre personalizado"}
                />
              )}
            />

            {/* Study Description */}
            <TextField
              label="Descripción del Estudio"
              multiline
              rows={3}
              value={formData.study_description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, study_description: e.target.value }))}
              fullWidth
              placeholder="Descripción detallada del estudio..."
              helperText="Información adicional sobre el estudio (opcional)"
            />

            {/* Order Date */}
            <TextField
              label="Fecha de Solicitud"
              type="date"
              value={formData.ordered_date ? formData.ordered_date.split('T')[0] : ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ordered_date: e.target.value ? `${e.target.value}T09:00:00` : ''
              }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
              error={!!fieldErrors.ordered_date}
              helperText={fieldErrors.ordered_date || 'Fecha en que se solicita el estudio'}
            />



            {/* Ordering Doctor */}
            <TextField
              label="Médico Solicitante"
              value={formData.ordering_doctor || ''}
              fullWidth
              required
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: 'grey.50',
                  color: 'text.primary'
                }
              }}
              error={!!fieldErrors.ordering_doctor}
              helperText={fieldErrors.ordering_doctor || "Médico que solicita el estudio (auto-asignado)"}
            />

            {/* Urgency */}
            <FormControl fullWidth>
              <InputLabel>Urgencia</InputLabel>
              <Select
                value={formData.urgency || 'normal'}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                label="Urgencia"
              >
                {URGENCY_LEVELS.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                Prioridad para la realización del estudio
              </Typography>
            </FormControl>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box>
          <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScienceIcon color="primary" />
{isEditing ? 'Editar Orden de Estudio' : 'Nueva Orden de Estudio'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {steps[activeStep].description}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <ErrorRibbon message={formErrorMessage} />

      <DialogContent sx={{ px: 3 }}>
        <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel icon={getStepIcon(index)}>
                <Typography variant="body2" sx={{ fontWeight: activeStep === index ? 600 : 400 }}>
                  {step.label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 2 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Debug Info - remover en producción */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.8rem' }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>🔍 Debug Info:</Typography>
          <br />
          Step actual: {activeStep} | Válido: {isStepValid(activeStep) ? '✅' : '❌'}
          <br />
          {activeStep === 0 && (
            <>
              • study_type: "{formData.study_type}" {formData.study_type ? '✅' : '❌'}
              <br />
              • study_name: "{formData.study_name}" {formData.study_name ? '✅' : '❌'}
              <br />
              • ordered_date: "{formData.ordered_date}" {formData.ordered_date ? '✅' : '❌'}
              <br />
              • ordering_doctor: "{formData.ordering_doctor}" {formData.ordering_doctor ? '✅' : '❌'}
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button
          onClick={onClose}
          variant="outlined"
        >
          Cancelar
        </Button>

        <Button
          onClick={() => {
            console.log('🚀 ClinicalStudyDialog - Enviando datos:', {
              formData,
              isValid: isStepValid(0)
            });
            onSubmit();
          }}
          variant="contained"
          disabled={isSubmitting || !isStepValid(0)}
          startIcon={<SaveIcon />}
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Orden' : 'Crear Orden')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ClinicalStudyDialog);

