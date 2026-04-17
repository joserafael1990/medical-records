import React from 'react';
import { Skeleton, TableCell, TableRow, Box } from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  /** Optional per-column widths (percent or px). Defaults to even distribution. */
  columnWidths?: Array<string | number>;
}

/**
 * Shimmer skeleton for a MUI Table body. Drop-in replacement for the
 * typical `{loading && <TableRow><TableCell colSpan=...>Cargando...</TableCell></TableRow>}`
 * pattern so loading states feel like the final layout.
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 5,
  columnWidths,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={`sk-row-${r}`}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={`sk-cell-${r}-${c}`}>
              <Skeleton
                variant="text"
                width={columnWidths?.[c] ?? '80%'}
                animation="wave"
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

/**
 * Card-shaped skeleton block (use inside Paper/Card placeholders while
 * fetching dashboard widgets, analytics, etc).
 */
export const CardSkeleton: React.FC<{ height?: number | string }> = ({ height = 140 }) => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="rectangular" height={height} animation="wave" sx={{ borderRadius: 1 }} />
  </Box>
);
