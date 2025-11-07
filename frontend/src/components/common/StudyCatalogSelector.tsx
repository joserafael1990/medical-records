import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Autocomplete,
  Chip,
  Button,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Science as ScienceIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { StudyCatalog, StudyCategory, StudySearchFilters } from '../../types';
import { useStudyCatalog } from '../../hooks/useStudyCatalog';
import { normalizeText } from '../../utils';

interface StudyCatalogSelectorProps {
  onSelectStudies: (studies: StudyCatalog[]) => void;
  selectedStudies: StudyCatalog[];
  specialty?: string;
  diagnosis?: string;
  showRecommendations?: boolean;
  showTemplates?: boolean;
  maxSelections?: number;
}

export const StudyCatalogSelector: React.FC<StudyCatalogSelectorProps> = ({
  onSelectStudies,
  selectedStudies,
  specialty,
  diagnosis,
  showRecommendations = true,
  showTemplates = true,
  maxSelections
}) => {
  const {
    studies,
    categories,
    templates,
    recommendations,
    isLoading,
    error,
    fetchStudies,
    fetchCategories,
    fetchTemplates,
    searchStudies,
    getRecommendations,
    getStudiesBySpecialty,
    getStudiesByCategory
  } = useStudyCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<StudyCategory | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty || '');
  const [expandedSection, setExpandedSection] = useState<string | false>('search');

  // Load categories and studies on mount
  useEffect(() => {
    fetchCategories();
    fetchStudies(); // Load all studies initially
  }, [fetchCategories, fetchStudies]);

  // State for search results
  const [searchResults, setSearchResults] = useState<StudyCatalog[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter studies based on current filters
  const filteredStudies = useMemo(() => {
    // Always use the studies from the hook (which gets updated by searchStudies)
    const baseStudies = studies || [];
    let filtered = baseStudies;
    
    // Apply specialty filter first
    if (selectedSpecialty && selectedSpecialty.trim()) {
      const normalizedSelectedSpecialty = normalizeText(selectedSpecialty.trim());
      filtered = filtered.filter(study => {
        // If study has no specialty, don't show it when filtering by specialty
        if (!study.specialty || !study.specialty.trim()) {
          return false;
        }
        
        const normalizedStudySpecialty = normalizeText(study.specialty);
        
        // Only show studies that exactly match or contain the selected specialty
        return normalizedStudySpecialty === normalizedSelectedSpecialty ||
               normalizedStudySpecialty.includes(normalizedSelectedSpecialty);
      });
    }

    return filtered;
  }, [studies, selectedCategory, selectedSpecialty, searchTerm]);

  // Handle search when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchTerm && searchTerm.trim()) {
        try {
          setIsSearching(true);
          console.log('🔍 Searching studies with term:', searchTerm);
          await searchStudies(searchTerm.trim(), {
            specialty: selectedSpecialty || undefined,
            category_id: selectedCategory?.id
          });
          // The searchStudies function should update the studies state
          // We'll use the studies state directly in filteredStudies
        } catch (error) {
          console.error('❌ Error searching studies:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedSpecialty, selectedCategory, searchStudies]);

  // Load recommendations when diagnosis or specialty changes
  useEffect(() => {
    if (showRecommendations && (diagnosis || specialty)) {
      getRecommendations(diagnosis, specialty);
    }
  }, [diagnosis, specialty, showRecommendations, getRecommendations]);

  // Fetch studies when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchStudies({ category_id: selectedCategory.id });
    } else {
      fetchStudies();
    }
  }, [selectedCategory, fetchStudies]);

  // Load templates when specialty changes
  useEffect(() => {
    if (showTemplates && specialty) {
      fetchTemplates(specialty);
    }
  }, [specialty, showTemplates, fetchTemplates]);

  const handleStudySelect = (study: StudyCatalog) => {
    if (maxSelections && (selectedStudies?.length || 0) >= maxSelections) {
      return;
    }

    if (!selectedStudies?.find(s => s.id === study.id)) {
      onSelectStudies([...(selectedStudies || []), study]);
    }
  };

  const handleStudyRemove = (studyId: number) => {
    onSelectStudies((selectedStudies || []).filter(s => s.id !== studyId));
  };

  // handleTemplateApply removed - StudyTemplate table deleted

  const handleRecommendationSelect = (study: StudyCatalog) => {
    handleStudySelect(study);
  };

  const getDurationText = (hours?: number) => {
    if (!hours) return 'No especificado';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const StudyCard: React.FC<{ study: StudyCatalog; showAddButton?: boolean }> = ({ 
    study, 
    showAddButton = true 
  }) => {
    // Add validation to prevent undefined study errors
    if (!study) {
      console.warn('StudyCard received undefined study');
      return null;
    }

    return (
      <Card sx={{ mb: 1, border: '1px solid #e0e0e0' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  {study.name || 'Estudio sin nombre'}
                </Typography>
                <Chip 
                  label={study.code || 'N/A'} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {study.description || 'Sin descripción'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {study.subcategory && (
                <Chip 
                  label={study.subcategory} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                />
              )}
              {study.specialty && (
                <Chip 
                  label={study.specialty} 
                  size="small" 
                  color="info" 
                  variant="outlined"
                />
              )}
              <Chip 
                icon={<ScheduleIcon />}
                label={getDurationText(study.duration_hours)} 
                size="small" 
                color="default" 
                variant="outlined"
              />
            </Box>

            {study.preparation && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
                <InfoIcon color="action" sx={{ fontSize: 16, mt: 0.5 }} />
                <Typography variant="caption" color="text.secondary">
                  <strong>Preparación:</strong> {study.preparation}
                </Typography>
              </Box>
            )}
          </Box>

          {showAddButton && (
            <Tooltip title="Agregar estudio">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleStudySelect(study)}
                disabled={maxSelections ? (selectedStudies?.length || 0) >= maxSelections : false}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Selected Studies */}
      {(selectedStudies?.length || 0) > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon color="primary" />
              Estudios Seleccionados ({selectedStudies?.length || 0})
              {maxSelections && ` / ${maxSelections}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(selectedStudies || []).filter(study => study).map(study => (
                <Chip
                  key={study.id}
                  label={`${study.name || 'Estudio'} (${study.code || 'N/A'})`}
                  onDelete={() => handleStudyRemove(study.id)}
                  color="primary"
                  variant="filled"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Accordion 
        expanded={expandedSection === 'search'} 
        onChange={() => setExpandedSection(expandedSection === 'search' ? false : 'search')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            Búsqueda de Estudios
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Buscar estudios"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, código o descripción..."
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
                sx={{ 
                  mb: 1,
                  '& .MuiInputBase-root': {
                    minWidth: '200px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={4}>
              <Autocomplete
                options={categories || []}
                getOptionLabel={(option) => option.name}
                value={selectedCategory}
                onChange={(_, newValue) => setSelectedCategory(newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Categoría" 
                    sx={{
                      '& .MuiInputBase-root': {
                        minWidth: '180px'
                      }
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={option.id || option.code} {...otherProps}>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.code}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                sx={{ 
                  mb: 1,
                  minWidth: '180px'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} lg={4}>
              <TextField
                fullWidth
                label="Especialidad"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                placeholder="Ej: Cardiología, Endocrinología..."
                sx={{ 
                  mb: 1,
                  '& .MuiInputBase-root': {
                    minWidth: '180px'
                  }
                }}
              />
            </Grid>
          </Grid>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto', mt: 2 }}>
              {filteredStudies.length === 0 ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
                    No se encontraron estudios con los filtros aplicados
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', p: 1, display: 'block' }}>
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredStudies.filter(study => study).map(study => (
                    <StudyCard key={study.id} study={study} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Recommendations Section */}
      {showRecommendations && (recommendations?.length || 0) > 0 && (
        <Accordion 
          expanded={expandedSection === 'recommendations'} 
          onChange={() => setExpandedSection(expandedSection === 'recommendations' ? false : 'recommendations')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HospitalIcon />
              Recomendaciones ({recommendations?.length || 0})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recommendations.filter(rec => rec && rec.study).map((rec, index) => (
                  <StudyCard key={index} study={rec.study} />
                ))}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Templates Section */}
      {showTemplates && (templates?.length || 0) > 0 && (
        <Accordion 
          expanded={expandedSection === 'templates'} 
          onChange={() => setExpandedSection(expandedSection === 'templates' ? false : 'templates')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon />
              Plantillas ({templates?.length || 0})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {(templates || []).filter(template => template).map(template => (
                <Grid item xs={12} sm={6} md={6} key={template.id}>
                  <Card sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {template.name}
                      </Typography>
                      {template.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {template.description}
                        </Typography>
                      )}
                      {template.specialty && (
                        <Chip 
                          label={template.specialty} 
                          size="small" 
                          color="info" 
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        {template.template_items.filter(item => item.study).length} estudios incluidos
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleTemplateApply(template)}
                        disabled={maxSelections ? (selectedStudies?.length || 0) >= maxSelections : false}
                        fullWidth
                      >
                        Aplicar Plantilla
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};
