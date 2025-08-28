import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Slider
} from '@mui/material';
import {
  Table as TableIcon,
  Sort as SortIcon,
  ViewList as ViewIcon
} from '@mui/icons-material';
import { SmartTable, useSmartTable } from '../common/SmartTable';
import { useMedicalTableColumns } from '../../hooks/useMedicalTableColumns';
import { IntelligentSearch, useIntelligentSearch } from '../common/IntelligentSearch';
import { Patient, Consultation } from '../../types';

// Datos de ejemplo
const mockPatients: Patient[] = [
  {
    id: 'PAT001',
    first_name: 'María',
    paternal_surname: 'González',
    maternal_surname: 'López',
    full_name: 'María González López',
    birth_date: '1985-03-15',
    age: 39,
    gender: 'Femenino',
    phone: '555-0123',
    email: 'maria.gonzalez@email.com',
    address: 'Av. Principal 123',
    blood_type: 'O+',
    total_visits: 8,
    status: 'Activo',
    emergency_contact_name: 'Juan González',
    emergency_contact_phone: '555-0124',
    allergies: 'Ninguna',
    current_medications: 'Ninguna',
    created_at: '2023-01-15'
  },
  {
    id: 'PAT002',
    first_name: 'Carlos',
    paternal_surname: 'Rodríguez',
    maternal_surname: 'Martínez',
    full_name: 'Carlos Rodríguez Martínez',
    birth_date: '1972-08-20',
    age: 52,
    gender: 'Masculino',
    phone: '555-0456',
    email: 'carlos.rodriguez@email.com',
    address: 'Calle Secundaria 456',
    blood_type: 'A+',
    total_visits: 15,
    status: 'Activo',
    emergency_contact_name: 'Ana Rodríguez',
    emergency_contact_phone: '555-0457',
    allergies: 'Penicilina',
    current_medications: 'Metformina',
    created_at: '2022-11-10'
  },
  {
    id: 'PAT003',
    first_name: 'Ana',
    paternal_surname: 'Fernández',
    maternal_surname: 'Torres',
    full_name: 'Ana Fernández Torres',
    birth_date: '2010-12-05',
    age: 14,
    gender: 'Femenino',
    phone: '555-0789',
    email: 'ana.fernandez@email.com',
    address: 'Plaza Central 789',
    blood_type: 'B-',
    total_visits: 3,
    status: 'Activo',
    emergency_contact_name: 'Luis Fernández',
    emergency_contact_phone: '555-0790',
    allergies: 'Mariscos',
    current_medications: 'Ninguna',
    created_at: '2024-02-20'
  }
];

const mockConsultations: Consultation[] = [
  {
    id: 'CONS001',
    patient_id: 'PAT001',
    patient_name: 'María González López',
    date: '2024-08-28',
    chief_complaint: 'Dolor de cabeza recurrente',
    primary_diagnosis: 'Migraña tensional',
    history_present_illness: 'Dolor de cabeza desde hace 3 días',
    physical_examination: 'Normal',
    treatment_plan: 'Analgésicos y descanso',
    follow_up_instructions: 'Control en 1 semana'
  },
  {
    id: 'CONS002',
    patient_id: 'PAT002',
    patient_name: 'Carlos Rodríguez Martínez',
    date: '2024-08-27',
    chief_complaint: 'Control diabetes',
    primary_diagnosis: 'Diabetes tipo 2 controlada',
    history_present_illness: 'Control rutinario',
    physical_examination: 'Estable',
    treatment_plan: 'Continuar medicación',
    follow_up_instructions: 'Control en 3 meses'
  }
];

/**
 * Demostración de SmartTable con funcionalidades avanzadas
 */
const SmartTableDemo: React.FC = () => {
  // Estados de configuración
  const [tableConfig, setTableConfig] = useState({
    enableSorting: true,
    stickyHeader: false,
    dense: false,
    hover: true,
    showRowNumbers: false,
    maxHeight: 400
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTable, setActiveTable] = useState<'patients' | 'consultations'>('patients');

  // Hooks de tabla
  const { patientColumns, consultationColumns, compactPatientColumns } = useMedicalTableColumns();
  const { searchTerm, setSearchTerm, debouncedSearchTerm } = useIntelligentSearch();

  // Filtrar datos basado en búsqueda
  const filteredPatients = mockPatients.filter(patient =>
    !debouncedSearchTerm || 
    patient.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    patient.phone.includes(debouncedSearchTerm) ||
    patient.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const filteredConsultations = mockConsultations.filter(consultation =>
    !debouncedSearchTerm ||
    consultation.patient_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    consultation.chief_complaint.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    consultation.primary_diagnosis?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  // Simular carga
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleRowClick = (row: any) => {
    alert(`Click en: ${row.full_name || row.patient_name || row.id}`);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        📊 Tablas Inteligentes con Ordenamiento
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Demostración de SmartTable con sorting, búsqueda, y configuraciones avanzadas
      </Typography>

      <Grid container spacing={3}>
        {/* Panel de Control */}
        <Grid xs={12} md={4}>
          <Card>
            <CardHeader
              avatar={<ViewIcon color="primary" />}
              title="⚙️ Configuración"
              subheader="Personaliza la tabla en tiempo real"
            />
            <CardContent>
              {/* Selector de tabla */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Tabla Activa:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={activeTable === 'patients' ? 'contained' : 'outlined'}
                    onClick={() => setActiveTable('patients')}
                  >
                    Pacientes
                  </Button>
                  <Button
                    size="small"
                    variant={activeTable === 'consultations' ? 'contained' : 'outlined'}
                    onClick={() => setActiveTable('consultations')}
                  >
                    Consultas
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Configuraciones */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={tableConfig.enableSorting}
                      onChange={(e) => setTableConfig(prev => ({ ...prev, enableSorting: e.target.checked }))}
                    />
                  }
                  label="Ordenamiento"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={tableConfig.stickyHeader}
                      onChange={(e) => setTableConfig(prev => ({ ...prev, stickyHeader: e.target.checked }))}
                    />
                  }
                  label="Header Fijo"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={tableConfig.dense}
                      onChange={(e) => setTableConfig(prev => ({ ...prev, dense: e.target.checked }))}
                    />
                  }
                  label="Compacta"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={tableConfig.hover}
                      onChange={(e) => setTableConfig(prev => ({ ...prev, hover: e.target.checked }))}
                    />
                  }
                  label="Hover Effect"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={tableConfig.showRowNumbers}
                      onChange={(e) => setTableConfig(prev => ({ ...prev, showRowNumbers: e.target.checked }))}
                    />
                  }
                  label="Números de Fila"
                />

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Altura máxima: {tableConfig.maxHeight}px
                  </Typography>
                  <Slider
                    value={tableConfig.maxHeight}
                    onChange={(_, value) => setTableConfig(prev => ({ ...prev, maxHeight: value as number }))}
                    min={300}
                    max={800}
                    step={50}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={simulateLoading}
                disabled={isLoading}
              >
                Simular Carga
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabla Principal */}
        <Grid xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Búsqueda */}
            <Box sx={{ mb: 3 }}>
              <IntelligentSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder={`Buscar ${activeTable === 'patients' ? 'pacientes' : 'consultas'}...`}
                showFilterButton={false}
              />
            </Box>

            {/* Tabla de Pacientes */}
            {activeTable === 'patients' && (
              <SmartTable
                data={filteredPatients}
                columns={tableConfig.dense ? compactPatientColumns : patientColumns}
                isLoading={isLoading}
                emptyMessage="No se encontraron pacientes"
                onRowClick={handleRowClick}
                {...tableConfig}
              />
            )}

            {/* Tabla de Consultas */}
            {activeTable === 'consultations' && (
              <SmartTable
                data={filteredConsultations}
                columns={consultationColumns}
                isLoading={isLoading}
                emptyMessage="No se encontraron consultas"
                onRowClick={handleRowClick}
                {...tableConfig}
              />
            )}
          </Paper>
        </Grid>

        {/* Información de Características */}
        <Grid xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'info.50', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'info.main' }}>
              🚀 Características de SmartTable
            </Typography>
            
            <Grid container spacing={2}>
              <Grid xs={12} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  🔄 Ordenamiento
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Click para ordenar ascendente<br/>
                  • Click otra vez para descendente<br/>
                  • Tercer click para quitar orden<br/>
                  • Soporte para múltiples tipos de datos
                </Typography>
              </Grid>
              
              <Grid xs={12} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  📱 Estados Inteligentes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Loading con skeleton automático<br/>
                  • Estados vacíos personalizables<br/>
                  • Manejo de errores con retry<br/>
                  • Feedback visual consistente
                </Typography>
              </Grid>
              
              <Grid xs={12} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  🎨 Personalización
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Columnas customizables<br/>
                  • Renderizado de celdas avanzado<br/>
                  • Formateo automático<br/>
                  • Temas y estilos flexibles
                </Typography>
              </Grid>
              
              <Grid xs={12} md={3}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  ⚡ Performance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Sorting optimizado<br/>
                  • Renderizado eficiente<br/>
                  • Memoización automática<br/>
                  • Scroll virtual para listas grandes
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SmartTableDemo;
