import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

export interface PatientFilters {
  status: 'all' | 'active' | 'inactive';
  gender: 'all' | 'Masculino' | 'Femenino' | 'Otro';
  createdFrom?: string;
  createdTo?: string;
}

interface PatientFiltersDialogProps {
  open: boolean;
  onClose: () => void;
  filters: PatientFilters;
  onFiltersChange: (filters: PatientFilters) => void;
  onClearFilters: () => void;
}

const PatientFiltersDialog: React.FC<PatientFiltersDialogProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [localFilters, setLocalFilters] = useState<PatientFilters>(filters);

  // Sincronizar filtros locales con los props cuando cambian
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof PatientFilters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: PatientFilters = {
      status: 'all',
      gender: 'all',
      createdFrom: undefined,
      createdTo: undefined
    };
    setLocalFilters(clearedFilters);
    onClearFilters();
    onClose();
  };

  const hasActiveFilters = 
    localFilters.status !== 'all' ||
    localFilters.gender !== 'all' ||
    localFilters.createdFrom ||
    localFilters.createdTo;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="primary" />
          <Typography variant="h6">Filtros de Pacientes</Typography>
        </Box>
        <Button
          onClick={onClose}
          size="small"
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {/* Estado */}
          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              value={localFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              label="Estado"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activo</MenuItem>
              <MenuItem value="inactive">Inactivo</MenuItem>
            </Select>
          </FormControl>

          {/* Género */}
          <FormControl fullWidth size="small">
            <InputLabel>Género</InputLabel>
            <Select
              value={localFilters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              label="Género"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="Masculino">Masculino</MenuItem>
              <MenuItem value="Femenino">Femenino</MenuItem>
              <MenuItem value="Otro">Otro</MenuItem>
            </Select>
          </FormControl>

          {/* Rango de fechas de creación */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Fecha de Registro
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Desde"
                  value={localFilters.createdFrom ? new Date(localFilters.createdFrom) : null}
                  onChange={(newValue) => {
                    handleFilterChange('createdFrom', newValue ? newValue.toISOString().split('T')[0] : undefined);
                  }}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
                <DatePicker
                  label="Hasta"
                  value={localFilters.createdTo ? new Date(localFilters.createdTo) : null}
                  onChange={(newValue) => {
                    handleFilterChange('createdTo', newValue ? newValue.toISOString().split('T')[0] : undefined);
                  }}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Box>
          </Box>

          {/* Filtros activos */}
          {hasActiveFilters && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Filtros Activos
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {localFilters.status !== 'all' && (
                  <Chip
                    label={`Estado: ${localFilters.status === 'active' ? 'Activo' : 'Inactivo'}`}
                    size="small"
                    onDelete={() => handleFilterChange('status', 'all')}
                  />
                )}
                {localFilters.gender !== 'all' && (
                  <Chip
                    label={`Género: ${localFilters.gender}`}
                    size="small"
                    onDelete={() => handleFilterChange('gender', 'all')}
                  />
                )}
                {localFilters.createdFrom && (
                  <Chip
                    label={`Desde: ${new Date(localFilters.createdFrom).toLocaleDateString('es-MX')}`}
                    size="small"
                    onDelete={() => handleFilterChange('createdFrom', undefined)}
                  />
                )}
                {localFilters.createdTo && (
                  <Chip
                    label={`Hasta: ${new Date(localFilters.createdTo).toLocaleDateString('es-MX')}`}
                    size="small"
                    onDelete={() => handleFilterChange('createdTo', undefined)}
                  />
                )}
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleClear}
          startIcon={<ClearIcon />}
          disabled={!hasActiveFilters}
          color="inherit"
        >
          Limpiar
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
        >
          Aplicar Filtros
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PatientFiltersDialog;

