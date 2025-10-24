import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Grid,
  Divider
} from '@mui/material';
import {
  Science as ScienceIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

interface ClinicalStudy {
  id: string;
  study_name: string;
  study_type: string;
  description?: string;
  is_temporary?: boolean;
}

interface ClinicalStudiesSectionProps {
  studies: ClinicalStudy[];
  availableStudies: any[];
  onAddStudy: (study: any) => void;
  onRemoveStudy: (studyId: string) => void;
  errors: Record<string, string>;
}

export const ClinicalStudiesSection: React.FC<ClinicalStudiesSectionProps> = ({
  studies,
  availableStudies,
  onAddStudy,
  onRemoveStudy,
  errors
}) => {
  const [addStudyDialogOpen, setAddStudyDialogOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<any>(null);
  const [studyDescription, setStudyDescription] = useState('');

  const handleAddStudy = () => {
    if (selectedStudy) {
      onAddStudy({
        ...selectedStudy,
        description: studyDescription
      });
      setSelectedStudy(null);
      setStudyDescription('');
      setAddStudyDialogOpen(false);
    }
  };

  const handleRemoveStudy = (studyId: string) => {
    onRemoveStudy(studyId);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ScienceIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h3">
              Estudios Clínicos
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddStudyDialogOpen(true)}
            size="small"
          >
            Agregar Estudio
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {studies.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No hay estudios clínicos agregados
          </Typography>
        ) : (
          <Grid container spacing={1}>
            {studies.map((study) => (
              <Grid item xs={12} sm={6} md={4} key={study.id}>
                <Card variant="outlined" sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {study.study_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {study.study_type}
                      </Typography>
                      {study.description && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {study.description}
                        </Typography>
                      )}
                      {study.is_temporary && (
                        <Chip label="Nuevo" size="small" color="primary" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveStudy(study.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Add Study Dialog */}
        <Dialog
          open={addStudyDialogOpen}
          onClose={() => setAddStudyDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Agregar Estudio Clínico</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Autocomplete
                options={availableStudies || []}
                getOptionLabel={(option) => option.name || option.study_name}
                value={selectedStudy}
                onChange={(event, newValue) => setSelectedStudy(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar Estudio"
                    placeholder="Escribe para buscar..."
                    fullWidth
                  />
                )}
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Descripción (opcional)"
                multiline
                rows={3}
                value={studyDescription}
                onChange={(e) => setStudyDescription(e.target.value)}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddStudyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddStudy}
              variant="contained"
              disabled={!selectedStudy}
            >
              Agregar
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
