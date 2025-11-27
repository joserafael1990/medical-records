import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Add as AddIcon,
  LocalHospital as HospitalIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { formatDateTimeShort } from '../../utils/dateHelpers';
import { SmartTable, TableColumn } from '../common/SmartTable';
import { useDebounce } from '../../hooks/useDebounce';
import { normalizeText } from '../../utils';

interface ConsultationsViewSmartProps {
  consultations?: any[];
  patients?: any[];
  appointments?: any[];
  successMessage?: string;
  setSuccessMessage?: (message: string) => void;
  handleNewConsultation?: () => void;
  handleEditConsultation?: (consultation: any) => void;
}

const ConsultationsViewSmart: React.FC<ConsultationsViewSmartProps> = ({
  consultations = [],
  patients = [],
  appointments = [],
  successMessage,
  setSuccessMessage,
  handleNewConsultation,
  handleEditConsultation
}) => {
  // Estados para filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  
  // Debounce para la búsqueda
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Track search
  React.useEffect(() => {
    if (debouncedSearchTerm.trim().length > 0) {
      const { AmplitudeService } = require('../../services/analytics/AmplitudeService');
      AmplitudeService.track('consultation_search_performed', {
        search_length: debouncedSearchTerm.length
      });
    }
  }, [debouncedSearchTerm]);

  // Effect to detect URL parameters and apply patient filter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const patientIdFromUrl = urlParams.get('patientId');
    const patientNameFromUrl = urlParams.get('patientName');
    
    if (patientIdFromUrl && patientNameFromUrl) {
      setSelectedPatient(patientIdFromUrl);
      setSearchTerm(decodeURIComponent(patientNameFromUrl));
    }
  }, []);

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'primera-vez':
      case 'Primera vez':
      case 'first_visit':
        return 'Primera vez';
      case 'seguimiento':
      case 'Seguimiento':
      case 'follow_up':
        return 'Seguimiento';
      case 'urgencia':
        return 'Urgencia';
      default:
        return type || 'Seguimiento';
    }
  };

  const getConsultationTypeColor = (type: string) => {
    switch (type) {
      case 'primera-vez':
      case 'Primera vez':
      case 'first_visit':
        return 'primary';
      case 'seguimiento':
      case 'Seguimiento':
      case 'follow_up':
        return 'success';
      case 'urgencia':
        return 'error';
      default:
        return 'default';
    }
  };

  // Configuración de columnas para SmartTable
  const consultationColumns: TableColumn<any>[] = [
    {
      key: 'patient_name',
      label: 'Paciente',
      sortable: true,
      width: '30%',
      render: (value: any, consultation: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="action" />
          <Box>
            <Typography variant="subtitle2">
              {consultation.patient_name || 'Paciente no encontrado'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {consultation.patient_id}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'date',
      label: 'Fecha',
      sortable: true,
      width: '25%',
      render: (value: any) => (
        <Typography variant="body2">
          {value ? formatDateTimeShort(value) : 'N/A'}
        </Typography>
      )
    },
    {
      key: 'consultation_type',
      label: 'Tipo',
      sortable: true,
      width: '20%',
      render: (value: any) => (
        <Chip
          label={getConsultationTypeLabel(value || 'seguimiento')}
          color={getConsultationTypeColor(value || 'seguimiento') as any}
          size="small"
        />
      )
    },
    {
      key: 'primary_diagnosis',
      label: 'Diagnóstico',
      sortable: false,
      width: '25%',
      render: (value: any) => (
        <Typography 
          variant="body2" 
          sx={{ 
            maxWidth: 200, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={value || 'Sin diagnóstico registrado'}
        >
          {value || 'Sin diagnóstico registrado'}
        </Typography>
      )
    }
  ];

  // Filtrado completo de consultas
  const filteredConsultations = useMemo(() => {
    let filtered = [...consultations];

    // Filtro por término de búsqueda
    if (debouncedSearchTerm.trim()) {
      const normalizedSearchTerm = normalizeText(debouncedSearchTerm);
      filtered = filtered.filter(consultation => {
        const searchableFields = [
          consultation.patient_name,
          consultation.primary_diagnosis,
          consultation.chief_complaint,
          consultation.consultation_type,
          consultation.patient_id?.toString(),
          consultation.history_present_illness,
          consultation.treatment_plan
        ].filter(Boolean);

        return searchableFields.some(field => 
          normalizeText(field?.toString() || '').includes(normalizedSearchTerm)
        );
      });
    }

    // Filtro por rango de fechas
    if (dateFrom) {
      filtered = filtered.filter(consultation => 
        new Date(consultation.date) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(consultation => 
        new Date(consultation.date) <= new Date(dateTo)
      );
    }

    // Filtro por tipo de consulta
    if (consultationType) {
      filtered = filtered.filter(consultation => 
        consultation.consultation_type === consultationType
      );
    }

    // Filtro por paciente
    if (selectedPatient) {
      filtered = filtered.filter(consultation => 
        consultation.patient_id === parseInt(selectedPatient)
      );
    }

    return filtered;
  }, [consultations, debouncedSearchTerm, dateFrom, dateTo, consultationType, selectedPatient]);

  const totalConsultations = consultations.length;

  const consultationsToday = useMemo(() => {
    const todayString = new Date().toDateString();

    return consultations.filter(consultation => {
      const consultationDateValue = consultation.date || consultation.consultation_date;

      if (!consultationDateValue) {
        return false;
      }

      const consultationDate = new Date(consultationDateValue);

      if (Number.isNaN(consultationDate.getTime())) {
        return false;
      }

      return consultationDate.toDateString() === todayString;
    }).length;
  }, [consultations]);

  const { scheduledAppointmentsCount, confirmedAppointmentsCount } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { scheduled, confirmed } = appointments.reduce(
      (acc, appointment) => {
        const appointmentDateValue = appointment.appointment_date || appointment.date_time;

        if (!appointmentDateValue) {
          return acc;
        }

        const appointmentDate = new Date(appointmentDateValue);

        if (Number.isNaN(appointmentDate.getTime()) || appointmentDate < startOfToday) {
          return acc;
        }

        if (appointment.status === 'confirmada' || appointment.status === 'por_confirmar') {
          acc.scheduled += 1;

          if (appointment.status === 'confirmada') {
            acc.confirmed += 1;
          }
        }

        return acc;
      },
      { scheduled: 0, confirmed: 0 }
    );

    return {
      scheduledAppointmentsCount: scheduled,
      confirmedAppointmentsCount: confirmed
    };
  }, [appointments]);

  // Handle row click to edit consultation
  const handleRowClick = (consultation: any) => {
    handleEditConsultation?.(consultation);
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setConsultationType('');
    setSelectedPatient('');
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm || dateFrom || dateTo || consultationType || selectedPatient;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header - Responsive */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          <HospitalIcon />
          Consultas Médicas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewConsultation}
          sx={{ 
            borderRadius: 2,
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          Nueva Consulta
        </Button>
      </Box>

      {/* Statistics Cards - Responsive */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ boxShadow: 1, height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Consultas hoy
              </Typography>
              <Typography variant="h3" color="primary">
                {consultationsToday}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ boxShadow: 1, height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Citas programadas
              </Typography>
              <Typography variant="h3" color="info.main">
                {scheduledAppointmentsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <Card sx={{ boxShadow: 1, height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Citas confirmadas
              </Typography>
              <Typography variant="h3" color="success.main">
                {confirmedAppointmentsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros de Búsqueda */}
      <Card sx={{ boxShadow: 1, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon color="primary" />
            <Typography variant="h6">
              Filtros de Búsqueda
            </Typography>
            {hasActiveFilters && (
              <Chip
                label="Filtros activos"
                color="primary"
                size="small"
                onDelete={clearFilters}
                deleteIcon={<ClearIcon />}
              />
            )}
      </Box>

          {/* Filtros en diseño responsive mejorado */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            flexWrap: 'wrap',
            alignItems: { xs: 'stretch', sm: 'flex-end' }
          }}>
            {/* Búsqueda general - Ocupa todo el ancho en móvil */}
            <Box sx={{ 
              flex: { xs: '1 1 100%', sm: '1 1 300px', md: '1 1 250px' },
              minWidth: { xs: '100%', sm: '200px' }
            }}>
              <TextField
                fullWidth
                label="Buscar consultas"
                placeholder="Paciente, diagnóstico, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchTerm('')}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                size="small"
              />
            </Box>

            {/* Filtros secundarios en fila responsive */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              flexWrap: 'wrap',
              flex: { xs: '1 1 100%', sm: '0 0 auto' },
              minWidth: { xs: '100%', sm: 'auto' }
            }}>
              {/* Filtro por paciente */}
              <Box sx={{ 
                flex: { xs: '1 1 100%', sm: '0 0 120px', md: '0 0 140px' },
                minWidth: { xs: '100%', sm: '120px' }
              }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' } }}>
                    Paciente
                  </InputLabel>
                  <Select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    label="Paciente"
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' } }}
                  >
                    <MenuItem value="">
                      <em>Todos</em>
                    </MenuItem>
                    {patients.map((patient) => (
                      <MenuItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.paternal_surname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Filtro por tipo de consulta */}
              <Box sx={{ 
                flex: { xs: '1 1 100%', sm: '0 0 100px', md: '0 0 120px' },
                minWidth: { xs: '100%', sm: '100px' }
              }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' } }}>
                    Tipo
                  </InputLabel>
                  <Select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value)}
                    label="Tipo"
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.75rem' } }}
                  >
                    <MenuItem value="">
                      <em>Todos</em>
                    </MenuItem>
                    <MenuItem value="primera-vez">Primera vez</MenuItem>
                    <MenuItem value="seguimiento">Seguimiento</MenuItem>
                    <MenuItem value="urgencia">Urgencia</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Filtro por fecha desde */}
              <Box sx={{ 
                flex: { xs: '1 1 100%', sm: '0 0 120px', md: '0 0 130px' },
                minWidth: { xs: '100%', sm: '120px' }
              }}>
                <TextField
                  fullWidth
                  label="Desde"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ 
                    shrink: true,
                    sx: { fontSize: { xs: '0.875rem', sm: '0.75rem' } }
                  }}
                  size="small"
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      fontSize: { xs: '0.875rem', sm: '0.75rem' } 
                    }
                  }}
                />
              </Box>

              {/* Filtro por fecha hasta */}
              <Box sx={{ 
                flex: { xs: '1 1 100%', sm: '0 0 120px', md: '0 0 130px' },
                minWidth: { xs: '100%', sm: '120px' }
              }}>
                <TextField
                  fullWidth
                  label="Hasta"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ 
                    shrink: true,
                    sx: { fontSize: { xs: '0.875rem', sm: '0.75rem' } }
                  }}
                  size="small"
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      fontSize: { xs: '0.875rem', sm: '0.75rem' } 
                    }
                  }}
                />
              </Box>

              {/* Botón limpiar filtros */}
              <Box sx={{ 
                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                minWidth: { xs: '100%', sm: 'auto' },
                display: 'flex',
                justifyContent: { xs: 'center', sm: 'flex-end' }
              }}>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  size="small"
                  sx={{
                    minWidth: { xs: '100%', sm: '120px' },
                    fontSize: { xs: '0.875rem', sm: '0.75rem' },
                    maxWidth: { xs: '100%', sm: '200px' }
                  }}
                >
                  Limpiar Filtros
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Consultations Smart Table */}
      <Card sx={{ boxShadow: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
            Historial de Consultas
          </Typography>
            {hasActiveFilters && (
              <Typography variant="body2" color="text.secondary">
                Mostrando {filteredConsultations.length} de {totalConsultations} consultas
              </Typography>
            )}
          </Box>
          
          {consultations.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {consultations === null || consultations === undefined 
                  ? 'Cargando consultas...' 
                  : 'No hay consultas registradas'}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleNewConsultation}
                sx={{ mt: 2 }}
              >
                Registrar Primera Consulta
              </Button>
            </Paper>
          ) : filteredConsultations.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="body1" color="text.secondary">
                No se encontraron consultas que coincidan con los filtros aplicados
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={{ mt: 2 }}
              >
                Limpiar Filtros
              </Button>
            </Paper>
          ) : (
            <SmartTable
              data={filteredConsultations}
              columns={consultationColumns}
              onRowClick={handleRowClick}
              emptyMessage="No se encontraron consultas que coincidan con los criterios de búsqueda"
              enableSorting={true}
              hover={true}
              stickyHeader={true}
              maxHeight={600}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConsultationsViewSmart;
