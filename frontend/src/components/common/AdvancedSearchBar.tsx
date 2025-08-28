import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Fade,
  Popper,
  ClickAwayListener,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { SearchFilters } from '../../hooks/useAdvancedSearch';

export interface AdvancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  filters?: SearchFilters;
  onFiltersChange?: (filters: SearchFilters) => void;
  recentSearches?: string[];
  onRecentSearchClick?: (search: string) => void;
  isLoading?: boolean;
  showFilters?: boolean;
  resultCount?: number;
  className?: string;
}

const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar...',
  filters = {},
  onFiltersChange,
  recentSearches = [],
  onRecentSearchClick,
  isLoading = false,
  showFilters = false,
  resultCount,
  className
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionAnchorRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLButtonElement>(null);

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([_, value]) => {
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v);
    }
    return Boolean(value);
  }).length;

  // Handle input focus
  const handleInputFocus = () => {
    if (recentSearches.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    
    // Show suggestions if we have recent searches and input is focused
    if (recentSearches.length > 0 && document.activeElement === inputRef.current) {
      setShowSuggestions(true);
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    onChange(search);
    setShowSuggestions(false);
    onRecentSearchClick?.(search);
  };

  // Handle clear
  const handleClear = () => {
    onChange('');
    onClear();
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Handle filter toggle
  const handleFilterToggle = () => {
    setShowFilterPanel(!showFilterPanel);
  };

  // Handle click away from suggestions
  const handleClickAway = () => {
    setShowSuggestions(false);
  };

  // Filter out current search from recent searches
  const filteredRecentSearches = recentSearches.filter(
    search => search.toLowerCase() !== value.toLowerCase()
  ).slice(0, 5);

  return (
    <Box className={className} sx={{ position: 'relative', width: '100%' }}>
      {/* Main Search Input */}
      <Box ref={suggestionAnchorRef}>
        <TextField
          ref={inputRef}
          fullWidth
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          variant="outlined"
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color={isLoading ? 'disabled' : 'action'} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {/* Result count */}
                  {resultCount !== undefined && resultCount > 0 && (
                    <Chip
                      label={`${resultCount} resultado${resultCount !== 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  
                  {/* Filter button */}
                  {showFilters && onFiltersChange && (
                    <Tooltip title="Filtros">
                      <Badge badgeContent={activeFiltersCount} color="primary">
                        <IconButton
                          ref={filterAnchorRef}
                          size="small"
                          onClick={handleFilterToggle}
                          color={showFilterPanel ? 'primary' : 'default'}
                        >
                          <FilterIcon />
                        </IconButton>
                      </Badge>
                    </Tooltip>
                  )}
                  
                  {/* Clear button */}
                  {value && (
                    <Tooltip title="Limpiar">
                      <IconButton size="small" onClick={handleClear}>
                        <ClearIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </InputAdornment>
            ),
            sx: {
              '& .MuiOutlinedInput-root': {
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                },
                '&.Mui-focused': {
                  boxShadow: '0 4px 12px rgba(25,118,210,0.15)'
                }
              }
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />
      </Box>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            
            let displayValue = value;
            if (typeof value === 'object' && value !== null) {
              // Handle date range or other object filters
              if ('start' in value && 'end' in value) {
                displayValue = `${value.start} - ${value.end}`;
              }
            }
            
            if (!displayValue) return null;

            return (
              <Chip
                key={key}
                label={`${key}: ${displayValue}`}
                size="small"
                onDelete={() => {
                  const newFilters = { ...filters };
                  delete newFilters[key as keyof SearchFilters];
                  onFiltersChange?.(newFilters);
                }}
                deleteIcon={<CloseIcon />}
                color="primary"
                variant="outlined"
              />
            );
          })}
        </Box>
      )}

      {/* Suggestions Dropdown */}
      <Popper
        open={showSuggestions}
        anchorEl={suggestionAnchorRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300, width: suggestionAnchorRef.current?.clientWidth }}
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <ClickAwayListener onClickAway={handleClickAway}>
              <Paper
                elevation={8}
                sx={{
                  mt: 1,
                  maxHeight: 300,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                {filteredRecentSearches.length > 0 && (
                  <>
                    <Box sx={{ p: 2, pb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <HistoryIcon fontSize="small" />
                        Búsquedas recientes
                      </Typography>
                    </Box>
                    <List dense>
                      {filteredRecentSearches.map((search, index) => (
                        <ListItem
                          key={index}
                          button
                          onClick={() => handleRecentSearchClick(search)}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <TrendingIcon fontSize="small" color="action" />
                          </ListItemIcon>
                          <ListItemText
                            primary={search}
                            primaryTypographyProps={{
                              variant: 'body2'
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
                
                {filteredRecentSearches.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay búsquedas recientes
                    </Typography>
                  </Box>
                )}
              </Paper>
            </ClickAwayListener>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default AdvancedSearchBar;
