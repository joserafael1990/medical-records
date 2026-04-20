/**
 * Weekday × hour heatmap for the "horas con mayor carga" card.
 *
 * Replaces the old ranked list. Shows a 7×N grid (lun…dom × hour range
 * that actually has data) with color intensity proportional to visit
 * count. Tooltip on each cell exposes the exact count.
 *
 * Built with pure MUI + CSS (no nivo / d3) to avoid adding a dep for
 * a single card.
 */

import React, { useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';

interface BusyHoursRow {
  weekday: string;
  hour: number;
  count: number;
}

interface BusyHoursHeatmapProps {
  rows: BusyHoursRow[];
}

// Canonical weekday order — matches what the backend emits.
const WEEKDAYS_ORDER = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;
// Work hours we always render (pad with zeros if the data is sparse).
// Truncated to what makes sense for a doctor's office; we extend past
// these if the data shows activity outside the window.
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 20;

export const BusyHoursHeatmap: React.FC<BusyHoursHeatmapProps> = ({ rows }) => {
  const { byCell, hourRange, maxCount } = useMemo(() => {
    const cell: Record<string, number> = {}; // "weekday|hour" → count
    let minHr = DEFAULT_MIN_HOUR;
    let maxHr = DEFAULT_MAX_HOUR;
    let max = 0;
    for (const r of rows) {
      const key = `${r.weekday}|${r.hour}`;
      cell[key] = (cell[key] || 0) + r.count;
      if (r.hour < minHr) minHr = r.hour;
      if (r.hour > maxHr) maxHr = r.hour;
      if ((cell[key] || 0) > max) max = cell[key];
    }
    const hours: number[] = [];
    for (let h = minHr; h <= maxHr; h++) hours.push(h);
    return { byCell: cell, hourRange: hours, maxCount: max };
  }, [rows]);

  if (rows.length === 0 || maxCount === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Sin datos de horarios todavía.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${hourRange.length}, minmax(18px, 1fr))`,
          gap: '2px',
          alignItems: 'center',
        }}
      >
        {/* Header row: empty corner + hours */}
        <Box />
        {hourRange.map((h) => (
          <Typography
            key={`h-${h}`}
            variant="caption"
            sx={{
              fontSize: 10,
              color: 'text.secondary',
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            {h}
          </Typography>
        ))}

        {/* Body rows: weekday label + cells */}
        {WEEKDAYS_ORDER.map((wd) => (
          <React.Fragment key={`row-${wd}`}>
            <Typography
              variant="caption"
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: 'text.secondary',
                pr: 1,
                textTransform: 'capitalize',
                textAlign: 'right',
              }}
            >
              {wd}
            </Typography>
            {hourRange.map((h) => {
              const count = byCell[`${wd}|${h}`] || 0;
              return (
                <HeatCell
                  key={`cell-${wd}-${h}`}
                  count={count}
                  maxCount={maxCount}
                  weekday={wd}
                  hour={h}
                />
              );
            })}
          </React.Fragment>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2, justifyContent: 'flex-end' }}>
        <Typography variant="caption" color="text.secondary">
          menos
        </Typography>
        {[0.1, 0.3, 0.5, 0.75, 1].map((pct) => (
          <Box
            key={pct}
            sx={{
              width: 14,
              height: 14,
              borderRadius: 0.5,
              bgcolor: shadeForIntensity(pct),
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ))}
        <Typography variant="caption" color="text.secondary">
          más
        </Typography>
      </Box>
    </Box>
  );
};


const HeatCell: React.FC<{
  count: number;
  maxCount: number;
  weekday: string;
  hour: number;
}> = ({ count, maxCount, weekday, hour }) => {
  const intensity = maxCount > 0 ? count / maxCount : 0;
  const bg = count === 0 ? 'transparent' : shadeForIntensity(intensity);
  const border = count === 0 ? '1px dashed' : '1px solid';
  return (
    <Tooltip
      title={
        count > 0
          ? `${weekday} ${String(hour).padStart(2, '0')}:00 — ${count} ${
              count === 1 ? 'cita' : 'citas'
            }`
          : `${weekday} ${String(hour).padStart(2, '0')}:00 — sin citas`
      }
      arrow
      placement="top"
    >
      <Box
        sx={{
          aspectRatio: '1 / 1',
          minHeight: 18,
          borderRadius: 0.5,
          bgcolor: bg,
          border,
          borderColor: 'divider',
          cursor: count > 0 ? 'default' : undefined,
          transition: 'transform 120ms ease',
          '&:hover': {
            transform: count > 0 ? 'scale(1.15)' : undefined,
          },
        }}
      />
    </Tooltip>
  );
};


/** Map intensity 0-1 to an MUI primary-blue shade. */
function shadeForIntensity(intensity: number): string {
  // Clamp for safety.
  const alpha = Math.max(0.08, Math.min(1, intensity));
  // rgba of primary.main (#1976d2). Hardcoded so we don't need theme access.
  return `rgba(25, 118, 210, ${alpha.toFixed(2)})`;
}

export default BusyHoursHeatmap;
