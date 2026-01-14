import { useMemo } from 'react';

export const useMemoizedCalculation = <T, R>(
  data: T[],
  calculator: (items: T[]) => R,
  dependencies: any[] = []
): R => {
  return useMemo(() => {
    return calculator(data);
  }, [data, ...dependencies]);
};

// Specific hooks for common calculations
export const useMemoizedStats = <T>(
  items: T[],
  getValue: (item: T) => number
) => {
  return useMemo(() => {
    if (items.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0 };
    }

    const values = items.map(getValue);
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { total, average, min, max };
  }, [items, getValue]);
};

export const useMemoizedGroupBy = <T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K
) => {
  return useMemo(() => {
    return items.reduce((groups, item) => {
      const key = getKey(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  }, [items, getKey]);
};
