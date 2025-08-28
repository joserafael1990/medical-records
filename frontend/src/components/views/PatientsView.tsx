import React, { memo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Pagination
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { Patient, Consultation } from '../../types';
import { calculateAge } from '../../utils';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useMemoizedSearch } from '../../hooks/useMemoizedSearch';
import { useAdvancedSearch, SearchFilters } from '../../hooks/useAdvancedSearch';
import { SearchService, SearchablePatient } from '../../services/searchService';
import AdvancedSearchBar from '../common/AdvancedSearchBar';

interface PatientsViewProps {
  patients: Patient[];
  consultations: Consultation[];
  patientSearchTerm: string;
  setPatientSearchTerm: (term: string) => void;
  successMessage: string;
  setSuccessMessage: (message: string) => void;
  handleNewPatient: () => void;
  handleEditPatient: (patient: Patient) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  consultations,
  patientSearchTerm,
  setPatientSearchTerm,
  successMessage,
  setSuccessMessage,
  handleNewPatient,
  handleEditPatient
}) => {
  // Advanced search setup
  const searchFunction = useCallback(async (query: string, filters: SearchFilters, page: number) => {
    return SearchService.searchPatients(query, filters, page, 10);
  }, []);

  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    results,
    currentPage,
    setCurrentPage,
    clearSearch,
    recentSearches
  } = useAdvancedSearch<SearchablePatient>({
    searchFn: searchFunction,
    debounceMs: 300
  });

  // Helper function to get the latest consultation reason for a patient
  const getLatestConsultationReason = (patientId: string): string => {
    const patientConsultations = consultations.filter(c => c.patient_id === patientId);
    if (patientConsultations.length === 0) return 'Sin consultas';
    
    // Sort by date (most recent first)
    const sortedConsultations = patientConsultations.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sortedConsultations[0].chief_complaint || 'No especificado';
  };

  // Use advanced search results when searching, otherwise use all patients
  const displayPatients = searchQuery ? results.items : patients;
  const isSearching = searchQuery.length > 0;
  return (
    <Box>
      {/* Patient Management Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Gestión de Pacientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleNewPatient}
          size="large"
        >
          Nuevo Paciente
        </Button>
      </Box>

      {/* Success Message Ribbon */}
      {successMessage && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon sx={{ color: '#155724' }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {successMessage}
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            onClick={() => setSuccessMessage('')}
            sx={{ color: '#155724' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Advanced Search Bar */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <AdvancedSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          placeholder="Buscar por nombre, teléfono, email, CURP..."
          filters={filters}
          onFiltersChange={setFilters}
          recentSearches={recentSearches}
          onRecentSearchClick={setSearchQuery}
          isLoading={results.isLoading}
          showFilters={true}
          resultCount={results.total}
        />
        
        {/* Search Summary */}
        {isSearching && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            {results.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Buscando...
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {results.total > 0 
                  ? `${results.total} paciente${results.total !== 1 ? 's' : ''} encontrado${results.total !== 1 ? 's' : ''}`
                  : 'No se encontraron pacientes'
                }
              </Typography>
            )}
          </Box>
        )}

        {results.hasError && (
          <Box sx={{ mt: 2 }}>
            <ErrorRibbon 
              message={results.errorMessage || 'Error en la búsqueda'} 
              onClose={() => {}} 
            />
          </Box>
        )}
      </Paper>

      {/* Patients Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contacto</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Última Visita</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Motivo de la consulta</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayPatients && Array.isArray(displayPatients) && displayPatients.map((patient) => (
                <TableRow 
                  key={patient.id} 
                  hover
                  onClick={() => handleEditPatient(patient)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {patient.first_name[0]}{patient.paternal_surname[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {patient.full_name} ({calculateAge(patient.birth_date)})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {patient.gender}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{patient.phone}</Typography>
                      </Box>
                      {patient.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{patient.email}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {patient.last_visit ? (
                      <Typography variant="body2">
                        {new Date(patient.last_visit).toLocaleDateString('es-MX')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sin visitas
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={getLatestConsultationReason(patient.id)}
                    >
                      {getLatestConsultationReason(patient.id)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={patient.status === 'active' ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={patient.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!displayPatients || !Array.isArray(displayPatients) || displayPatients.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {isSearching ? 'No se encontraron pacientes con los criterios de búsqueda' : 'No hay pacientes registrados'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination for search results */}
        {isSearching && results.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={results.totalPages}
              page={currentPage}
              onChange={(event, page) => setCurrentPage(page)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default memo(PatientsView);
