import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Divider,

  Alert,
  LinearProgress
} from '@mui/material';
import {
  Science as ScienceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  CloudUpload as UploadIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { ClinicalStudy, StudyStatus } from '../../types';
import { STUDY_STATUS_OPTIONS, STUDY_TYPES } from '../../constants';

interface ClinicalStudiesSectionProps {
  consultationId: string;
  patientId: string;
  studies: ClinicalStudy[];
  isLoading?: boolean;
  onAddStudy: () => void;
  onEditStudy: (study: ClinicalStudy) => void;
  onDeleteStudy: (studyId: string) => void;
  onViewFile?: (fileUrl: string) => void;
  onDownloadFile?: (fileUrl: string, fileName: string) => void;
}

const ClinicalStudiesSection: React.FC<ClinicalStudiesSectionProps> = ({
  consultationId,
  patientId,
  studies,
  isLoading = false,
  onAddStudy,
  onEditStudy,
  onDeleteStudy,
  onViewFile,
  onDownloadFile
}) => {
  const [filteredStudies, setFilteredStudies] = useState<ClinicalStudy[]>([]);

  // Handle view file with authentication
  const handleViewFile = async (studyId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
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
      console.error('Error viewing study file:', error);
      alert('Error al visualizar el archivo del estudio');
    }
  };

  useEffect(() => {
    const consultationStudies = studies.filter(study => {
      // Handle both string and number comparisons
      const studyConsultationId = study.consultation_id;
      const studyPatientId = study.patient_id;
      
      // For temp consultations, compare as strings
      if (consultationId === 'temp_consultation' || studyConsultationId === 'temp_consultation') {
        return studyConsultationId === consultationId && studyPatientId === patientId;
      }
      
      // For real consultations, compare as numbers
      return Number(studyConsultationId) === Number(consultationId) && Number(studyPatientId) === Number(patientId);
    });
    
    setFilteredStudies(consultationStudies);
  }, [studies, consultationId, patientId]);

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
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon color="primary" />
          Solicitar nuevos Estudios clínicos
          {filteredStudies.length > 0 && (
            <Chip 
              size="small" 
              label={filteredStudies.length} 
              color="primary" 
              variant="outlined" 
            />
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddStudy}
          size="small"
        >
          Nuevo Estudio
        </Button>
      </Box>

      {filteredStudies.length === 0 ? (
        <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle2">
              No hay estudios clínicos registrados
            </Typography>
            <Typography variant="body2">
              Agrega estudios de laboratorio, radiología u otros para esta consulta.
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

                    {study.urgency && study.urgency !== 'normal' && (
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
                      <IconButton size="small" color="error" onClick={() => onDeleteStudy(study.id)}>
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
