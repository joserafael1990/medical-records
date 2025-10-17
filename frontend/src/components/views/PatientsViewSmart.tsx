import React, { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Fade
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { Patient, Consultation } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { IntelligentSearch, useIntelligentSearch } from '../common/IntelligentSearch';
import { SmartTable } from '../common/SmartTable';
import { useMedicalTableColumns } from '../../hooks/useMedicalTableColumns';
import { normalizeText } from '../../utils';

interface PatientsViewSmartProps {
  patients: Patient[];
  consultations: Consultation[];
  successMessage: string;
  setSuccessMessage: (message: string) => void;
  handleNewPatient: () => void;
  handleEditPatient: (patient: Patient) => void;
  isLoading?: boolean;
}

/**
 * Vista mejorada de pacientes usando SmartTable con ordenamiento inteligente
 */
const PatientsViewSmart: React.FC<PatientsViewSmartProps> = ({
  patients,
  consultations,
  successMessage,
  setSuccessMessage,
  handleNewPatient,
  handleEditPatient,
  isLoading = false
}) => {
  // Hook de búsqueda inteligente
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    filters,
    addFilter,
    removeFilter,
    clearAllFilters
  } = useIntelligentSearch();

  // Configuración de columnas
  const { patientColumns } = useMedicalTableColumns();

  // Filtrado de pacientes con búsqueda inteligente
  const filteredPatients = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return patients;

    const normalizedSearchTerm = normalizeText(debouncedSearchTerm);
    return patients.filter(patient => {
      const searchableFields = [
        patient.full_name,
        patient.first_name,
        patient.paternal_surname,
        patient.maternal_surname,
        patient.primary_phone,
        patient.email,
        patient.id,
        patient.address
      ].filter(Boolean);

      return searchableFields.some(field => 
        normalizeText(field?.toString() || '').includes(normalizedSearchTerm)
      );
    });
  }, [patients, debouncedSearchTerm]);

  // Enriquecer datos de pacientes con información de consultas
  const enrichedPatients = useMemo(() => {
    return filteredPatients.map(patient => {
      const patientConsultations = consultations.filter(
        consultation => Number(consultation.patient_id) === Number(patient.id)
      );
      
      return {
        ...patient,
        total_visits: patientConsultations.length,
        last_visit: patientConsultations.length > 0 
          ? Math.max(...patientConsultations.map(c => new Date(c.date).getTime()))
          : null
      };
    });
  }, [filteredPatients, consultations]);

  // Filtros disponibles
  const availableFilters = [
    { key: 'active', label: 'Solo Activos', value: 'Activo', color: 'success' as const },
    { key: 'new', label: 'Nuevos Pacientes', value: 'nuevo', color: 'info' as const },
    { key: 'frequent', label: 'Consultas Frecuentes', value: '5+', color: 'primary' as const }
  ];

  const handleFilterClick = () => {
    // Agregar filtro dinámico basado en el estado actual
    if (enrichedPatients.length > 0) {
      const totalActive = enrichedPatients.filter(p => p.is_active).length;
      addFilter({
        key: 'active_count',
        label: 'Pacientes Activos',
        value: `${totalActive} activos`,
        color: 'success'
      });
    }
  };

  const handleRowClick = (patient: Patient) => {
    handleEditPatient(patient);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            👥 Gestión de Pacientes
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {enrichedPatients.length} pacientes encontrados
            {searchTerm && ` para "${searchTerm}"`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleNewPatient}
          sx={{ 
            borderRadius: 2,
            px: 3,
            boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
          }}
        >
          Nuevo Paciente
        </Button>
      </Box>

      {/* Mensaje de éxito */}
      {successMessage && (
        <Fade in={!!successMessage}>
          <Box sx={{ mb: 3 }}>
            <ErrorRibbon 
              message={successMessage} 
              severity="info" 
              onClose={() => setSuccessMessage('')}
            />
          </Box>
        </Fade>
      )}

      {/* Panel de Búsqueda y Filtros */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Búsqueda Inteligente
        </Typography>
        
        <IntelligentSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Buscar por nombre, teléfono, email, ID..."
          filters={filters}
          onFilterRemove={removeFilter}
          onFilterClick={handleFilterClick}
          showFilterButton={true}
          isLoading={isLoading}
        />

        {/* Filtros rápidos */}
        {filters.length === 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
              Filtros rápidos:
            </Typography>
            {availableFilters.map((filter) => (
              <Button
                key={filter.key}
                size="small"
                variant="outlined"
                onClick={() => addFilter(filter)}
                sx={{ borderRadius: 1 }}
              >
                {filter.label}
              </Button>
            ))}
          </Box>
        )}
      </Paper>

      {/* Tabla Inteligente */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <SmartTable
          data={enrichedPatients as unknown as Patient[]}
          columns={patientColumns}
          isLoading={isLoading}
          emptyMessage={
            searchTerm 
              ? `No se encontraron pacientes que coincidan con "${searchTerm}"`
              : "No hay pacientes registrados. ¡Agrega el primer paciente!"
          }
          enableSorting={true}
          hover={true}
          onRowClick={handleRowClick}
          maxHeight={600}
          sx={{
            '& .MuiTableCell-head': {
              backgroundColor: '#f8fafc',
              borderBottom: '2px solid #e2e8f0'
            }
          }}
        />
      </Paper>

      {/* Estadísticas Rápidas */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2, bgcolor: 'primary.50' }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
          Estadísticas Rápidas
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {enrichedPatients.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de Pacientes
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
              {enrichedPatients.filter(p => p.is_active).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pacientes Activos
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
              {enrichedPatients.filter(p => (p.total_visits || 0) >= 5).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pacientes Frecuentes (5+ consultas)
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
              {enrichedPatients.filter(p => (p.total_visits || 0) === 0).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sin Consultas
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default memo(PatientsViewSmart);
