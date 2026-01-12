import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  MonitorHeart as MonitorHeartIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PatientVitalSignsHistory } from '../../hooks/useVitalSigns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Type for current consultation vital signs
interface CurrentVitalSign {
  id: number | string;
  vital_sign_id: number;
  vital_sign_name?: string;
  value: string | number;
  unit?: string;
}

interface VitalSignsEvolutionViewProps {
  patientId: number;
  patientName: string;
  onBack?: () => void; // Optional since Dialog handles closing
  fetchHistory: (patientId: number) => Promise<PatientVitalSignsHistory>;
  initialHistory?: PatientVitalSignsHistory | null; // Optional pre-loaded history
  currentVitalSigns?: CurrentVitalSign[]; // Current consultation's vital signs (including new ones)
}

// Component to render chart without animation by aggressively intercepting path creation
const NoAnimationChart: React.FC<{
  vitalSign: PatientVitalSignsHistory['vital_signs_history'][0];
  chartData: Array<{ date: string; value: number; fullDate: string | null }>;
  unit: string | null;
}> = ({ vitalSign, chartData, unit }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Track if animations have been disabled to avoid repeated work
  const animationsDisabledRef = React.useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:35', message: 'NoAnimationChart effect started', data: { vitalSignId: vitalSign.vital_sign_id, chartDataLength: chartData.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'J' }) }).catch(() => { });
    // #endregion

    let throttledTimeout: NodeJS.Timeout | null = null;

    const forceNoAnimation = () => {
      if (!containerRef.current || animationsDisabledRef.current) return;

      const svg = containerRef.current.querySelector('svg');
      if (!svg) return;

      // Find and fix the line path immediately
      const linePaths = svg.querySelectorAll('.recharts-line-curve, .recharts-line path, path.recharts-curve');
      if (linePaths.length === 0) return; // No paths yet, skip

      linePaths.forEach((path) => {
        const pathEl = path as SVGPathElement;

        // Check if already processed to avoid repeated work
        if (pathEl.dataset.animationDisabled === 'true') return;

        // CRITICAL: Remove stroke-dasharray completely to prevent drawing animation
        pathEl.removeAttribute('stroke-dasharray');
        pathEl.removeAttribute('stroke-dashoffset');
        pathEl.style.strokeDasharray = 'none';
        pathEl.style.strokeDashoffset = '0';

        // Remove all animation-related attributes and styles
        pathEl.style.animation = 'none';
        pathEl.style.transition = 'none';

        // Mark as processed
        pathEl.dataset.animationDisabled = 'true';

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:60', message: 'Path animation disabled', data: { vitalSignId: vitalSign.vital_sign_id, pathLength: pathEl.getTotalLength(), hasStrokeDasharray: !!pathEl.getAttribute('stroke-dasharray') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'J' }) }).catch(() => { });
        // #endregion
      });

      // Remove all animate elements (only once per render cycle)
      const animateElements = svg.querySelectorAll('animate, animateTransform, animateMotion, set');
      animateElements.forEach((el) => el.remove());

      // Mark as disabled after first successful run
      if (linePaths.length > 0) {
        animationsDisabledRef.current = true;
      }
    };

    // Apply immediately with throttling to avoid excessive calls
    forceNoAnimation();
    const timeout1 = setTimeout(() => {
      animationsDisabledRef.current = false; // Reset flag to allow re-check
      forceNoAnimation();
    }, 100);

    // Use MutationObserver with throttling for immediate detection
    const observer = new MutationObserver(() => {
      // Throttle observer callbacks to avoid excessive DOM manipulation
      if (throttledTimeout) return;

      throttledTimeout = setTimeout(() => {
        animationsDisabledRef.current = false; // Reset flag before checking
        forceNoAnimation();
        throttledTimeout = null;
      }, 200); // Throttle to 200ms
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: false, // Don't observe all descendants to reduce overhead
        attributes: true,
        attributeFilter: ['style', 'class', 'stroke-dasharray', 'stroke-dashoffset', 'd']
      });
    }

    return () => {
      if (throttledTimeout) clearTimeout(throttledTimeout);
      clearTimeout(timeout1);
      observer.disconnect();
      animationsDisabledRef.current = false; // Reset on cleanup
    };
  }, [chartData.length, vitalSign.vital_sign_id]); // Only depend on length, not full array

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          key={`chart-${vitalSign.vital_sign_id}-${chartData.length}`}
          data={chartData}
          margin={{ top: 20, right: 40, left: 60, bottom: 120 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={120}
            interval="preserveStartEnd"
            tick={{ fontSize: 12 }}
            label={{ value: 'Fecha', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: 14 } }}
          />
          <YAxis
            label={{ value: 'Valor', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 14 } }}
            tick={{ fontSize: 12 }}
            width={60}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value: number) => [value, 'Valor']}
            labelFormatter={(label) => `Fecha: ${label}`}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconSize={12}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1976d2"
            strokeWidth={2}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
            name={vitalSign.vital_sign_name}
            isAnimationActive={false}
            animationDuration={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const VitalSignsEvolutionView: React.FC<VitalSignsEvolutionViewProps> = ({
  patientId,
  patientName,
  onBack,
  fetchHistory,
  initialHistory,
  currentVitalSigns = []
}) => {
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:197', message: 'Component rendered with currentVitalSigns', data: { patientId, currentVitalSignsCount: currentVitalSigns?.length || 0, currentVitalSigns: currentVitalSigns?.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value })) || [], hasInitialHistory: !!initialHistory }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'L' }) }).catch(() => { });
  }, [patientId, currentVitalSigns, initialHistory]);
  // #endregion

  const [history, setHistory] = useState<PatientVitalSignsHistory | null>(initialHistory || null);
  const [loading, setLoading] = useState(!initialHistory);
  const [error, setError] = useState<string | null>(null);

  // Merge current vital signs with historical data
  const mergedHistory = React.useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:203', message: 'Merging current vital signs with history', data: { hasHistory: !!history, currentVitalSignsCount: currentVitalSigns?.length || 0, historyVitalSignsCount: history?.vital_signs_history?.length || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
    // #endregion

    if (!history) return null;

    // If no current vital signs, return history as-is
    if (!currentVitalSigns || currentVitalSigns.length === 0) {
      return history;
    }

    // Group current vital signs by vital_sign_id and keep only the most recent one for each type
    // (to avoid duplicates when user adds/edits the same vital sign multiple times)
    const latestVitalSignsByType = currentVitalSigns.reduce((acc, cvs) => {
      const existing = acc[cvs.vital_sign_id];
      // Keep the one with the highest ID (most recently added) or if no existing, use current
      if (!existing || (typeof cvs.id === 'number' && typeof existing.id === 'number' && cvs.id > existing.id)) {
        acc[cvs.vital_sign_id] = cvs;
      }
      return acc;
    }, {} as Record<number, CurrentVitalSign>);

    const latestVitalSigns = Object.values(latestVitalSignsByType);

    // Create a copy of the history to avoid mutating the original
    const mergedVitalSignsHistory = history.vital_signs_history.map(vsHistory => {
      // Find matching current vital sign for this vital sign type
      const matchingCurrentVS = latestVitalSigns.find(cvs =>
        cvs.vital_sign_id === vsHistory.vital_sign_id
      );

      if (!matchingCurrentVS) {
        return vsHistory;
      }

      // Check if this vital sign value is already in history (avoid duplicates)
      const currentValue = typeof matchingCurrentVS.value === 'string'
        ? parseFloat(matchingCurrentVS.value)
        : matchingCurrentVS.value;

      // Check if the most recent entry in history matches this current value
      const mostRecentHistoryEntry = vsHistory.data && vsHistory.data.length > 0
        ? vsHistory.data[vsHistory.data.length - 1]
        : null;

      const isAlreadyInHistory = mostRecentHistoryEntry &&
        Math.abs((mostRecentHistoryEntry.value || 0) - currentValue) < 0.01; // Allow small floating point differences

      if (isAlreadyInHistory) {
        return vsHistory; // Don't add duplicate
      }

      // Add current vital sign to the data array
      const currentDate = new Date().toISOString();
      const newDataPoint = {
        date: currentDate,
        value: currentValue,
        unit: matchingCurrentVS.unit || (vsHistory.data && vsHistory.data.length > 0 ? vsHistory.data[0].unit : '') || '',
        consultation_id: 0 // 0 indicates this is a temporary/current vital sign not yet saved
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:241', message: 'Adding current vital sign to history', data: { vitalSignId: vsHistory.vital_sign_id, vitalSignName: vsHistory.vital_sign_name, currentValue, existingDataPoints: vsHistory.data?.length || 0, newDataPoint }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
      // #endregion

      return {
        ...vsHistory,
        data: [...vsHistory.data, newDataPoint]
      };
    });

    // Check if there are current vital signs for types not in history
    const existingVitalSignIds = history.vital_signs_history.map(vs => vs.vital_sign_id);
    const newVitalSignTypes = latestVitalSigns.filter(cvs =>
      !existingVitalSignIds.includes(cvs.vital_sign_id)
    );

    // Add new vital sign types that aren't in history yet
    if (newVitalSignTypes.length > 0) {
      const currentDate = new Date().toISOString();
      const newVitalSignHistories = newVitalSignTypes.map(cvs => {
        const value = typeof cvs.value === 'string' ? parseFloat(cvs.value) : cvs.value;
        return {
          vital_sign_id: cvs.vital_sign_id,
          vital_sign_name: cvs.vital_sign_name || `Signo Vital ${cvs.vital_sign_id}`,
          unit: cvs.unit || '',
          data: [{
            date: currentDate,
            value: isNaN(value) ? null : value,
            unit: cvs.unit || '',
            consultation_id: 0 // 0 indicates this is a temporary/current vital sign not yet saved
          }]
        };
      });

      mergedVitalSignsHistory.push(...newVitalSignHistories);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:280', message: 'Added new vital sign types to history', data: { newVitalSignTypesCount: newVitalSignTypes.length, newVitalSignIds: newVitalSignTypes.map(vs => vs.vital_sign_id) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
      // #endregion
    }

    const result = {
      ...history,
      vital_signs_history: mergedVitalSignsHistory
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:289', message: 'Merged history completed', data: { totalVitalSignsCount: mergedVitalSignsHistory.length, mergedVitalSignsIds: mergedVitalSignsHistory.map(vs => vs.vital_sign_id) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
    // #endregion

    return result;
  }, [history, currentVitalSigns]);

  // Use ref to track previous initialHistory serialized content to avoid unnecessary updates
  const prevInitialHistorySerializedRef = React.useRef<string>('');
  const prevPatientIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:195', message: 'VitalSignsEvolutionView effect triggered', data: { patientId, hasInitialHistory: !!initialHistory, currentHistoryCount: history?.vital_signs_history?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
    // #endregion

    // If initialHistory is provided, use it (but only if it actually changed)
    if (initialHistory) {
      // Serialize initialHistory to compare actual content, not just reference
      const initialHistorySerialized = JSON.stringify(initialHistory.vital_signs_history?.map((vs: any) => ({
        vital_sign_id: vs.vital_sign_id,
        vital_sign_name: vs.vital_sign_name,
        data: vs.data?.map((d: any) => ({ date: d.date, value: d.value, unit: d.unit }))
      })));

      // Only update if initialHistory content actually changed (deep comparison)
      if (prevInitialHistorySerializedRef.current !== initialHistorySerialized) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:207', message: 'Updating history from initialHistory (content changed)', data: { initialHistoryCount: initialHistory?.vital_signs_history?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'I' }) }).catch(() => { });
        // #endregion
        prevInitialHistorySerializedRef.current = initialHistorySerialized;
        setHistory(initialHistory);
        setLoading(false);
        return;
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:214', message: 'InitialHistory unchanged, skipping update', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'I' }) }).catch(() => { });
        // #endregion
        return;
      }
    } else {
      // Clear serialized ref when initialHistory is null
      prevInitialHistorySerializedRef.current = '';
    }

    // Only fetch if patientId changed and we don't have initialHistory
    if (patientId && patientId !== prevPatientIdRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:211', message: 'PatientId changed, fetching history', data: { patientId, prevPatientId: prevPatientIdRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'J' }) }).catch(() => { });
      // #endregion
      prevPatientIdRef.current = patientId;

      const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:218', message: 'Calling fetchHistory', data: { patientId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
          // #endregion
          const data = await fetchHistory(patientId);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:222', message: 'History fetched successfully', data: { historyCount: data?.vital_signs_history?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'L' }) }).catch(() => { });
          // #endregion
          setHistory(data);
        } catch (err: any) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:226', message: 'Error fetching history', data: { error: err?.message || 'unknown' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'M' }) }).catch(() => { });
          // #endregion
          setError(err.message || 'Error al cargar el historial de signos vitales');
        } finally {
          setLoading(false);
        }
      };

      loadHistory();
    }
  }, [patientId, fetchHistory, initialHistory]);

  // Disable recharts animations via CSS and DOM manipulation after render
  // Use ref to track if animations have been disabled to avoid repeated work
  const animationsDisabledRef = React.useRef(false);

  useEffect(() => {
    if (!history || animationsDisabledRef.current) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:74', message: 'Disabling recharts animations via CSS and DOM', data: { hasHistory: !!history, vitalSignsCount: history?.vital_signs_history?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    // Disable all animations in recharts SVG elements via CSS (only once)
    const disableAnimationsCSS = () => {
      const existing = document.getElementById('recharts-disable-animations');
      if (existing) return; // Already added

      const style = document.createElement('style');
      style.id = 'recharts-disable-animations';
      style.textContent = `
        .recharts-wrapper *,
        .recharts-wrapper *::before,
        .recharts-wrapper *::after {
          animation: none !important;
          transition: none !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
        .recharts-line-curve,
        .recharts-line path,
        .recharts-line-curve path,
        path.recharts-curve {
          animation: none !important;
          transition: none !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
        svg.recharts-surface * {
          animation: none !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
    };

    // Disable animations directly on SVG elements in the DOM (debounced)
    let domDisableTimeout: NodeJS.Timeout | null = null;
    const disableAnimationsDOM = () => {
      // Debounce DOM manipulation to avoid excessive calls
      if (domDisableTimeout) {
        clearTimeout(domDisableTimeout);
      }

      domDisableTimeout = setTimeout(() => {
        const rechartsWrappers = document.querySelectorAll('.recharts-wrapper');
        rechartsWrappers.forEach((wrapper) => {
          const svg = wrapper.querySelector('svg');
          if (svg) {
            // Remove all animate elements
            const animateElements = svg.querySelectorAll('animate, animateTransform, animateMotion');
            animateElements.forEach((el) => el.remove());

            // Set animation and transition to none on all paths
            const paths = svg.querySelectorAll('path');
            paths.forEach((path) => {
              (path as SVGPathElement).style.animation = 'none';
              (path as SVGPathElement).style.transition = 'none';
              path.removeAttribute('stroke-dasharray');
              path.removeAttribute('stroke-dashoffset');
            });
          }
        });
        domDisableTimeout = null;
      }, 100); // Debounce to 100ms
    };

    disableAnimationsCSS();

    // Apply DOM manipulation after render with limited retries
    disableAnimationsDOM();
    const timeout1 = setTimeout(disableAnimationsDOM, 200);

    // Use MutationObserver with throttling to catch dynamically added elements
    let observerTimeout: NodeJS.Timeout | null = null;
    const observer = new MutationObserver(() => {
      // Throttle observer callbacks to avoid excessive DOM manipulation
      if (observerTimeout) return;

      observerTimeout = setTimeout(() => {
        disableAnimationsDOM();
        observerTimeout = null;
      }, 200); // Throttle to 200ms
    });

    // Only observe if container exists and limit observation scope
    const rechartsContainers = document.querySelectorAll('.recharts-wrapper');
    if (rechartsContainers.length > 0) {
      rechartsContainers.forEach((container) => {
        observer.observe(container, {
          childList: true,
          subtree: false, // Don't observe all descendants to reduce overhead
          attributes: true,
          attributeFilter: ['style', 'class', 'stroke-dasharray', 'stroke-dashoffset']
        });
      });
    }

    animationsDisabledRef.current = true;

    return () => {
      if (domDisableTimeout) clearTimeout(domDisableTimeout);
      if (observerTimeout) clearTimeout(observerTimeout);
      clearTimeout(timeout1);
      observer.disconnect();
      animationsDisabledRef.current = false;
    };
  }, [history]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const prepareChartData = (vitalSignData: PatientVitalSignsHistory['vital_signs_history'][0]) => {
    if (!vitalSignData || !vitalSignData.data || !Array.isArray(vitalSignData.data)) {
      return [];
    }

    return vitalSignData.data
      .filter(item => {
        // Include items with valid date and value (including 0)
        // value can be 0, so we check for !== null and !== undefined
        return item.date !== null &&
          item.date !== undefined &&
          item.value !== null &&
          item.value !== undefined;
      })
      .map(item => ({
        date: formatDate(item.date),
        value: Number(item.value), // Ensure value is a number
        fullDate: item.date
      }))
      .sort((a, b) => {
        if (!a.fullDate || !b.fullDate) return 0;
        try {
          return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime();
        } catch {
          return 0;
        }
      });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Use mergedHistory for display (includes current vital signs)
  const displayHistory = mergedHistory || history;

  if (!displayHistory || !displayHistory.vital_signs_history || displayHistory.vital_signs_history.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No hay historial de signos vitales disponible para este paciente.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'visible' }}>
      {/* Header - Only show if onBack is provided (modal view) */}
      {onBack && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Evolución de Signos Vitales
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Paciente: {displayHistory.patient_name || patientName}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={onBack}
            sx={{ minWidth: 'auto' }}
          >
            Volver
          </Button>
        </Box>
      )}

      {/* Inline header when no back button */}
      {!onBack && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChartIcon color="primary" />
            Evolución de Signos Vitales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historial completo de signos vitales del paciente
          </Typography>
        </Box>
      )}

      {/* Charts */}
      <Box sx={{ width: '100%' }}>
        {displayHistory.vital_signs_history.map((vitalSign) => {
          const chartData = prepareChartData(vitalSign);

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/79e99ab8-1534-4ccf-9bf5-0f1b2624c453', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'VitalSignsEvolutionView.tsx:285', message: 'Rendering chart', data: { vitalSignId: vitalSign.vital_sign_id, vitalSignName: vitalSign.vital_sign_name, chartDataLength: chartData.length, isAnimationActive: false, animationDuration: 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,B,E' }) }).catch(() => { });
          // #endregion

          if (chartData.length === 0) {
            return null;
          }

          // Get unit from first data item if available
          const unit = vitalSign.data && vitalSign.data.length > 0
            ? vitalSign.data.find(item => item.unit)?.unit
            : null;

          return (
            <Card key={vitalSign.vital_sign_id} sx={{ display: 'flex', flexDirection: 'column', mb: 3, width: '100%' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                  <MonitorHeartIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {vitalSign.vital_sign_name}
                    {unit && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({unit})
                      </Typography>
                    )}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    height: '450px',
                    minHeight: '450px',
                    '& .recharts-line': {
                      animation: 'none !important',
                      transition: 'none !important',
                    },
                    '& .recharts-line-curve': {
                      animation: 'none !important',
                      transition: 'none !important',
                    },
                    '& path': {
                      animation: 'none !important',
                      transition: 'none !important',
                    },
                    '& .recharts-animation-active': {
                      animation: 'none !important',
                      transition: 'none !important',
                    }
                  }}
                >
                  <NoAnimationChart
                    vitalSign={vitalSign}
                    chartData={chartData}
                    unit={unit}
                  />
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default VitalSignsEvolutionView;

