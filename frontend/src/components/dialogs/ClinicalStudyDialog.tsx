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

  const steps = [
    {
      label: 'Información Básica',
      icon: <AssignmentIcon />,
      description: 'Datos generales del estudio clínico'
    },
    {
      label: 'Detalles Clínicos',
      icon: <ScienceIcon />,
      description: 'Información clínica y resultados'
    },
    {
      label: 'Archivos',
      icon: <AttachmentIcon />,
      description: 'Cargar documentos y resultados'
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

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(
          formData.study_type &&
          formData.study_name &&
          formData.ordered_date &&
          formData.ordering_doctor
        );
      case 1:
        return !!(
          formData.clinical_indication
        );
      case 2:
        return true; // File upload is optional
      default:
        return false;
    }
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

            {/* Dates */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
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

              <TextField
                label="Fecha de Realización"
                type="date"
                value={formData.performed_date ? formData.performed_date.split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  performed_date: e.target.value ? `${e.target.value}T09:00:00` : ''
                }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                helperText="Fecha en que se realizó el estudio (opcional)"
              />

              <TextField
                label="Fecha de Resultados"
                type="date"
                value={formData.results_date ? formData.results_date.split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  results_date: e.target.value ? `${e.target.value}T09:00:00` : ''
                }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                helperText="Fecha en que se obtuvieron los resultados (opcional)"
              />
            </Box>

            {/* Status */}
            <FormControl fullWidth>
              <InputLabel>Estado del Estudio</InputLabel>
              <Select
                value={formData.status || 'pending'}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as StudyStatus }))}
                label="Estado del Estudio"
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

            {/* Doctors */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Médico Solicitante"
                value={formData.ordering_doctor || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ordering_doctor: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.ordering_doctor}
                helperText={fieldErrors.ordering_doctor || "Médico que solicita el estudio"}
              />

              <TextField
                label="Médico Realizador"
                value={formData.performing_doctor || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, performing_doctor: e.target.value }))}
                fullWidth
                helperText="Médico que realiza el estudio (opcional)"
              />
            </Box>

            {/* Institution and Urgency */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Institución"
                value={formData.institution || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                fullWidth
                helperText="Lugar donde se realizará el estudio"
              />

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
              </FormControl>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Clinical Indication */}
            <TextField
              label="Indicación Clínica"
              multiline
              rows={4}
              value={formData.clinical_indication || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, clinical_indication: e.target.value }))}
              fullWidth
              required
              placeholder="¿Por qué se solicita este estudio? Síntomas, sospecha diagnóstica..."
              error={!!fieldErrors.clinical_indication}
              helperText={fieldErrors.clinical_indication || "Razón médica para solicitar el estudio"}
            />

            {/* Relevant History */}
            <TextField
              label="Historia Clínica Relevante"
              multiline
              rows={3}
              value={formData.relevant_history || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, relevant_history: e.target.value }))}
              fullWidth
              placeholder="Antecedentes médicos relevantes para el estudio..."
              helperText="Historia médica del paciente relacionada con el estudio"
            />

            <Divider>
              <Typography variant="subtitle2" color="text.secondary">
                Resultados (opcional)
              </Typography>
            </Divider>

            {/* Results */}
            <TextField
              label="Resultados del Estudio"
              multiline
              rows={4}
              value={formData.results_text || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, results_text: e.target.value }))}
              fullWidth
              placeholder="Resultados del estudio en texto..."
              helperText="Resultados obtenidos del estudio"
            />

            {/* Interpretation */}
            <TextField
              label="Interpretación Médica"
              multiline
              rows={3}
              value={formData.interpretation || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, interpretation: e.target.value }))}
              fullWidth
              placeholder="Interpretación médica de los resultados..."
              helperText="Análisis e interpretación profesional de los resultados"
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachmentIcon color="primary" />
              Archivos del Estudio
            </Typography>

            {/* File Upload */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <input
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.dcm"
                    style={{ display: 'none' }}
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    disabled={!isEditing || isUploading}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      disabled={!isEditing || isUploading}
                      sx={{ mb: 2 }}
                    >
                      {isUploading ? 'Cargando...' : 'Seleccionar Archivo'}
                    </Button>
                  </label>

                  {isUploading && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {uploadProgress}% completado
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="body2" color="text.secondary">
                    Formatos permitidos: PDF, JPG, PNG, TIFF, DICOM
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tamaño máximo: 10 MB
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Existing File */}
            {existingFile && (
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AttachmentIcon color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">
                        {existingFile.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {existingFile.type} • {formatFileSize(existingFile.size)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => window.open(existingFile.url, '_blank')}
                  >
                    Ver
                  </Button>
                  {isEditing && onFileDelete && (
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      color="error"
                      onClick={() => onFileDelete(formData.consultation_id)}
                    >
                      Eliminar
                    </Button>
                  )}
                </CardActions>
              </Card>
            )}
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
            {isEditing ? 'Editar Estudio Clínico' : 'Nuevo Estudio Clínico'}
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
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<BackIcon />}
          >
            Anterior
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep === steps.length - 1 ? (
            <Button
              onClick={onSubmit}
              variant="contained"
              disabled={isSubmitting || !isStepValid(0) || !isStepValid(1)}
              startIcon={<SaveIcon />}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Estudio' : 'Crear Estudio')}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={!isStepValid(activeStep)}
              endIcon={<NextIcon />}
            >
              Siguiente
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default memo(ClinicalStudyDialog);

