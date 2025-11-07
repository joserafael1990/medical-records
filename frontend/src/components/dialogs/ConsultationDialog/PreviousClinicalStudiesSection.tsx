import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  Card,
  CardContent,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Science as ScienceIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { ClinicalStudy } from '../../../types';

interface PreviousClinicalStudiesSectionProps {
  selectedPatient: any;
  patientPreviousStudies: ClinicalStudy[];
  loadingPreviousStudies: boolean;
  onUploadStudyFile: (studyId: number, file: File) => void;
  onUpdateStudyStatus: (studyId: number, status: string) => void;
  onViewStudyFile: (studyId: number) => void;
}

export const PreviousClinicalStudiesSection: React.FC<PreviousClinicalStudiesSectionProps> = ({
  selectedPatient,
  patientPreviousStudies,
  loadingPreviousStudies,
  onUploadStudyFile,
  onUpdateStudyStatus,
  onViewStudyFile
}) => {
  if (!selectedPatient || patientPreviousStudies.length === 0) {
    return null;
  }

  return (
    <Box>
      <Divider sx={{ my: 3 }}>
        <Chip icon={<ScienceIcon />} label="Estudios Clínicos Previos del Paciente" color="info" />
      </Divider>
      
      {loadingPreviousStudies ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {patientPreviousStudies.map((study) => {
            return (
              <Card key={study.id} variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {study.study_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {study.study_type}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={
                        study.status === 'ordered' ? 'Ordenado' : 
                        study.status === 'in_progress' ? 'En Proceso' : 
                        study.status === 'completed' ? 'Completado' : 
                        study.status === 'cancelled' ? 'Cancelado' : 
                        study.status === 'failed' ? 'Fallido' : 
                        study.status
                      }
                      color={study.status === 'completed' ? 'success' : 'warning'}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Solicitado: {new Date(study.ordered_date).toLocaleDateString('es-MX')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {study.status === 'ordered' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            component="label"
                            startIcon={<UploadIcon />}
                          >
                            Cargar Archivo
                            <input
                              type="file"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onUploadStudyFile(study.id, file);
                                }
                              }}
                            />
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => onUpdateStudyStatus(study.id, 'completed')}
                          >
                            Marcar Completado
                          </Button>
                        </>
                      )}
                      
                      {study.file_path && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<ViewIcon />}
                          onClick={() => onViewStudyFile(study.id)}
                        >
                          Ver Archivo
                        </Button>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};


