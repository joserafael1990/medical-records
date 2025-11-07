import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Autocomplete,
  TextField,
  CircularProgress
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { DiagnosisCatalog, useDiagnosisCatalog, DiagnosisSearchResult } from '../../hooks/useDiagnosisCatalog';

interface DiagnosisSectionProps {
  diagnoses: DiagnosisCatalog[];
  onAddDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  onRemoveDiagnosis: (diagnosisId: string) => void;
  onEditDiagnosis?: (diagnosis: DiagnosisCatalog) => void;
  title?: string;
  maxSelections?: number;
  showAddButton?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

const DiagnosisSection: React.FC<DiagnosisSectionProps> = ({
  diagnoses,
  onAddDiagnosis,
  onRemoveDiagnosis,
  onEditDiagnosis,
  title = "Diagnósticos",
  maxSelections = 999,
  showAddButton = true,
  isLoading = false,
  error
}) => {
  const diagnosisCatalog = useDiagnosisCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DiagnosisSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisSearchResult | null>(null);

  // Debounced search
  // Use useRef to store the searchDiagnoses method to avoid dependency issues
  const searchDiagnosesRef = React.useRef(diagnosisCatalog.searchDiagnoses);
  
  // Update ref when method changes (should be stable due to useCallback in hook)
  React.useEffect(() => {
    searchDiagnosesRef.current = diagnosisCatalog.searchDiagnoses;
  }, [diagnosisCatalog.searchDiagnoses]);
  
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Use the ref to call the method, avoiding dependency on the hook object
        const results = await searchDiagnosesRef.current({
          query: searchTerm,
          limit: 10
        });
        setSearchResults(results || []);
      } catch (err) {
        console.error('Error searching diagnoses:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]); // Only depend on searchTerm - method is accessed via ref

  const handleDiagnosisSelect = useCallback((diagnosis: DiagnosisSearchResult | null) => {
    if (!diagnosis) return;

    // Check if already selected
    const isAlreadySelected = diagnoses.some(d => d.code === diagnosis.code);
    if (isAlreadySelected) {
      setSelectedDiagnosis(null);
      setSearchTerm('');
      return;
    }

    // Check max selections
    if (diagnoses.length >= maxSelections) {
      return;
    }

    // Convert to DiagnosisCatalog format
    const diagnosisToAdd: DiagnosisCatalog = {
      id: diagnosis.id,
      code: diagnosis.code,
      name: diagnosis.name,
      specialty: diagnosis.specialty,
      severity_level: diagnosis.severity_level,
      is_chronic: diagnosis.is_chronic,
      description: diagnosis.description,
      is_active: true,
      created_at: '',
      updated_at: '',
      category_id: 0,
      is_contagious: diagnosis.is_contagious,
      category: {
        id: diagnosis.category_id || 0,
        code: '',  // category_code field removed
        name: diagnosis.category_name || '',
        level: 1,
        is_active: true,
        created_at: '',
        updated_at: ''
      }
    };

    onAddDiagnosis(diagnosisToAdd);
    setSelectedDiagnosis(null);
    setSearchTerm('');
    setSearchResults([]);
  }, [diagnoses, maxSelections, onAddDiagnosis]);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'severe': return 'warning';
      case 'moderate': return 'info';
      case 'mild': return 'success';
      default: return 'default';
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'severe': return 'Severa';
      case 'moderate': return 'Moderada';
      case 'mild': return 'Leve';
      default: return severity;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <MedicalServicesIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${diagnoses.length}`} 
            size="small" 
            color={diagnoses.length >= maxSelections ? 'error' : 'primary'}
          />
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add Diagnosis - Inline Autocomplete */}
      {showAddButton && diagnoses.length < maxSelections && (
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            options={searchResults}
            getOptionLabel={(option) => `${option.code} - ${option.name}`}
            loading={searchLoading}
            value={selectedDiagnosis}
            onChange={(event, newValue) => {
              if (newValue) {
                handleDiagnosisSelect(newValue);
              }
            }}
            onInputChange={(event, newInputValue) => {
              setSearchTerm(newInputValue);
            }}
            filterOptions={(x) => x} // Disable default filtering, we do it server-side
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Buscar diagnóstico (CIE-10)..."
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" key={option.id} {...otherProps}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {option.code} - {option.name}
                    </Typography>
                    {option.description && (
                      <Typography variant="caption" color="text.secondary">
                        {option.description.length > 80 ? `${option.description.substring(0, 80)}...` : option.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            }}
            sx={{ mb: 2 }}
          />
        </Box>
      )}

      {/* Diagnoses List */}
      {diagnoses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No se han registrado diagnósticos. Busca y agrega un diagnóstico usando el campo de búsqueda arriba.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {diagnoses.map((diagnosis) => (
            <Grid item xs={12} sm={6} md={4} key={String(diagnosis.id)}>
              <Card 
                sx={{ 
                  height: '100%',
                  '&:hover': {
                    boxShadow: 2
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                      {diagnosis.code}
                    </Typography>
                    <Box>
                      <Tooltip title="Eliminar diagnóstico">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => onRemoveDiagnosis(String(diagnosis.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1, minHeight: '2.5em' }}>
                    {diagnosis.name}
                  </Typography>
                  
                  {diagnosis.description && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {diagnosis.description.length > 100 
                        ? `${diagnosis.description.substring(0, 100)}...` 
                        : diagnosis.description
                      }
                    </Typography>
                  )}
                  
                  <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                    {diagnosis.category && (
                      <Chip 
                        label={typeof diagnosis.category === 'string' ? diagnosis.category : (diagnosis.category.name || '')} 
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
                        label={getSeverityLabel(diagnosis.severity_level)} 
                        size="small" 
                        color={getSeverityColor(diagnosis.severity_level)}
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
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Max Selections Warning */}
      {diagnoses.length >= maxSelections && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Has alcanzado el límite máximo de diagnósticos ({maxSelections}). Considera consolidar diagnósticos similares.
        </Alert>
      )}
    </Box>
  );
};

export default DiagnosisSection;
