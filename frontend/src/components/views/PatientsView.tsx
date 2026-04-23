import React, { memo, useCallback, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
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
  Fade,
  Skeleton
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { Patient, Consultation } from '../../types';
import { calculateAge } from '../../utils';
import { parseDateOnly } from '../../utils/dateHelpers';
import { formatGenderLabel, normalizeGenderCode } from '../../utils/gender';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useMemoizedSearch } from '../../hooks/useMemoizedSearch';
import { IntelligentSearch, useIntelligentSearch } from '../common/IntelligentSearch';
import { SmartLoadingState } from '../common/SmartLoadingState';
import PatientFiltersDialog, { PatientFilters } from '../dialogs/PatientFiltersDialog';

interface PatientsViewProps {
  patients: Patient[];
  consultations: Consultation[];
  patientSearchTerm: string;
  setPatientSearchTerm: (term: string) => void;
  successMessage: string;
  setSuccessMessage: (message: string) => void;
  handleNewPatient: () => void;
  handleEditPatient: (patient: Patient) => void;
  isLoading?: boolean;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  consultations,
  patientSearchTerm,
  setPatientSearchTerm,
  successMessage,
  setSuccessMessage,
  handleNewPatient,
  handleEditPatient,
  isLoading = false
}) => {
  const patientConsultationSummary = useMemo(() => {
    const summary = new Map<number, { lastTimestamp: number; reason: string }>();
    if (!Array.isArray(consultations)) {
      return summary;
    }

    consultations.forEach((consultation) => {
      const rawPatientId = (consultation as any)?.patient_id;
      const patientId = Number(rawPatientId);
      if (!patientId) {
        return;
      }

      const dateSource = consultation?.date || (consultation as any)?.created_at;
      if (!dateSource) {
        return;
      }

      const timestamp = new Date(dateSource).getTime();
      if (Number.isNaN(timestamp)) {
        return;
      }

      const previous = summary.get(patientId);
      if (!previous || timestamp > previous.lastTimestamp) {
        summary.set(patientId, {
          lastTimestamp: timestamp,
          reason: consultation?.chief_complaint || 'No especificado'
        });
      }
    });

    return summary;
  }, [consultations]);

  const getLatestConsultationReason = useCallback((patientId: number): string => {
    const record = patientConsultationSummary.get(Number(patientId));
    return record?.reason || 'Sin consultas';
  }, [patientConsultationSummary]);

  const getFormattedLastVisit = useCallback((patientId: number): string | null => {
    const record = patientConsultationSummary.get(Number(patientId));
    if (!record?.lastTimestamp) {
      return null;
    }

    const date = new Date(record.lastTimestamp);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  }, [patientConsultationSummary]);

  // Estado para filtros
  const [filters, setFilters] = useState<PatientFilters>({
    status: 'all',
    gender: 'all',
    createdFrom: undefined,
    createdTo: undefined
  });
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);

  // Aplicar búsqueda y filtros
  const filteredPatients = useMemo(() => {
    let filtered = patients || [];

    // Aplicar búsqueda por texto
    if (patientSearchTerm && patientSearchTerm.trim()) {
      const searchTerm = patientSearchTerm.trim().toLowerCase();
      const normalizedSearchTerm = searchTerm
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove accents

      filtered = filtered.filter((patient: any) => {
        const searchableFields = [
          patient.name,
          patient.full_name, // Mapped field from backend
          patient.primary_phone,
          patient.email,
          patient.id?.toString()
        ].filter(Boolean);

        return searchableFields.some(field => {
          const fieldStr = String(field).toLowerCase();
          const normalizedField = fieldStr
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          return normalizedField.includes(normalizedSearchTerm);
        });
      });
    }

    // Aplicar filtro de estado
    if (filters.status !== 'all') {
      filtered = filtered.filter((patient: any) => {
        const isActive = (patient as any).is_active !== false;
        return filters.status === 'active' ? isActive : !isActive;
      });
    }

    // Aplicar filtro de género (normaliza ambos lados para tolerar filas legacy
    // con valores mixtos hasta que la migración de datos corra).
    if (filters.gender !== 'all') {
      filtered = filtered.filter((patient: any) => normalizeGenderCode(patient.gender) === filters.gender);
    }

    // Aplicar filtro de fecha de creación. createdFrom/createdTo llegan como
    // "YYYY-MM-DD" — hay que interpretarlas como fechas locales, no UTC, para que
    // el rango cubra el día calendario seleccionado en CDMX.
    if (filters.createdFrom) {
      filtered = filtered.filter((patient: any) => {
        if (!patient.created_at) return false;
        const createdDate = new Date(patient.created_at);
        const fromDate = parseDateOnly(filters.createdFrom!);
        if (!fromDate) return true;
        fromDate.setHours(0, 0, 0, 0);
        return createdDate >= fromDate;
      });
    }

    if (filters.createdTo) {
      filtered = filtered.filter((patient: any) => {
        if (!patient.created_at) return false;
        const createdDate = new Date(patient.created_at);
        const toDate = parseDateOnly(filters.createdTo!);
        if (!toDate) return true;
        toDate.setHours(23, 59, 59, 999);
        return createdDate <= toDate;
      });
    }

    return filtered;
  }, [patients, patientSearchTerm, filters]);

  const handleFiltersChange = (newFilters: PatientFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      gender: 'all',
      createdFrom: undefined,
      createdTo: undefined
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.gender !== 'all' ||
    filters.createdFrom ||
    filters.createdTo;

  type SortField = 'name' | 'lastVisit';
  type SortDir = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', 'es');
      } else {
        const ta = patientConsultationSummary.get(Number(a.id))?.lastTimestamp ?? 0;
        const tb = patientConsultationSummary.get(Number(b.id))?.lastTimestamp ?? 0;
        cmp = ta - tb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredPatients, sortField, sortDir, patientConsultationSummary]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header - EXACTAMENTE como AgendaView.tsx */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          <PeopleIcon sx={{ color: 'text.primary' }} />
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
          <IconButton aria-label="Cerrar" 
            size="small" 
            onClick={() => setSuccessMessage('')}
            sx={{ color: '#155724' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar por nombre, teléfono, email, CURP..."
            value={patientSearchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPatientSearchTerm(e.target.value);
              // Track search
              if (e.target.value.trim().length > 0) {
                const { AmplitudeService } = require('../../services/analytics/AmplitudeService');
                AmplitudeService.track('patient_search_performed', {
                  search_length: e.target.value.length,
                  has_results: true // Will be updated when results are filtered
                });
              }
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button 
            variant="outlined" 
            startIcon={<FilterIcon />}
            onClick={() => setFiltersDialogOpen(true)}
            color={hasActiveFilters ? 'primary' : 'inherit'}
          >
            Filtros
            {hasActiveFilters && (
              <Chip
                label=""
                size="small"
                sx={{
                  ml: 1,
                  height: 20,
                  minWidth: 20,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              />
            )}
          </Button>
        </Box>
      </Paper>

      {/* Patients Table */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {isLoading
            ? 'Cargando pacientes…'
            : (patientSearchTerm || hasActiveFilters)
              ? `${filteredPatients.length} de ${patients.length} pacientes`
              : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} en total`}
        </Typography>
      </Box>
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => handleSort('name')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Paciente
                    {sortField === 'name' && (sortDir === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />)}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contacto</TableCell>
                <TableCell
                  sx={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => handleSort('lastVisit')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Última Visita
                    {sortField === 'lastVisit' && (sortDir === 'asc' ? <ArrowUpwardIcon sx={{ fontSize: 16 }} /> : <ArrowDownwardIcon sx={{ fontSize: 16 }} />)}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Motivo de la consulta</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && patients.length === 0 && (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box>
                          <Skeleton variant="text" width={160} />
                          <Skeleton variant="text" width={60} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={140} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 1 }} /></TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && sortedPatients.map((patient) => {
                const lastVisit = getFormattedLastVisit(patient.id);
                const latestReason = getLatestConsultationReason(patient.id);

                return (
                  <TableRow 
                    key={patient.id}
                    hover
                    onClick={() => handleEditPatient(patient)}
                    sx={{ cursor: 'pointer' }}
                  >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {patient.name?.split(' ').slice(0, 2).map(n => n[0]).join('') || 'P'}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {patient.name}
                          {(() => {
                            const age = calculateAge(patient.birth_date);
                            return age !== null ? ` (${age})` : '';
                          })()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatGenderLabel(patient.gender, '')}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{patient.primary_phone}</Typography>
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
                    {lastVisit ? (
                      <Typography variant="body2">
                        {lastVisit}
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
                      title={latestReason}
                    >
                      {latestReason}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={(patient as any).is_active !== false ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={(patient as any).is_active !== false ? 'success' : 'default'}
                    />
                  </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && sortedPatients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {patientSearchTerm || hasActiveFilters
                        ? 'No se encontraron pacientes que coincidan con los criterios de búsqueda'
                        : 'Aún no tienes pacientes registrados'}
                    </Typography>
                    {(patientSearchTerm || hasActiveFilters) ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setPatientSearchTerm('');
                          handleClearFilters();
                        }}
                        sx={{ mt: 2 }}
                      >
                        Limpiar búsqueda y filtros
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={handleNewPatient}
                        sx={{ mt: 2 }}
                      >
                        Agregar primer paciente
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Filtros Dialog */}
      <PatientFiltersDialog
        open={filtersDialogOpen}
        onClose={() => setFiltersDialogOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />
    </Box>
  );
};

export default memo(PatientsView);