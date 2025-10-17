import { useMemo } from 'react';

interface UseSearchOptions {
  searchFields: string[];
  caseSensitive?: boolean;
  accentInsensitive?: boolean;
}

// Normalize text by removing accents and converting to lowercase
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
    .trim();
};

export const useMemoizedSearch = <T>(
  items: T[],
  searchTerm: string,
  options: UseSearchOptions
) => {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const { caseSensitive = false, accentInsensitive = true } = options;
    
    const normalizedSearchTerm = accentInsensitive 
      ? normalizeText(searchTerm)
      : caseSensitive 
        ? searchTerm.trim() 
        : searchTerm.trim().toLowerCase();

    return items.filter(item => {
      return options.searchFields.some(field => {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue == null) return false;
        
        const stringValue = String(fieldValue);
        const normalizedValue = accentInsensitive
          ? normalizeText(stringValue)
          : caseSensitive 
            ? stringValue 
            : stringValue.toLowerCase();
        
        return normalizedValue.includes(normalizedSearchTerm);
      });
    });
  }, [items, searchTerm, options.searchFields, options.caseSensitive, options.accentInsensitive]);
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
