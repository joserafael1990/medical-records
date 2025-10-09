import { useMemo } from 'react';

interface UseSearchOptions {
  searchFields: string[];
  caseSensitive?: boolean;
}

export const useMemoizedSearch = <T>(
  items: T[],
  searchTerm: string,
  options: UseSearchOptions
) => {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const normalizedSearchTerm = options.caseSensitive 
      ? searchTerm.trim() 
      : searchTerm.trim().toLowerCase();

    return items.filter(item => {
      return options.searchFields.some(field => {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue == null) return false;
        
        const stringValue = String(fieldValue);
        const normalizedValue = options.caseSensitive 
          ? stringValue 
          : stringValue.toLowerCase();
        
        return normalizedValue.includes(normalizedSearchTerm);
      });
    });
  }, [items, searchTerm, options.searchFields, options.caseSensitive]);
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
