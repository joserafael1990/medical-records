import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  MedicalServices as MedicalServicesIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useDiagnosisCatalog, DiagnosisSearchResult, DiagnosisCatalog } from '../../hooks/useDiagnosisCatalog';

interface DiagnosisSelectorProps {
  selectedDiagnoses: DiagnosisCatalog[];
  onDiagnosesChange: (diagnoses: DiagnosisCatalog[]) => void;
  specialty?: string;
  maxSelections?: number;
  showRecommendations?: boolean;
  showDifferentials?: boolean;
  disabled?: boolean;
}

const DiagnosisSelector: React.FC<DiagnosisSelectorProps> = ({
  selectedDiagnoses,
  onDiagnosesChange,
  specialty,
  maxSelections = 5,
  showRecommendations = false,
  showDifferentials = false,
  disabled = false
}: DiagnosisSelectorProps) => {
  const {
    categories,
    specialties,
    searchDiagnoses,
    // getDiagnosisRecommendations removed - table deleted
    // getDiagnosisDifferentials removed - table deleted
    loading,
    error
  } = useDiagnosisCatalog();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DiagnosisSearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(specialty || null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [chronicFilter, setChronicFilter] = useState<boolean | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Search diagnoses
  const handleSearch = useCallback(async () => {
    // Allow search with filters even without search term
    const hasFilters = selectedCategory || selectedSpecialty || severityFilter || chronicFilter !== null;
    
    if (!searchTerm.trim() && !hasFilters) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Use real API for diagnosis search
      console.log('Searching diagnoses with API', {
        searchTerm,
        selectedCategory,
        selectedSpecialty,
        severityFilter,
        chronicFilter
      });

      // Build search request
      const searchRequest = {
        query: searchTerm.trim() || '',
        category_id: selectedCategory ? parseInt(selectedCategory) : undefined,
        specialty: selectedSpecialty || undefined,
        severity_level: severityFilter || undefined,
        is_chronic: chronicFilter !== null ? chronicFilter : undefined,
        limit: 50,
        offset: 0
      };

      // Call the search API
      const results = await searchDiagnoses(searchRequest);
      
      console.log('🔍 API search results:', results);
      console.log('🔍 Results count:', results?.length || 0);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching diagnoses:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, selectedCategory, selectedSpecialty, severityFilter, chronicFilter, searchDiagnoses]);

  // Auto-search when filters change
  useEffect(() => {
    const hasFilters = selectedCategory || selectedSpecialty || severityFilter || chronicFilter !== null;
    if (hasFilters || searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 300); // Debounce search
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCategory, selectedSpecialty, severityFilter, chronicFilter, searchTerm, handleSearch]);

  // Add diagnosis to selection
  const handleAddDiagnosis = async (diagnosisResult: DiagnosisSearchResult) => {
    if (selectedDiagnoses.length >= maxSelections) {
      return;
    }

    // Check if already selected
    if (selectedDiagnoses.some((d: DiagnosisCatalog) => d.id === diagnosisResult.id)) {
      return;
    }

    try {
      // Convert search result to full diagnosis object
      const fullDiagnosis: DiagnosisCatalog = {
        id: diagnosisResult.id,
        code: diagnosisResult.code,
        name: diagnosisResult.name,
        category_id: 0, // Will be filled by the API
        description: diagnosisResult.description,
        synonyms: diagnosisResult.synonyms,
        severity_level: diagnosisResult.severity_level,
        is_chronic: diagnosisResult.is_chronic,
        is_contagious: diagnosisResult.is_contagious,
        age_group: diagnosisResult.age_group,
        gender_specific: diagnosisResult.gender_specific,
        specialty: diagnosisResult.specialty,
        is_active: true,
        created_at: '',
        updated_at: '',
        category: {
          id: diagnosisResult.category_id || 0,
          code: '',  // category_code field removed
          name: diagnosisResult.category_name,
          level: 1,
          is_active: true,
          created_at: '',
          updated_at: ''
        }
      };

      onDiagnosesChange([...selectedDiagnoses, fullDiagnosis]);
    } catch (err) {
      console.error('Error adding diagnosis:', err);
    }
  };

  // Remove diagnosis from selection
  const handleRemoveDiagnosis = (diagnosisId: number) => {
    onDiagnosesChange(selectedDiagnoses.filter((d: DiagnosisCatalog) => d.id !== diagnosisId));
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSpecialty(specialty || null);
    setSeverityFilter(null);
    setChronicFilter(null);
  };

  // Search when term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, selectedSpecialty, severityFilter, chronicFilter]);

  // Get severity level color
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'mild': return 'success';
      case 'moderate': return 'warning';
      case 'severe': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  // Get severity level label
  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'mild': return 'Leve';
      case 'moderate': return 'Moderado';
      case 'severe': return 'Severo';
      case 'critical': return 'Crítico';
      default: return 'No especificado';
    }
  };

  return (
    <Box>
      {/* Search Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            Buscar Diagnósticos
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Buscar diagnósticos"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                placeholder="Código CIE-10, nombre o descripción..."
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
                disabled={disabled}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3} lg={2.5}>
                  <Autocomplete
                    options={(categories || []).map((cat: any) => cat.code)}
                    getOptionLabel={(option: string) => {
                      const category = categories.find((cat: any) => cat.code === option);
                      return category ? `${option} - ${category.name}` : option;
                    }}
                    value={selectedCategory}
                    onChange={(_: any, newValue: string | null) => {
                      setSelectedCategory(newValue);
                    }}
                    renderInput={(params: any) => (
                      <TextField 
                        {...params} 
                        label="Categoría" 
                        sx={{
                          width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                          minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                        }}
                      />
                    )}
                    disabled={disabled}
                    sx={{
                      width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                      minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3} lg={2.5}>
                  <Autocomplete
                    options={specialties || []}
                    value={selectedSpecialty}
                    onChange={(_: any, newValue: string | null) => {
                      setSelectedSpecialty(newValue);
                    }}
                    renderInput={(params: any) => (
                      <TextField 
                        {...params} 
                        label="Especialidad" 
                        sx={{
                          width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                          minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                        }}
                      />
                    )}
                    disabled={disabled}
                    sx={{
                      width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                      minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3} lg={2.5}>
                  <Autocomplete
                    options={[
                      { value: 'mild', label: 'Leve' },
                      { value: 'moderate', label: 'Moderado' },
                      { value: 'severe', label: 'Severo' },
                      { value: 'critical', label: 'Crítico' }
                    ]}
                    getOptionLabel={(option: any) => option.label}
                    value={severityFilter ? { value: severityFilter, label: getSeverityLabel(severityFilter) } : null}
                    onChange={(_: any, newValue: any) => {
                      setSeverityFilter(newValue?.value || null);
                    }}
                    renderInput={(params: any) => (
                      <TextField 
                        {...params} 
                        label="Severidad" 
                        sx={{
                          width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                          minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                        }}
                      />
                    )}
                    disabled={disabled}
                    sx={{
                      width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                      minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3} lg={2.5}>
                  <Autocomplete
                    options={[
                      { value: true, label: 'Sí' },
                      { value: false, label: 'No' }
                    ]}
                    getOptionLabel={(option: any) => option.label}
                    value={chronicFilter !== null ? { value: chronicFilter, label: chronicFilter ? 'Sí' : 'No' } : null}
                    onChange={(_: any, newValue: any) => {
                      setChronicFilter(newValue?.value || null);
                    }}
                    renderInput={(params: any) => (
                      <TextField 
                        {...params} 
                        label="Crónico" 
                        sx={{
                          width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                          minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                        }}
                      />
                    )}
                    disabled={disabled}
                    sx={{
                      width: { xs: '100%', sm: '100%', md: '100%', lg: '100%' },
                      minWidth: { xs: '100%', sm: '200px', md: '180px', lg: '160px' }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={disabled || isSearching}
              startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              disabled={disabled}
            >
              Limpiar Filtros
            </Button>
            <Button
              variant="outlined"
              onClick={handleClearSearch}
              disabled={disabled}
            >
              Limpiar Búsqueda
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Resultados de Búsqueda ({searchResults.length})
            </Typography>
            
            {isSearching && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            <Grid container spacing={1}>
              {(searchResults || []).map((result: DiagnosisSearchResult) => (
                <Grid item xs={12} sm={6} md={4} key={result.id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      opacity: selectedDiagnoses.some((d: DiagnosisCatalog) => d.id === result.id) ? 0.6 : 1
                    }}
                    onClick={() => handleAddDiagnosis(result)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {result.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip
                              label={result.code}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {result.severity_level && (
                              <Chip
                                label={getSeverityLabel(result.severity_level)}
                                size="small"
                                color={getSeverityColor(result.severity_level) as any}
                                variant="outlined"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {result.category_name}
                          </Typography>
                          {result.specialty && (
                            <Typography variant="caption" color="text.secondary">
                              {result.specialty}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={selectedDiagnoses.some((d: DiagnosisCatalog) => d.id === result.id) || selectedDiagnoses.length >= maxSelections}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Selected Diagnoses */}
      {(selectedDiagnoses || []).length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon />
              Diagnósticos Seleccionados ({(selectedDiagnoses || []).length}/{maxSelections})
            </Typography>
            
            <Grid container spacing={1}>
              {(selectedDiagnoses || []).map((diagnosis: DiagnosisCatalog) => (
                <Grid item xs={12} sm={6} md={4} key={diagnosis.id}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {diagnosis.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={diagnosis.code}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {diagnosis.severity_level && (
                              <Chip
                                label={getSeverityLabel(diagnosis.severity_level)}
                                size="small"
                                color={getSeverityColor(diagnosis.severity_level) as any}
                                variant="outlined"
                              />
                            )}
                            {diagnosis.is_chronic && (
                              <Chip
                                label="Crónico"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            )}
                            {diagnosis.is_contagious && (
                              <Chip
                                label="Contagioso"
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {diagnosis.category.name}
                          </Typography>
                          {diagnosis.specialty && (
                            <Typography variant="caption" color="text.secondary">
                              {diagnosis.specialty}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveDiagnosis(diagnosis.id)}
                          disabled={disabled}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {searchTerm && searchResults && searchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No se encontraron diagnósticos que coincidan con la búsqueda.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DiagnosisSelector;
