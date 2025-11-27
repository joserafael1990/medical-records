import React, { memo, useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  LinearProgress,
  TextField,
  Button,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CloudUpload as UploadIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { ClinicalStudy, StudyStatus, CreateClinicalStudyData, StudyCatalog } from '../../../types';
import { STUDY_STATUS_OPTIONS, STUDY_TYPES } from '../../../constants';
import { useStudyCatalog } from '../../../hooks/useStudyCatalog';
import { logger } from '../../../utils/logger';
import { apiService } from '../../../services';
import { useToast } from '../../common/ToastNotification';

interface PreviousStudiesSectionProps {
  patientId: string;
  studies: ClinicalStudy[];
  isLoading?: boolean;
  isFirstTimeConsultation?: boolean; // Indicates if this is a first-time consultation
  onAddStudy: (studyData: CreateClinicalStudyData) => Promise<void>;
  onRemoveStudy: (studyId: string) => void;
  onRefreshStudies?: () => Promise<void>; // Callback to refresh studies after file upload
  doctorName?: string;
  consultationId?: string | null; // Optional, for new studies that might be associated with current consultation
}

const PreviousStudiesSection: React.FC<PreviousStudiesSectionProps> = ({
  patientId,
  studies,
  isLoading = false,
  isFirstTimeConsultation = false,
  onAddStudy,
  onRemoveStudy,
  onRefreshStudies,
  doctorName = '',
  consultationId = null
}) => {
  const { showSuccess, showError } = useToast();
  const [filteredStudies, setFilteredStudies] = useState<ClinicalStudy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { studies: catalogStudies, fetchStudies, searchStudies, isLoading: isCatalogLoading } = useStudyCatalog();
  const [studySearchTerm, setStudySearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState<StudyCatalog | null>(null);
  const [customStudyOptions, setCustomStudyOptions] = useState<StudyCatalog[]>([]);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  
  // Search studies when user types in the study name field
  useEffect(() => {
    if (studySearchTerm && studySearchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          await searchStudies(studySearchTerm.trim(), {});
        } catch (error) {
          logger.error('Error searching studies', error, 'api');
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (studySearchTerm.trim().length === 0 && catalogStudies.length === 0) {
      fetchStudies();
    }
  }, [studySearchTerm, searchStudies, fetchStudies, catalogStudies.length]);
  
  const combinedStudyOptions = useMemo(() => {
    const existingIds = new Set((catalogStudies || []).map((study) => study.id));
    const customFiltered = customStudyOptions.filter((option) => !existingIds.has(option.id));
    return [...(catalogStudies || []), ...customFiltered];
  }, [catalogStudies, customStudyOptions]);

  const studyNameExists = useMemo(() => {
    const trimmed = studySearchTerm.trim().toLowerCase();
    if (!trimmed) {
      return false;
    }
    return combinedStudyOptions.some(
      (study) => study.name?.toLowerCase().trim() === trimmed
    );
  }, [combinedStudyOptions, studySearchTerm]);

  const [formData, setFormData] = useState<CreateClinicalStudyData>({
    consultation_id: consultationId || null, // Can be null for studies without consultation
    patient_id: patientId,
    study_type: 'hematologia',
    study_name: '',
    study_description: '',
    ordered_date: new Date().toISOString().split('T')[0],
    status: 'ordered', // Initial status, will change to 'completed' when file is uploaded
    urgency: 'routine',
    ordering_doctor: doctorName,
    clinical_indication: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  // Handle view file with authentication
  const handleViewFile = async (studyId: string) => {
    try {
      // Get the file with authentication using the API service
      const response = await apiService.clinicalStudies.api.get(
        `/api/clinical-studies/${studyId}/file`,
        {
          responseType: 'blob'
        }
      );

      // Create a blob URL and open it in a new window
      const blob = new Blob([response.data], { 
        type: response.data.type || 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      logger.error('Error viewing study file', error, 'ui');
      let errorMessage = 'Error al visualizar el archivo del estudio';
      try {
        if (error?.response?.data) {
          // If it's a blob error, try to read it as text
          if (error.response.data instanceof Blob) {
            const text = await error.response.data.text();
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.detail || errorMessage;
            } catch {
              errorMessage = 'Error al obtener el archivo';
            }
          } else if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
      } catch (e) {
        // Fallback if error parsing fails
        errorMessage = 'Error al visualizar el archivo del estudio';
      }
      showError(errorMessage);
    }
  };

  // Filter studies - show ALL studies for the patient (with or without consultation_id)
  useEffect(() => {
    // Filter by patient ID only (show all studies for this patient)
    let patientStudies = (studies || []).filter(study => {
      const studyPatientId = String(study.patient_id || '');
      const normalizedPatientId = String(patientId || '');
      return studyPatientId === normalizedPatientId || 
             Number(studyPatientId) === Number(normalizedPatientId);
    });
    
    // Then apply search filter if searchTerm exists
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchLower = searchTerm.toLowerCase().trim();
      patientStudies = patientStudies.filter(study => {
        const studyName = (study.study_name || '').toLowerCase();
        const studyDescription = (study.study_description || '').toLowerCase();
        const studyType = (study.study_type || '').toLowerCase();
        return studyName.includes(searchLower) || 
               studyDescription.includes(searchLower) || 
               studyType.includes(searchLower);
      });
    }
    
    setFilteredStudies(patientStudies);
  }, [studies, patientId, searchTerm]);

  const getStatusColor = (status: StudyStatus): string => {
    const statusOption = STUDY_STATUS_OPTIONS.find(option => option.value === status);
    return statusOption?.color || '#gray';
  };

  const getStudyTypeLabel = (type: string): string => {
    const studyType = STUDY_TYPES.find(st => st.value === type);
    return studyType?.label || type;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HistoryIcon color="primary" />
          Estudios Previos del Paciente
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Cargando estudios previos...
        </Typography>
      </Box>
    );
  }

  const handleCreateCustomStudyOption = () => {
    const trimmedName = studySearchTerm.trim();
    if (!trimmedName || studyNameExists) {
      return;
    }

    const newStudyOption: StudyCatalog = {
      id: -(customStudyOptions.length + 1),
      name: trimmedName,
      category_id: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCustomStudyOptions((prev) => [...prev, newStudyOption]);
    setSelectedStudy(newStudyOption);
    setFormData((prev) => ({
      ...prev,
      study_name: trimmedName
    }));
  };

  const handleCreateStudy = async () => {
    if (!formData.study_name.trim() || !formData.ordered_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Assign 'previous' status if this is a first-time consultation, otherwise 'ordered'
      const initialStatus = isFirstTimeConsultation ? 'previous' : 'ordered';
      
      const studyData: CreateClinicalStudyData = {
        ...formData,
        consultation_id: consultationId || undefined, // Use undefined instead of null
        patient_id: patientId,
        ordering_doctor: doctorName || formData.ordering_doctor,
        ordered_date: formData.ordered_date || new Date().toISOString().split('T')[0],
        urgency: formData.urgency || 'routine',
        status: initialStatus
      };
      await onAddStudy(studyData);
      // Clear form
      setSelectedStudy(null);
      setStudySearchTerm('');
      setFormData({
        consultation_id: consultationId || undefined,
        patient_id: patientId,
        study_type: 'hematologia',
        study_name: '',
        study_description: '',
        ordered_date: new Date().toISOString().split('T')[0],
        status: isFirstTimeConsultation ? 'previous' : 'ordered',
        urgency: 'routine',
        ordering_doctor: doctorName,
        clinical_indication: ''
      });
    } catch (error: any) {
      logger.error('Error creating previous study', error, 'api');
      // Show user-friendly error message
      let errorMessage = 'Error al crear el estudio. Por favor, inténtalo de nuevo.';
      try {
        if (error?.response?.data?.detail) {
          errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail);
        } else if (error?.message) {
          errorMessage = error.message;
        }
      } catch (e) {
        // Fallback if error parsing fails
        errorMessage = 'Error al crear el estudio. Por favor, inténtalo de nuevo.';
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (studyId: string, file: File) => {
    setUploadingFileId(studyId);
    try {
      await apiService.clinicalStudies.uploadClinicalStudyFile(studyId, file);
      logger.debug('File uploaded successfully', { studyId }, 'api');
      
      // Refresh studies if callback is provided
      if (onRefreshStudies) {
        await onRefreshStudies();
      }
      
      showSuccess('Archivo cargado exitosamente. El estudio se marcó como completado.');
    } catch (error: any) {
      logger.error('Error uploading file', error, 'api');
      let errorMessage = 'Error al cargar el archivo';
      try {
        if (error?.response?.data?.detail) {
          errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail);
        } else if (error?.message) {
          errorMessage = error.message;
        }
      } catch (e) {
        // Fallback if error parsing fails
        errorMessage = 'Error al cargar el archivo';
      }
      showError(errorMessage);
    } finally {
      setUploadingFileId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <HistoryIcon color="primary" />
        Estudios Previos del Paciente
        {filteredStudies.length > 0 && (
          <Chip 
            size="small" 
            label={filteredStudies.length} 
            color="primary" 
            variant="outlined" 
          />
        )}
      </Typography>

      {/* Add Study - Inline Form */}
      <Card sx={{ mb: 3, border: '1px dashed', borderColor: 'grey.300', backgroundColor: '#fafafa' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* First row: Autocomplete, Guardar, Crear estudio */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Autocomplete
                  freeSolo
                  options={combinedStudyOptions || []}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                  value={selectedStudy}
                  onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                      setSelectedStudy(null);
                      setStudySearchTerm(newValue);
                      setFormData((prev) => ({ ...prev, study_name: newValue }));
                      return;
                    }
                    setSelectedStudy(newValue);
                    if (newValue) {
                      setFormData(prev => ({ 
                        ...prev, 
                        study_name: newValue.name,
                        study_description: newValue.description || prev.study_description
                      }));
                      setStudySearchTerm(newValue.name);
                    } else {
                      setFormData(prev => ({ ...prev, study_name: '' }));
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setStudySearchTerm(newInputValue);
                    if (!selectedStudy) {
                      setFormData(prev => ({ ...prev, study_name: newInputValue }));
                    }
                  }}
                  loading={isCatalogLoading}
                  filterOptions={(x) => x}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar estudio clínico..."
                      size="small"
                      fullWidth
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        endAdornment: (
                          <>
                            {isCatalogLoading ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    const studyOption: StudyCatalog =
                      typeof option === 'string'
                        ? {
                            id: -Math.abs(Date.now()),
                            name: option,
                            category_id: 0,
                            is_active: true,
                            created_at: '',
                            updated_at: ''
                          }
                        : option;

                    const uniqueKey =
                      studyOption.id ??
                      `${studyOption.name}-${studyOption.category_id ?? 'cat'}`;

                    return (
                      <Box component="li" key={uniqueKey} {...otherProps}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {studyOption.name}
                          </Typography>
                          {studyOption.description && (
                            <Typography variant="caption" color="text.secondary">
                              {studyOption.description.length > 80 ? `${studyOption.description.substring(0, 80)}...` : studyOption.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  }}
                />
              </Box>
              <Button
                variant="outlined"
                onClick={handleCreateCustomStudyOption}
                disabled={
                  !studySearchTerm.trim() ||
                  studyNameExists
                }
                sx={{ flexShrink: 0, minWidth: { xs: '100%', sm: 140 }, height: 40 }}
              >
                Guardar
              </Button>
              <Button
                variant="contained"
                startIcon={<HistoryIcon />}
                onClick={handleCreateStudy}
                disabled={isSubmitting || !formData.study_name.trim()}
                sx={{ flexShrink: 0, minWidth: { xs: '100%', sm: 180 }, height: 40 }}
              >
                {isSubmitting ? 'Creando...' : 'Crear Estudio'}
              </Button>
            </Box>

            {/* Second row: Indicación clínica (opcional) */}
            <TextField
              placeholder="Indicación clínica (opcional)"
              value={formData.clinical_indication || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, clinical_indication: e.target.value }))}
              size="small"
              fullWidth
            />
          </Box>
        </CardContent>
      </Card>

      {/* Search field for filtering studies */}
      {(studies && studies.length > 0) && (
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Buscar estudios previos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />
        </Box>
      )}

      {filteredStudies.length === 0 ? (
        <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2">
              {searchTerm && searchTerm.trim().length > 0 
                ? 'No se encontraron estudios que coincidan con la búsqueda'
                : 'No hay estudios previos registrados'
              }
            </Typography>
            <Typography variant="body2">
              {searchTerm && searchTerm.trim().length > 0
                ? 'Intenta con otros términos de búsqueda o limpia el filtro.'
                : 'Crea estudios clínicos que el paciente trajo o que fueron ordenados previamente.'
              }
            </Typography>
          </Box>
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {filteredStudies.map((study) => (
            <Box key={study.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 2
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {study.study_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {getStudyTypeLabel(study.study_type)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={STUDY_STATUS_OPTIONS.find(s => s.value === study.status)?.label || study.status}
                      sx={{
                        backgroundColor: getStatusColor(study.status),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>

                  {/* Description */}
                  {study.study_description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {study.study_description.length > 100 
                        ? `${study.study_description.substring(0, 100)}...`
                        : study.study_description
                      }
                    </Typography>
                  )}

                  {/* Clinical Info */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Solicitado: {formatDate(study.ordered_date)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                         {study.ordering_doctor}
                      </Typography>
                    </Box>

                    {study.institution && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {study.institution}
                        </Typography>
                      </Box>
                    )}

                    {study.urgency && study.urgency !== 'routine' && (
                      <Chip
                        size="small"
                        label={study.urgency === 'urgent' ? 'Urgente' : study.urgency === 'stat' ? 'STAT' : study.urgency}
                        color={study.urgency === 'stat' ? 'error' : 'warning'}
                        variant="outlined"
                        sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                      />
                    )}
                  </Box>

                  {/* Clinical Indication */}
                  {study.clinical_indication && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Indicación Clínica:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {study.clinical_indication.length > 150 
                          ? `${study.clinical_indication.substring(0, 150)}...`
                          : study.clinical_indication
                        }
                      </Typography>
                    </Box>
                  )}

                  {/* Results */}
                  {study.results_text && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Resultados:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {study.results_text.length > 150 
                          ? `${study.results_text.substring(0, 150)}...`
                          : study.results_text
                        }
                      </Typography>
                    </Box>
                  )}

                  {/* File info or upload button */}
                  {study.file_name ? (
                    <Box sx={{ 
                      p: 1, 
                      backgroundColor: 'grey.50', 
                      borderRadius: 1, 
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                          <AssignmentIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                              {study.file_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {study.file_type} • {study.file_size ? formatFileSize(study.file_size) : 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                        {study.file_path && (
                          <Tooltip title="Ver archivo">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewFile(study.id)}
                            >
                              <ViewIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <input
                        type="file"
                        ref={(input) => setFileInputRef(input as HTMLInputElement)}
                        style={{ display: 'none' }}
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && study.id) {
                            handleFileUpload(study.id, file);
                          }
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={uploadingFileId === study.id ? <CircularProgress size={16} /> : <UploadIcon />}
                        onClick={() => fileInputRef?.click()}
                        disabled={uploadingFileId === study.id}
                        fullWidth
                      >
                        {uploadingFileId === study.id ? 'Cargando...' : 'Cargar Archivo'}
                      </Button>
                    </Box>
                  )}
                </CardContent>

                <Divider />
                
                <CardActions sx={{ px: 2, py: 1, justifyContent: 'space-between' }}>
                  <Box>
                    {study.performed_date && (
                      <Typography variant="caption" color="text.secondary">
                        Realizado: {formatDate(study.performed_date)}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Eliminar estudio">
                      <IconButton size="small" color="error" onClick={() => onRemoveStudy(study.id)}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default memo(PreviousStudiesSection);

