import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box
} from '@mui/material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}

interface VirtualizedTableProps {
  columns: Column[];
  rows: any[];
  rowHeight?: number;
  height?: number;
  onRowClick?: (row: any) => void;
  renderRow: (row: any, index: number, style: React.CSSProperties) => React.ReactNode;
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  columns,
  rows,
  rowHeight = 73,
  height = 400,
  onRowClick,
  renderRow
}) => {
  const memoizedRows = useMemo(() => rows, [rows]);

  const renderVirtualRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = memoizedRows[index];
    return (
      <div style={style}>
        {renderRow(row, index, style)}
      </div>
    );
  };

  return (
    <Paper>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sx={{ fontWeight: 600 }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        </Table>
        <Box sx={{ height }}>
          <List
            height={height}
            width="100%"
            itemCount={memoizedRows.length}
            itemSize={rowHeight}
            overscanCount={5}
          >
            {renderVirtualRow}
          </List>
        </Box>
      </TableContainer>
    </Paper>
  );
};

export default memo(VirtualizedTable);
