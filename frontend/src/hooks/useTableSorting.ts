import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type SortField = string;

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface UseTableSortingProps<T> {
  data: T[];
  initialSort?: SortConfig;
  defaultSortField?: keyof T;
}

/**
 * Hook para manejo de ordenamiento en tablas
 * Proporciona funcionalidad completa de sorting con múltiples columnas
 */
export const useTableSorting = <T extends Record<string, any>>({
  data,
  initialSort,
  defaultSortField
}: UseTableSortingProps<T>) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    initialSort || {
      field: defaultSortField as string || '',
      direction: null
    }
  );

  // Función para alternar el ordenamiento de una columna
  const handleSort = useCallback((field: keyof T) => {
    setSortConfig(prevConfig => {
      if (prevConfig.field === field) {
        // Si es la misma columna, rotar: asc -> desc -> null -> asc
        if (prevConfig.direction === 'asc') {
          return { field: field as string, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return { field: '', direction: null };
        } else {
          return { field: field as string, direction: 'asc' };
        }
      } else {
        // Nueva columna, empezar con asc
        return { field: field as string, direction: 'asc' };
      }
    });
  }, []);

  // Función para obtener el estado de ordenamiento de una columna
  const getSortDirection = useCallback((field: keyof T): SortDirection => {
    return sortConfig.field === field ? sortConfig.direction : null;
  }, [sortConfig]);

  // Datos ordenados
  const sortedData = useMemo(() => {
    if (!sortConfig.field || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];

      // Manejar valores null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Comparación por tipo
      let comparison = 0;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        // Fallback: convertir a string
        comparison = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  // Reset del ordenamiento
  const resetSort = useCallback(() => {
    setSortConfig({ field: '', direction: null });
  }, []);

  // Establecer ordenamiento específico
  const setSort = useCallback((field: keyof T, direction: SortDirection) => {
    setSortConfig({ field: field as string, direction });
  }, []);

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortDirection,
    resetSort,
    setSort,
    isSorted: sortConfig.direction !== null
  };
};
