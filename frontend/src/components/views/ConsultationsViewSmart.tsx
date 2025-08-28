import React, { memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Fade
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';
import { Patient, Consultation } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { IntelligentSearch, useIntelligentSearch } from '../common/IntelligentSearch';
import { SmartTable } from '../common/SmartTable';
import { useMedicalTableColumns } from '../../hooks/useMedicalTableColumns';

interface ConsultationsViewSmartProps {
  consultations: Consultation[];
  patients: Patient[];
  successMessage: string;
  setSuccessMessage: (message: string) => void;
  handleNewConsultation: () => void;
  handleEditConsultation: (consultation: Consultation) => void;
  isLoading?: boolean;
}

/**
 * Vista mejorada de consultas usando SmartTable con ordenamiento inteligente
 */
const ConsultationsViewSmart: React.FC<ConsultationsViewSmartProps> = ({
  consultations,
  patients,
  successMessage,
  setSuccessMessage,
  handleNewConsultation,
  handleEditConsultation,
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
  const { consultationColumns } = useMedicalTableColumns();

  // Filtrado de consultas con búsqueda inteligente
  const filteredConsultations = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return consultations;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return consultations.filter(consultation => {
      // Buscar información del paciente asociado
      const patient = patients.find(p => p.id === consultation.patient_id);
      
      const searchableFields = [
        consultation.id,
        consultation.chief_complaint,
        consultation.primary_diagnosis,
        consultation.treatment_plan,
        consultation.prognosis,
        patient?.full_name,
        patient?.first_name,
        patient?.paternal_surname,
        patient?.maternal_surname,
        patient?.phone,
        patient?.email
      ].filter(Boolean);

      return searchableFields.some(field => 
        field?.toString().toLowerCase().includes(searchLower)
      );
    });
  }, [consultations, patients, debouncedSearchTerm]);

  // Enriquecer datos de consultas con información de pacientes
  const enrichedConsultations = useMemo(() => {
    return filteredConsultations.map(consultation => {
      const patient = patients.find(p => p.id === consultation.patient_id);
      
      return {
        ...consultation,
        patient_name: patient?.full_name || 'Paciente No Identificado',
        patient_phone: patient?.phone,
        patient_email: patient?.email,
        patient_age: patient?.age,
        status: 'Programada'
      };
    });
  }, [filteredConsultations, patients]);

  // Filtros disponibles
  const availableFilters = [
    { key: 'today', label: 'Hoy', value: 'hoy', color: 'primary' as const },
    { key: 'pending', label: 'Pendientes', value: 'Programada', color: 'warning' as const },
    { key: 'completed', label: 'Completadas', value: 'Completada', color: 'success' as const },
    { key: 'urgent', label: 'Urgentes', value: 'urgente', color: 'error' as const }
  ];

  // Estadísticas
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayConsultations = consultations.filter(c => 
      new Date(c.date).toDateString() === today
    );
    
    return {
      total: consultations.length,
      today: todayConsultations.length,
      pending: consultations.length, // Todas consideradas pendientes por defecto
      completed: 0 // No hay campo status en el modelo actual
    };
  }, [consultations]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Error Message */}
      {successMessage && (
        <ErrorRibbon
          message={successMessage}
          severity="success"
          onClose={() => setSuccessMessage('')}
          sx={{ mb: 3 }}
        />
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Consultas Médicas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona las consultas médicas de manera inteligente
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewConsultation}
          sx={{ 
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none'
          }}
        >
          Nueva Consulta
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { label: 'Total Consultas', value: stats.total, color: 'primary' },
          { label: 'Hoy', value: stats.today, color: 'info' },
          { label: 'Pendientes', value: stats.pending, color: 'warning' },
          { label: 'Completadas', value: stats.completed, color: 'success' }
        ].map((stat, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: `${stat.color}.main` }}>
              {stat.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stat.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
        <IntelligentSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Buscar consultas por paciente, motivo, diagnóstico..."
          filters={filters}
          onFilterRemove={removeFilter}
        />
      </Paper>

      {/* Smart Table */}
      <Fade in={true} timeout={800}>
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          <SmartTable
            data={enrichedConsultations}
            columns={consultationColumns}
            onRowClick={handleEditConsultation}
            isLoading={isLoading}
            emptyMessage="No se encontraron consultas"
          />
        </Paper>
      </Fade>
    </Box>
  );
};

export default memo(ConsultationsViewSmart);
