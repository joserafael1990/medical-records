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
  CircularProgress,
  Button
} from '@mui/material';
import {
  MedicalServices as MedicalServicesIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { DiagnosisCatalog, useDiagnosisCatalog, DiagnosisSearchResult } from '../../hooks/useDiagnosisCatalog';
import { logger } from '../../utils/logger';

interface DiagnosisSectionProps {
  diagnoses: DiagnosisCatalog[];
  onAddDiagnosis: (diagnosis: DiagnosisCatalog) => void;
  onRemoveDiagnosis: (diagnosisId: string) => void;
  onEditDiagnosis?: (diagnosis: DiagnosisCatalog) => void;
  onCreateDiagnosis?: (name: string) => Promise<DiagnosisCatalog>;
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
  onCreateDiagnosis,
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
  const [isCreatingDiagnosis, setIsCreatingDiagnosis] = useState(false);

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
        logger.error('Error searching diagnoses', err, 'api');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]); // Only depend on searchTerm - method is accessed via ref

  // Check if diagnosis name already exists in search results
  const diagnosisExists = searchResults.some(
    (diagnosis) => diagnosis.name?.toLowerCase().trim() === searchTerm.toLowerCase().trim()
  );

  const handleDiagnosisChange = (
    _event: any,
    newValue: DiagnosisSearchResult | string | null
  ) => {
    if (typeof newValue === 'string') {
      setSearchTerm(newValue);
      setSelectedDiagnosis(null);
    } else if (newValue && newValue.id) {
      handleDiagnosisSelect(newValue);
    } else {
      setSelectedDiagnosis(null);
    }
  };

  const handleCreateDiagnosis = async () => {
    if (!onCreateDiagnosis || !searchTerm.trim() || diagnosisExists) {
      return;
    }

    try {
      setIsCreatingDiagnosis(true);
      const newDiagnosis = await onCreateDiagnosis(searchTerm.trim());

      // Convert to DiagnosisCatalog format and add
      const diagnosisToAdd: DiagnosisCatalog = {
        id: newDiagnosis.id,
        code: newDiagnosis.code || '',
        name: newDiagnosis.name,
        is_active: newDiagnosis.is_active,
        created_by: newDiagnosis.created_by,
        created_at: newDiagnosis.created_at,
        updated_at: newDiagnosis.updated_at
      };

      onAddDiagnosis(diagnosisToAdd);
      setSelectedDiagnosis(null);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      logger.error('Error creating diagnosis', error, 'api');
    } finally {
      setIsCreatingDiagnosis(false);
    }
  };

  const handleDiagnosisSelect = useCallback((diagnosis: DiagnosisSearchResult) => {
    // Check if already selected (by code or by name if code is empty)
    const isAlreadySelected = diagnoses.some(d =>
      d.code === diagnosis.code ||
      (d.code === '' && d.name.toLowerCase().trim() === diagnosis.name.toLowerCase().trim())
    );
    if (isAlreadySelected) {
      setSelectedDiagnosis(null);
      setSearchTerm('');
      setSearchResults([]);
      return;
    }

    // Check max selections
    if (diagnoses.length >= maxSelections) {
      return;
    }

    // Convert to DiagnosisCatalog format
    const diagnosisToAdd: DiagnosisCatalog = {
      id: diagnosis.id,
      code: diagnosis.code || '',
      name: diagnosis.name,
      is_active: true,
      created_by: diagnosis.created_by || 0,  // 0 = system, doctor_id = doctor who created it
      created_at: (diagnosis as any).created_at || '',
      updated_at: (diagnosis as any).updated_at || ''
    };

    onAddDiagnosis(diagnosisToAdd);
    // Clear search immediately after adding diagnosis
    setSelectedDiagnosis(null);
    setSearchTerm('');
    setSearchResults([]);
  }, [diagnoses, maxSelections, onAddDiagnosis]);


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

      {/* Add Diagnosis - Inline Autocomplete with Save Button */}
      {showAddButton && diagnoses.length < maxSelections && (
        <Card sx={{ mb: 2, border: '1px dashed', borderColor: 'grey.300', backgroundColor: '#fafafa' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Autocomplete
                  freeSolo
                  options={searchResults}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      return option;
                    }
                    return option.code ? `${option.code} - ${option.name}` : option.name;
                  }}
                  loading={searchLoading}
                  value={selectedDiagnosis}
                  onChange={handleDiagnosisChange}
                  onInputChange={(event, newInputValue) => {
                    setSearchTerm(newInputValue);
                    // Clear selected diagnosis when user types
                    if (newInputValue !== searchTerm) {
                      setSelectedDiagnosis(null);
                    }
                  }}
                  inputValue={searchTerm}
                  filterOptions={(x) => x} // Disable default filtering, we do it server-side
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar diagnóstico (CIE-10)..."
                      size="small"
                      fullWidth
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
                    if (typeof option === 'string') {
                      return null;
                    }
                    return (
                      <Box component="li" key={option.id} {...otherProps}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {option.code ? `${option.code} - ${option.name}` : option.name}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                />
              </Box>
              {onCreateDiagnosis && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleCreateDiagnosis}
                  disabled={
                    isCreatingDiagnosis ||
                    !searchTerm.trim() ||
                    diagnosisExists ||
                    !onCreateDiagnosis
                  }
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap', minHeight: 40 }}
                >
                  {isCreatingDiagnosis ? 'Guardando...' : 'Guardar'}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Diagnoses List */}
      {diagnoses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No se han registrado diagnósticos. Busca y agrega un diagnóstico usando el campo de búsqueda arriba.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {diagnoses.map((diagnosis) => {
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={String(diagnosis.id)}>
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
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
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
