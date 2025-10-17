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
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  AttachFile as AttachFileIcon,
  Science as ScienceIcon,
  Search as SearchIcon,
  List as ListIcon,
  MedicalServices as MedicalServicesIcon
} from '@mui/icons-material';
import { CreateClinicalStudyData, StudyType, StudyStatus, UrgencyLevel, StudyCatalog } from '../../types';
import { STUDY_TYPES, STUDY_STATUS_OPTIONS, URGENCY_LEVELS } from '../../constants';
import { StudyCatalogSelector } from '../common/StudyCatalogSelector';

interface ClinicalStudyDialogWithCatalogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClinicalStudyData) => Promise<void>;
  formData: CreateClinicalStudyData;
  onFormDataChange: (data: Partial<CreateClinicalStudyData>) => void;
  isEditing: boolean;
  isSubmitting: boolean;
  error?: string | null;
  specialty?: string;
  diagnosis?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`study-tabpanel-${index}`}
      aria-labelledby={`study-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, minHeight: '400px' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ClinicalStudyDialogWithCatalog: React.FC<ClinicalStudyDialogWithCatalogProps> = ({
  open,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  isEditing,
  isSubmitting,
  error,
  specialty,
  diagnosis
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedCatalogStudies, setSelectedCatalogStudies] = useState<StudyCatalog[]>([]);
  const [useCatalog, setUseCatalog] = useState(true);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTabValue(0);
      setSelectedCatalogStudies([]);
      setUseCatalog(true);
    }
  }, [open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCatalogStudiesSelect = (studies: StudyCatalog[]) => {
    setSelectedCatalogStudies(studies);
    
    // If only one study is selected, auto-fill the form
    if (studies.length === 1) {
      const study = studies[0];
      onFormDataChange({
        study_name: study.name,
        study_type: study.category?.code.toLowerCase() as StudyType || 'laboratorio',
        study_description: study.description || '',
        clinical_indication: study.preparation || ''
      });
    }
  };

  const handleSubmit = async () => {
    if (useCatalog && selectedCatalogStudies.length > 0) {
      // Submit multiple studies from catalog
      for (const catalogStudy of selectedCatalogStudies) {
        const studyData: CreateClinicalStudyData = {
          ...formData,
          study_name: catalogStudy.name,
          study_type: catalogStudy.category?.code.toLowerCase() as StudyType || 'laboratorio',
          study_description: catalogStudy.description || '',
          clinical_indication: catalogStudy.preparation || ''
        };
        await onSubmit(studyData);
      }
    } else {
      // Submit single custom study
      await onSubmit(formData);
    }
  };

  const getDurationText = (hours?: number) => {
    if (!hours) return 'No especificado';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <Typography variant="body2" sx={{ color: 'white' }}>
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="study tabs">
            <Tab 
              icon={<SearchIcon />} 
              label="Catálogo de Estudios" 
              iconPosition="start"
            />
            <Tab 
              icon={<ListIcon />} 
              label="Estudio Personalizado" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <StudyCatalogSelector
            onSelectStudies={handleCatalogStudiesSelect}
            selectedStudies={selectedCatalogStudies}
            specialty={specialty}
            diagnosis={diagnosis}
            showRecommendations={true}
            showTemplates={true}
            maxSelections={5}
          />

          {selectedCatalogStudies.length > 0 && (
            <Card sx={{ mt: 2, bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon color="success" />
                  Estudios Seleccionados para Ordenar
                </Typography>
                <Grid container spacing={2}>
                  {selectedCatalogStudies.map(study => (
                    <Grid item xs={12} md={6} key={study.id}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {study.name}
                            </Typography>
                            <Chip label={study.code} size="small" color="primary" />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {study.description}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            {study.subcategory && (
                              <Chip label={study.subcategory} size="small" color="secondary" variant="outlined" />
                            )}
                            {study.specialty && (
                              <Chip label={study.specialty} size="small" color="info" variant="outlined" />
                            )}
                            <Chip 
                              label={getDurationText(study.duration_hours)} 
                              size="small" 
                              color="default" 
                              variant="outlined"
                            />
                          </Box>

                          {study.preparation && (
                            <Typography variant="caption" color="text.secondary">
                              <strong>Preparación:</strong> {study.preparation}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ maxWidth: '100%' }}>
            {/* Información del Estudio */}
            <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScienceIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  Información del Estudio
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nombre del Estudio"
                      value={formData.study_name}
                      onChange={(e) => onFormDataChange({ study_name: e.target.value })}
                      required
                      placeholder="Ingresa el nombre del estudio"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Tipo de Estudio</InputLabel>
                      <Select
                        value={formData.study_type}
                        onChange={(e) => onFormDataChange({ study_type: e.target.value as StudyType })}
                        label="Tipo de Estudio"
                      >
                        {STUDY_TYPES.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descripción del Estudio"
                      value={formData.study_description || ''}
                      onChange={(e) => onFormDataChange({ study_description: e.target.value })}
                      multiline
                      rows={3}
                      placeholder="Describe el estudio clínico..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Información Clínica */}
            <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MedicalServicesIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
                  Información Clínica
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Indicación Clínica"
                      value={formData.clinical_indication || ''}
                      onChange={(e) => onFormDataChange({ clinical_indication: e.target.value })}
                      multiline
                      rows={3}
                      required
                      placeholder="Describe la indicación clínica para este estudio..."
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Antecedentes Relevantes"
                      value={formData.relevant_history || ''}
                      onChange={(e) => onFormDataChange({ relevant_history: e.target.value })}
                      multiline
                      rows={2}
                      placeholder="Antecedentes médicos relevantes..."
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Nivel de Urgencia</InputLabel>
                      <Select
                        value={formData.urgency || 'normal'}
                        onChange={(e) => onFormDataChange({ urgency: e.target.value as UrgencyLevel })}
                        label="Nivel de Urgencia"
                      >
                        {URGENCY_LEVELS.map((level) => (
                          <MenuItem key={level.value} value={level.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box 
                                sx={{ 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: '50%', 
                                  bgcolor: level.color 
                                }} 
                              />
                              {level.label}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Archivo Adjunto */}
            <Card sx={{ border: '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFileIcon sx={{ fontSize: 20, color: 'info.main' }} />
                  Archivo Adjunto (Opcional)
                </Typography>
                
                <Box sx={{ 
                  border: '2px dashed #ccc', 
                  borderRadius: 2, 
                  p: 4, 
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50'
                  }
                }}>
                  <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {formData.file ? 'Archivo Seleccionado' : 'No hay archivo seleccionado'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {formData.file ? formData.file.name : 'Arrastra y suelta un archivo aquí o haz clic para seleccionar'}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    component="label"
                    size="large"
                    sx={{ 
                      minWidth: '200px',
                      '&:hover': {
                        bgcolor: 'primary.50'
                      }
                    }}
                  >
                    {formData.file ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onFormDataChange({ file });
                        }
                      }}
                    />
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || (tabValue === 0 && selectedCatalogStudies.length === 0)}
          startIcon={<ScienceIcon />}
        >
          {isSubmitting 
            ? 'Guardando...' 
            : tabValue === 0 
              ? `Ordenar ${selectedCatalogStudies.length} Estudios`
              : 'Guardar Estudio'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClinicalStudyDialogWithCatalog;
