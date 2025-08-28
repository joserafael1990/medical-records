import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import {
  Search as SearchIcon,
  Notifications as NotifyIcon,
  Download as LoadIcon
} from '@mui/icons-material';
import { IntelligentSearch, useIntelligentSearch } from '../common/IntelligentSearch';
import { SmartLoadingState, useSmartLoading } from '../common/SmartLoadingState';
import { useToast, useSimpleToast } from '../common/ToastNotification';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * Vista de demostración de las nuevas mejoras de UX
 * Muestra ejemplos prácticos de cada componente
 */
const UXDemoView: React.FC = () => {
  // Demo de búsqueda inteligente
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    filters,
    addFilter,
    removeFilter,
    clearAllFilters
  } = useIntelligentSearch();

  // Demo de estados de carga
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [data, setData] = useState<string[]>([]);
  const { LoadingWrapper } = useSmartLoading(isLoading, data, hasError ? 'Error de conexión' : null);

  // Demo de notificaciones
  const toast = useToast();
  const simpleToast = useSimpleToast();

  // Simular carga de datos
  const simulateLoading = () => {
    setIsLoading(true);
    setHasError(false);
    
    setTimeout(() => {
      if (Math.random() > 0.7) {
        setHasError(true);
        setData([]);
      } else {
        setData(['Resultado 1', 'Resultado 2', 'Resultado 3']);
        setHasError(false);
      }
      setIsLoading(false);
    }, 2000);
  };

  // Demo filtros
  const addSampleFilter = () => {
    addFilter({
      key: 'date',
      label: 'Fecha',
      value: '2024',
      color: 'primary'
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
        🚀 Mejoras de UX Implementadas
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Demostración de los nuevos componentes para mejorar la experiencia de usuario
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3, mb: 3 }}>
        {/* 1. Búsqueda Inteligente */}
        <Box>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<SearchIcon color="primary" />}
              title="🔍 Búsqueda Inteligente"
              subheader="Con debounce automático y filtros visuales"
            />
            <CardContent>
              <IntelligentSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Buscar pacientes, consultas..."
                filters={filters}
                onFilterRemove={removeFilter}
                onFilterClick={addSampleFilter}
                showFilterButton
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Término actual: <strong>{searchTerm}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Debounced (300ms): <strong>{debouncedSearchTerm}</strong>
                </Typography>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button size="small" onClick={addSampleFilter}>
                  Agregar Filtro
                </Button>
                <Button size="small" onClick={clearAllFilters} disabled={filters.length === 0}>
                  Limpiar Filtros
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 2. Estados de Carga */}
        <Box>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<LoadIcon color="primary" />}
              title="📱 Estados de Carga"
              subheader="Loading, error y empty states inteligentes"
            />
            <CardContent>
              <Button 
                variant="contained" 
                onClick={simulateLoading}
                disabled={isLoading}
                sx={{ mb: 2 }}
              >
                Simular Carga de Datos
              </Button>

              <Paper sx={{ minHeight: 200, borderRadius: 2 }}>
                <LoadingWrapper
                  loadingProps={{
                    loadingType: 'skeleton',
                    skeletonRows: 3,
                    onRetry: simulateLoading
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    {data.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: 2, 
                        mb: 1, 
                        bgcolor: 'success.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'success.200'
                      }}>
                        ✅ {item}
                      </Box>
                    ))}
                  </Box>
                </LoadingWrapper>
              </Paper>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 3. Notificaciones Toast */}
      <Box sx={{ mb: 3 }}>
        <Card>
            <CardHeader
              avatar={<NotifyIcon color="primary" />}
              title="🔔 Sistema de Notificaciones"
              subheader="Toast notifications con auto-dismiss y acciones"
            />
            <CardContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2, mb: 2 }}>
                <Box>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={() => simpleToast.success('¡Operación exitosa!')}
                  >
                    ✅ Success
                  </Button>
                </Box>
                <Box>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={() => simpleToast.error('Error en la operación')}
                  >
                    ❌ Error
                  </Button>
                </Box>
                <Box>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    onClick={() => simpleToast.warning('Advertencia importante')}
                  >
                    ⚠️ Warning
                  </Button>
                </Box>
                <Box>
                  <Button
                    fullWidth
                    variant="contained"
                    color="info"
                    onClick={() => simpleToast.info('Información útil')}
                  >
                    ℹ️ Info
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Button
                variant="outlined"
                onClick={() => toast.showToast({
                  type: 'success',
                  title: 'Notificación Avanzada',
                  message: 'Esta notificación tiene título, mensaje y acción personalizada.',
                  duration: 10000,
                  action: {
                    label: 'Ver Detalles',
                    onClick: () => alert('¡Acción ejecutada!')
                  }
                })}
              >
                📋 Toast Avanzado
              </Button>
            </CardContent>
          </Card>
      </Box>

      {/* 4. Información de Implementación */}
      <Box>
        <Paper sx={{ p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            💡 Cómo Implementar en tu Aplicación
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                1. Búsqueda Inteligente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <code>useIntelligentSearch()</code> para gestión completa de búsqueda y filtros
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                2. Estados de Carga
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <code>useSmartLoading()</code> para wrapper automático de estados
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                3. Notificaciones
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <code>useSimpleToast()</code> para notificaciones rápidas
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default UXDemoView;
