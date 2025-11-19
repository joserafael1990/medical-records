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
  Science as ScienceIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { ClinicalStudy, StudyStatus, CreateClinicalStudyData, StudyCatalog } from '../../types';
import { STUDY_STATUS_OPTIONS, STUDY_TYPES } from '../../constants';
import { TEMP_IDS } from '../../utils/vitalSignUtils';
import { useStudyCatalog } from '../../hooks/useStudyCatalog';
import { logger } from '../../utils/logger';

interface ClinicalStudiesSectionProps {
  consultationId: string;
  patientId: string;
  studies: ClinicalStudy[];
  isLoading?: boolean;
  onAddStudy: (studyData: CreateClinicalStudyData) => Promise<void>;
  onEditStudy?: (study: ClinicalStudy) => void;
  onRemoveStudy: (studyId: string) => void;
  onViewFile?: (fileUrl: string) => void;
  onDownloadFile?: (fileUrl: string, fileName: string) => void;
  doctorName?: string;
}

const ClinicalStudiesSection: React.FC<ClinicalStudiesSectionProps> = ({
  consultationId,
  patientId,
  studies,
  isLoading = false,
  onAddStudy,
  onEditStudy,
  onRemoveStudy,
  onViewFile,
  onDownloadFile,
  doctorName = ''
}) => {
  const [filteredStudies, setFilteredStudies] = useState<ClinicalStudy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { studies: catalogStudies, fetchStudies, searchStudies, isLoading: isCatalogLoading } = useStudyCatalog();
  const [studySearchTerm, setStudySearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState<StudyCatalog | null>(null);
  const [customStudyOptions, setCustomStudyOptions] = useState<StudyCatalog[]>([]);
  
  // Note: fetchStudies is automatically called by useStudyCatalog hook
  // No need to call it again here
  
  // Search studies when user types in the study name field
  useEffect(() => {
    if (studySearchTerm && studySearchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          await searchStudies(studySearchTerm.trim(), {
          });
        } catch (error) {
          logger.error('Error searching studies', error, 'api');
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (studySearchTerm.trim().length === 0 && catalogStudies.length === 0) {
      // If search term is cleared and we have no studies, reload studies
      // Note: The hook already loads studies on mount, but we can call fetchStudies to refresh
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
    consultation_id: consultationId,
    patient_id: patientId,
    study_type: 'hematologia', // Keep for backward compatibility but not used in UI
    study_name: '',
    study_description: '',
    ordered_date: new Date().toISOString().split('T')[0],
    status: 'ordered',
    urgency: 'routine',
    ordering_doctor: doctorName,
    clinical_indication: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle view file with authentication
  const handleViewFile = async (studyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        logger.error('No authentication token found', undefined, 'auth');
        alert('No estás autenticado. Por favor, inicia sesión nuevamente.');
        return;
      }

      // Fetch the file with authentication
      const response = await fetch(`http://localhost:8000/api/clinical-studies/${studyId}/file`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener el archivo');
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create object URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      logger.error('Error viewing study file', error, 'ui');
      alert('Error al visualizar el archivo del estudio');
    }
  };

  useEffect(() => {
    // First filter by consultation and patient IDs
    let consultationStudies = (studies || []).filter(study => {
      // Normalize IDs to strings for comparison
      const studyConsultationId = String(study.consultation_id || '');
      const studyPatientId = String(study.patient_id || '');
      const normalizedConsultationId = String(consultationId || '');
      const normalizedPatientId = String(patientId || '');
      
      // For temp consultations, only check consultation_id match (ignore patient_id for temp)
      if (normalizedConsultationId === 'temp_consultation' || normalizedConsultationId === TEMP_IDS.CONSULTATION || studyConsultationId === 'temp_consultation') {
        const matches = studyConsultationId === normalizedConsultationId || studyConsultationId === TEMP_IDS.CONSULTATION;
        return matches;
      }
      
      // For real consultations, be more flexible:
      // 1. If patientId is TEMP_IDS.PATIENT or '0' or empty, only check consultation_id
      if (normalizedPatientId === TEMP_IDS.PATIENT || normalizedPatientId === '0' || normalizedPatientId === '') {
        // Only filter by consultation_id
        return studyConsultationId === normalizedConsultationId;
      }
      
      // 2. For real consultations, check both IDs but be lenient with type conversions
      // Try multiple ways to compare IDs
      const consultationMatches = studyConsultationId === normalizedConsultationId || 
                                  Number(studyConsultationId) === Number(normalizedConsultationId);
      
      const patientMatches = studyPatientId === normalizedPatientId || 
                            Number(studyPatientId) === Number(normalizedPatientId) ||
                            String(studyPatientId) === String(normalizedPatientId);
      
      // If consultation matches, include it (patient_id is secondary)
      // This is more lenient - if consultation matches, show the study
      if (consultationMatches) {
        // If patient also matches, great. If not, still include it if patient_id is not critical
        return patientMatches || normalizedPatientId === TEMP_IDS.PATIENT || normalizedPatientId === '0';
      }
      
      return false;
    });
    
    // Then apply search filter if searchTerm exists
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchLower = searchTerm.toLowerCase().trim();
      consultationStudies = consultationStudies.filter(study => {
        const studyName = (study.study_name || '').toLowerCase();
        const studyDescription = (study.study_description || '').toLowerCase();
        const studyType = (study.study_type || '').toLowerCase();
        return studyName.includes(searchLower) || 
               studyDescription.includes(searchLower) || 
               studyType.includes(searchLower);
      });
    }
    
    setFilteredStudies(consultationStudies);
  }, [studies, consultationId, patientId, searchTerm]);

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
          <ScienceIcon color="primary" />
          Solicitar nuevos Estudios clínicos
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Cargando estudios clínicos...
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

  const handleAddToOrder = async () => {
    if (!formData.study_name.trim() || !formData.ordered_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddStudy({
        ...formData,
        consultation_id: consultationId,
        patient_id: patientId,
        ordering_doctor: doctorName || formData.ordering_doctor,
        ordered_date: formData.ordered_date || new Date().toISOString().split('T')[0],
        urgency: formData.urgency || 'routine'
      });
      // Clear form
      setSelectedStudy(null);
      setStudySearchTerm('');
      setFormData({
        consultation_id: consultationId,
        patient_id: patientId,
        study_type: 'hematologia',
        study_name: '',
        study_description: '',
        ordered_date: new Date().toISOString().split('T')[0],
        status: 'ordered',
        urgency: 'routine',
        ordering_doctor: doctorName,
        clinical_indication: ''
      });
    } catch (error) {
      logger.error('Error saving clinical study', error, 'api');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ScienceIcon color="primary" />
        Estudios Clínicos
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
            {/* First row: Autocomplete, Guardar, Agregar a la orden */}
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
                  filterOptions={(x) => x} // Disable default filtering, we do it server-side
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
                      (studyOption.code
                        ? `${studyOption.code}-${studyOption.category_id ?? 'cat'}`
                        : `${studyOption.name}-${studyOption.category_id ?? 'cat'}`);

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
                startIcon={<ScienceIcon />}
                onClick={handleAddToOrder}
                disabled={isSubmitting || !formData.study_name.trim()}
                sx={{ flexShrink: 0, minWidth: { xs: '100%', sm: 180 }, height: 40 }}
              >
                {isSubmitting ? 'Agregando...' : 'Agregar a la orden'}
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

      {/* Search field for filtering studies - Always show if there are any studies */}
      {(studies && studies.length > 0) && (
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Buscar estudios clínicos..."
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
                : 'No hay estudios clínicos registrados'
              }
            </Typography>
            <Typography variant="body2">
              {searchTerm && searchTerm.trim().length > 0
                ? 'Intenta con otros términos de búsqueda o limpia el filtro.'
                : 'Agrega estudios de laboratorio, radiología u otros para esta consulta.'
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

                  {/* File info */}
                  {study.file_name && (
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
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                          {study.file_path && study.file_name && (
                            <Tooltip title="Descargar archivo">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewFile(study.id)}
                              >
                                <DownloadIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
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

export default memo(ClinicalStudiesSection);

