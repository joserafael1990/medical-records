import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Chip,
  Typography,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchFilter {
  key: string;
  label: string;
  value: any;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

interface IntelligentSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  filters?: SearchFilter[];
  onFilterRemove?: (filterKey: string) => void;
  onFilterClick?: () => void;
  showFilterButton?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  fullWidth?: boolean;
}

/**
 * Componente de búsqueda inteligente con filtros y estado de carga
 * Incluye debounce automático y manejo de filtros visuales
 */
export const IntelligentSearch: React.FC<IntelligentSearchProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = 'Buscar...',
  isLoading = false,
  filters = [],
  onFilterRemove,
  onFilterClick,
  showFilterButton = true,
  autoFocus = false,
  disabled = false,
  size = 'medium',
  variant = 'outlined',
  fullWidth = true
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const handleFilterRemove = useCallback((filterKey: string) => {
    if (onFilterRemove) {
      onFilterRemove(filterKey);
    }
  }, [onFilterRemove]);

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      {/* Campo de búsqueda principal */}
      <TextField
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        disabled={disabled}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            },
            '&.Mui-focused': {
              boxShadow: '0 4px 12px rgba(25,118,210,0.2)'
            }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {isLoading ? (
                <CircularProgress size={20} />
              ) : (
                <SearchIcon color={isFocused ? 'primary' : 'action'} />
              )}
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {/* Botón de limpiar */}
                {searchTerm && (
                  <Fade in={!!searchTerm}>
                    <IconButton
                      size="small"
                      onClick={handleClear}
                      disabled={disabled}
                      sx={{ 
                        transition: 'all 0.2s ease',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Fade>
                )}
                
                {/* Botón de filtros */}
                {showFilterButton && onFilterClick && (
                  <IconButton
                    size="small"
                    onClick={onFilterClick}
                    disabled={disabled}
                    color={filters.length > 0 ? 'primary' : 'default'}
                    sx={{ 
                      transition: 'all 0.2s ease',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <FilterIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </InputAdornment>
          )
        }}
      />

      {/* Filtros activos */}
      {filters.length > 0 && (
        <Fade in={filters.length > 0}>
          <Box sx={{ 
            mt: 1, 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 0.5,
            alignItems: 'center'
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Filtros activos:
            </Typography>
            {filters.map((filter) => (
              <Chip
                key={filter.key}
                label={`${filter.label}: ${filter.value}`}
                size="small"
                color={filter.color || 'default'}
                variant="outlined"
                onDelete={onFilterRemove ? () => handleFilterRemove(filter.key) : undefined}
                sx={{
                  borderRadius: 1,
                  '& .MuiChip-deleteIcon': {
                    fontSize: 16
                  }
                }}
              />
            ))}
          </Box>
        </Fade>
      )}
    </Box>
  );
};

/**
 * Hook para simplificar el uso del componente IntelligentSearch
 */
export const useIntelligentSearch = (
  initialSearchTerm: string = '',
  debounceMs: number = 300
) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters(prev => {
      const existing = prev.findIndex(f => f.key === filter.key);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = filter;
        return updated;
      }
      return [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((filterKey: string) => {
    setFilters(prev => prev.filter(f => f.key !== filterKey));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setFilters([]);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    filters,
    addFilter,
    removeFilter,
    clearAllFilters,
    clearSearch
  };
};
