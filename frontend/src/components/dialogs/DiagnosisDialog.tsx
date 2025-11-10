import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  MedicalServices as MedicalServicesIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useDiagnosisCatalog, DiagnosisSearchResult, DiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';
import { preventBackdropClose } from '../../utils/dialogHelpers';

interface DiagnosisDialogProps {
  open: boolean;
  onClose: () => void;
  onAddDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  existingDiagnoses: DiagnosisCatalog[];
  title?: string;
  maxSelections?: number;
}

const DiagnosisDialog: React.FC<DiagnosisDialogProps> = ({
  open,
  onClose,
  onAddDiagnosis,
  existingDiagnoses,
  title = "Agregar Diagnóstico",
  maxSelections = 999
}) => {
  const {
    categories,
    specialties,
    searchDiagnoses,
    loading,
    error
  } = useDiagnosisCatalog();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DiagnosisSearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [chronicFilter, setChronicFilter] = useState<boolean | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedCategory(null);
      setSelectedSpecialty(null);
      setSeverityFilter(null);
      setChronicFilter(null);
    }
  }, [open]);

  // Search diagnoses
  const handleSearch = useCallback(async () => {
    const hasFilters = selectedCategory || selectedSpecialty || severityFilter || chronicFilter !== null;
    
    if (!searchTerm.trim() && !hasFilters) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('🔍 Searching diagnoses with API', {
        searchTerm,
        selectedCategory,
        selectedSpecialty,
        severityFilter,
        chronicFilter
      });

      const searchRequest = {
        query: searchTerm.trim() || '',
        category_id: selectedCategory ? parseInt(selectedCategory) : undefined,
        specialty: selectedSpecialty || undefined,
        severity_level: severityFilter || undefined,
        is_chronic: chronicFilter !== null ? chronicFilter : undefined,
        limit: 50,
        offset: 0
      };

      const results = await searchDiagnoses(searchRequest);
      console.log('🔍 API search results:', results);
      setSearchResults(results || []);
    } catch (err) {
      console.error('❌ Error searching diagnoses:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, selectedCategory, selectedSpecialty, severityFilter, chronicFilter, searchDiagnoses]);

  // Auto-search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim() || selectedCategory || selectedSpecialty || severityFilter || chronicFilter !== null) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, selectedSpecialty, severityFilter, chronicFilter, handleSearch]);

  // Handle diagnosis selection
  const handleSelectDiagnosis = useCallback((diagnosis: DiagnosisSearchResult) => {
    console.log('🔍 handleSelectDiagnosis called:', {
      diagnosisCode: diagnosis.code,
      existingDiagnoses: existingDiagnoses.map(d => d.code),
      existingCount: existingDiagnoses.length,
      maxSelections
    });
    
    // Check if already selected
    const isAlreadySelected = existingDiagnoses.some(existing => 
      existing.code === diagnosis.code
    );
    
    if (isAlreadySelected) {
      console.log('⚠️ Diagnosis already selected:', diagnosis.code);
      return;
    }

    // Check max selections
    if (existingDiagnoses.length >= maxSelections) {
      console.log('⚠️ Maximum selections reached:', maxSelections);
      return;
    }

    // Convert to DiagnosisCatalog format
    const diagnosisToAdd: DiagnosisCatalog = {
      id: diagnosis.id,
      code: diagnosis.code,
      name: diagnosis.name,
      category: diagnosis.category,
      specialty: diagnosis.specialty,
      severity_level: diagnosis.severity_level,
      is_chronic: diagnosis.is_chronic,
      description: diagnosis.description
    };

    console.log('✅ Adding diagnosis:', diagnosisToAdd);
    onAddDiagnosis(diagnosisToAdd);
    
    // Close dialog after selection to show the selected diagnosis in the main screen
    onClose();
  }, [existingDiagnoses, maxSelections, onAddDiagnosis]);

  // Check if diagnosis is already selected
  const isDiagnosisSelected = useCallback((diagnosis: DiagnosisSearchResult) => {
    const isSelected = existingDiagnoses.some(existing => existing.code === diagnosis.code);
    console.log('🔍 Checking if diagnosis is selected:', {
      diagnosisCode: diagnosis.code,
      existingDiagnoses: existingDiagnoses.map(d => d.code),
      isSelected
    });
    return isSelected;
  }, [existingDiagnoses]);

  return (
    <Dialog open={open} onClose={preventBackdropClose(onClose)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <MedicalServicesIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Busca diagnósticos por código CIE-10, nombre o descripción. Puedes usar filtros para refinar tu búsqueda.
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          {/* Search Row */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Buscar diagnóstico"
                placeholder="Código CIE-10, nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={isSearching}
                startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
                fullWidth
                sx={{ height: '40px' }}
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </Button>
            </Grid>
          </Grid>
          
          {/* Filters Row - Using Autocomplete like StudyCatalogSelector */}
          <Grid container spacing={2}>
            {/* Category Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={categories || []}
                getOptionLabel={(option) => option.name}
                value={categories?.find(cat => cat.code === selectedCategory) || null}
                onChange={(_, newValue) => setSelectedCategory(newValue?.code || null)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Categoría"
                    size="small"
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
                  minWidth: '180px'
                }}
              />
            </Grid>
            
            {/* Specialty Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={specialties || []}
                getOptionLabel={(option) => option}
                value={selectedSpecialty || null}
                onChange={(_, newValue) => setSelectedSpecialty(newValue || null)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Especialidad"
                    size="small"
                    sx={{
                      '& .MuiInputBase-root': {
                        minWidth: '180px'
                      }
                    }}
                  />
                )}
                sx={{ 
                  minWidth: '180px'
                }}
              />
            </Grid>
            
            {/* Severity Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={[
                  { value: 'mild', label: 'Leve' },
                  { value: 'moderate', label: 'Moderada' },
                  { value: 'severe', label: 'Severa' },
                  { value: 'critical', label: 'Crítica' }
                ]}
                getOptionLabel={(option) => option.label}
                value={severityFilter ? { value: severityFilter, label: 
                  severityFilter === 'mild' ? 'Leve' :
                  severityFilter === 'moderate' ? 'Moderada' :
                  severityFilter === 'severe' ? 'Severa' :
                  severityFilter === 'critical' ? 'Crítica' : severityFilter
                } : null}
                onChange={(_, newValue) => setSeverityFilter(newValue?.value || null)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Severidad"
                    size="small"
                    sx={{
                      '& .MuiInputBase-root': {
                        minWidth: '180px'
                      }
                    }}
                  />
                )}
                sx={{ 
                  minWidth: '180px'
                }}
              />
            </Grid>
            
            {/* Chronic Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={[
                  { value: true, label: 'Sí' },
                  { value: false, label: 'No' }
                ]}
                getOptionLabel={(option) => option.label}
                value={chronicFilter !== null ? { value: chronicFilter, label: chronicFilter ? 'Sí' : 'No' } : null}
                onChange={(_, newValue) => setChronicFilter(newValue?.value || null)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Crónico"
                    size="small"
                    sx={{
                      '& .MuiInputBase-root': {
                        minWidth: '180px'
                      }
                    }}
                  />
                )}
                sx={{ 
                  minWidth: '180px'
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Search Results */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Resultados de búsqueda
            {searchResults.length > 0 && (
              <Chip 
                label={`${searchResults.length} encontrados`} 
                size="small" 
                color="primary" 
                sx={{ ml: 1 }}
              />
            )}
          </Typography>

          {isSearching && (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error al buscar diagnósticos: {error}
            </Alert>
          )}

          {!isSearching && searchResults.length === 0 && searchTerm && (
            <Alert severity="info">
              No se encontraron diagnósticos con los criterios de búsqueda.
            </Alert>
          )}

          {!isSearching && searchResults.length > 0 && (
            <Box>
              {searchResults.map((diagnosis) => (
                <Box
                  key={diagnosis.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    mb: 1,
                    border: '1px solid',
                    borderColor: isDiagnosisSelected(diagnosis) ? 'success.main' : 'divider',
                    borderRadius: 1,
                    backgroundColor: isDiagnosisSelected(diagnosis) ? 'success.light' : 'background.paper',
                    cursor: isDiagnosisSelected(diagnosis) ? 'not-allowed' : 'pointer',
                    opacity: isDiagnosisSelected(diagnosis) ? 0.7 : 1,
                    '&:hover': {
                      backgroundColor: isDiagnosisSelected(diagnosis) ? 'success.light' : 'action.hover',
                      borderColor: isDiagnosisSelected(diagnosis) ? 'success.main' : 'primary.main'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onClick={() => !isDiagnosisSelected(diagnosis) && handleSelectDiagnosis(diagnosis)}
                >
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary">
                        {diagnosis.code}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {diagnosis.name}
                      </Typography>
                    </Box>
                    
                    {diagnosis.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {diagnosis.description}
                      </Typography>
                    )}
                    
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {diagnosis.category && (
                        <Chip 
                          label={diagnosis.category} 
                          size="small" 
                          variant="outlined" 
                          color="default"
                        />
                      )}
                      {diagnosis.specialty && (
                        <Chip 
                          label={diagnosis.specialty} 
                          size="small" 
                          variant="outlined" 
                          color="info"
                        />
                      )}
                      {diagnosis.severity_level && (
                        <Chip 
                          label={diagnosis.severity_level} 
                          size="small" 
                          color={diagnosis.severity_level === 'critical' ? 'error' : 'default'}
                        />
                      )}
                      {diagnosis.is_chronic && (
                        <Chip 
                          label="Crónico" 
                          size="small" 
                          color="warning"
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Box ml={2}>
                    {isDiagnosisSelected(diagnosis) ? (
                      <Chip 
                        label="Seleccionado" 
                        size="small" 
                        color="success" 
                        icon={<CheckIcon />}
                      />
                    ) : (
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDiagnosis(diagnosis);
                        }}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText'
                          }
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiagnosisDialog;
