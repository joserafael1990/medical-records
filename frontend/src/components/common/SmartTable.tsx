import React, { useMemo } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  UnfoldMore as UnfoldIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useTableSorting, SortDirection } from '../../hooks/useTableSorting';
import { SmartLoadingState } from './SmartLoadingState';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
  format?: (value: T[keyof T]) => string;
}

export interface SmartTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  enableSorting?: boolean;
  stickyHeader?: boolean;
  dense?: boolean;
  hover?: boolean;
  onRowClick?: (row: T, index: number) => void;
  rowKey?: keyof T | ((row: T) => string | number);
  maxHeight?: string | number;
  showRowNumbers?: boolean;
  className?: string;
  sx?: any;
}

/**
 * Componente de tabla inteligente con ordenamiento, estados de carga y funcionalidades avanzadas
 */
export const SmartTable = <T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  error = null,
  emptyMessage = 'No hay datos para mostrar',
  enableSorting = true,
  stickyHeader = false,
  dense = false,
  hover = true,
  onRowClick,
  rowKey = 'id',
  maxHeight,
  showRowNumbers = false,
  className,
  sx = {}
}: SmartTableProps<T>) => {
  const theme = useTheme();
  
  // Hook de ordenamiento
  const {
    sortedData,
    sortConfig,
    handleSort,
    getSortDirection,
    isSorted,
    resetSort
  } = useTableSorting({
    data,
    defaultSortField: columns.find(col => col.sortable)?.key
  });

  // Función para obtener la key de la fila
  const getRowKey = useMemo(() => {
    if (typeof rowKey === 'function') {
      return rowKey;
    }
    return (row: T) => row[rowKey] || Math.random();
  }, [rowKey]);

  // Renderizar icono de ordenamiento
  const renderSortIcon = (column: TableColumn<T>) => {
    if (!enableSorting || !column.sortable) return null;

    const direction = getSortDirection(column.key);
    
    if (direction === 'asc') {
      return <ArrowUpIcon fontSize="small" />;
    } else if (direction === 'desc') {
      return <ArrowDownIcon fontSize="small" />;
    } else {
      return (
        <UnfoldIcon 
          fontSize="small" 
          sx={{ 
            opacity: 0.5,
            transition: 'opacity 0.2s',
            '.MuiTableCell-root:hover &': {
              opacity: 1
            }
          }} 
        />
      );
    }
  };

  // Renderizar valor de celda
  const renderCellValue = (column: TableColumn<T>, row: T, index: number) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row, index);
    }
    
    if (column.format) {
      return column.format(value);
    }
    
    return value ?? '-';
  };

  return (
    <SmartLoadingState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && data.length === 0}
      emptyMessage={emptyMessage}
      loadingType="skeleton"
      skeletonRows={5}
    >
      <Paper 
        elevation={1} 
        className={className}
        sx={{
          overflow: 'hidden',
          borderRadius: 2,
          ...sx
        }}
      >
        {/* Header con información de ordenamiento */}
        {isSorted && (
          <Box sx={{ 
            p: 2, 
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Ordenado por: <strong>{columns.find(col => col.key === sortConfig.field)?.label || 'columna'}</strong>
              </Typography>
              <Tooltip title="Limpiar ordenamiento">
                <IconButton size="small" onClick={resetSort}>
                  <FilterIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        <TableContainer sx={{ maxHeight }}>
          <Table
            stickyHeader={stickyHeader}
            size={dense ? 'small' : 'medium'}
            sx={{
              '& .MuiTableCell-head': {
                backgroundColor: theme.palette.grey[50],
                fontWeight: 600,
                borderBottom: `2px solid ${theme.palette.divider}`
              },
              '& .MuiTableRow-root:hover': hover ? {
                backgroundColor: alpha(theme.palette.primary.main, 0.04)
              } : {}
            }}
          >
            <TableHead>
              <TableRow>
                {showRowNumbers && (
                  <TableCell sx={{ width: 60, textAlign: 'center' }}>
                    #
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    align={column.align || 'left'}
                    sx={{
                      width: column.width,
                      cursor: enableSorting && column.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      transition: 'background-color 0.2s',
                      '&:hover': enableSorting && column.sortable ? {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08)
                      } : {}
                    }}
                    onClick={() => enableSorting && column.sortable && handleSort(column.key)}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      justifyContent: column.align === 'center' ? 'center' : 
                                   column.align === 'right' ? 'flex-end' : 'flex-start'
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {column.label}
                      </Typography>
                      {renderSortIcon(column)}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedData.map((row, index) => (
                <TableRow
                  key={getRowKey(row)}
                  hover={hover}
                  onClick={() => onRowClick?.(row, index)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:nth-of-type(odd)': {
                      backgroundColor: alpha(theme.palette.grey[50], 0.5)
                    }
                  }}
                >
                  {showRowNumbers && (
                    <TableCell sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      {index + 1}
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      align={column.align || 'left'}
                      sx={{ width: column.width }}
                    >
                      {renderCellValue(column, row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer con información */}
        {sortedData.length > 0 && (
          <Box sx={{ 
            p: 2, 
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            bgcolor: alpha(theme.palette.grey[50], 0.5)
          }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {sortedData.length} de {data.length} registros
              {isSorted && ' (ordenados)'}
            </Typography>
          </Box>
        )}
      </Paper>
    </SmartLoadingState>
  );
};

/**
 * Hook simplificado para usar SmartTable con configuraciones comunes
 */
export const useSmartTable = <T extends Record<string, any>>(
  data: T[], 
  columns: TableColumn<T>[],
  options: Partial<SmartTableProps<T>> = {}
) => {
  const tableProps: SmartTableProps<T> = {
    data,
    columns,
    enableSorting: true,
    hover: true,
    dense: false,
    stickyHeader: false,
    ...options
  };

  const TableComponent: React.FC<Partial<SmartTableProps<T>>> = (props) => (
    <SmartTable {...tableProps} {...props} />
  );

  return {
    TableComponent,
    tableProps
  };
};
