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
  displayHistoryVersion?: number; // Added prop
  currentVitalSignsVersion?: number; // Added prop
}> = ({ vitalSign, chartData, unit, displayHistoryVersion = 0, currentVitalSignsVersion = 0 }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Track if animations have been disabled to avoid repeated work
  const animationsDisabledRef = React.useRef(false);
  const prevChartDataRef = React.useRef<string>('');

  // Track data changes to force re-render
  const [dataVersion, setDataVersion] = React.useState(0);
  const prevChartDataRef2 = React.useRef<string>('');

  useEffect(() => {
    // Reset animation disabled flag when chartData actually changes
    const chartDataKey = JSON.stringify(chartData.map(d => ({ date: d.date, value: d.value })));
    if (chartDataKey !== prevChartDataRef2.current) {
      animationsDisabledRef.current = false;
      prevChartDataRef2.current = chartDataKey;
      setDataVersion(prev => prev + 1);
      console.log('[NoAnimationChart] ⚠️ Chart data changed, resetting animation flag and incrementing version', {
        vitalSignId: vitalSign.vital_sign_id,
        chartDataLength: chartData.length,
        lastValue: chartData[chartData.length - 1]?.value,
        newVersion: dataVersion + 1,
        chartDataKey
      });
    }

    if (!containerRef.current) return;


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
  }, [chartData.length, vitalSign.vital_sign_id, JSON.stringify(chartData.map(d => ({ date: d.date, value: d.value }))), dataVersion, displayHistoryVersion, currentVitalSignsVersion]); // Depend on data content and version to detect changes

  return (
    <div ref={containerRef} key={`chart-container-${vitalSign.vital_sign_id}-${dataVersion}-v${displayHistoryVersion}-cv${currentVitalSignsVersion}`} style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          key={`chart-${vitalSign.vital_sign_id}-${chartData.length}-${chartData[chartData.length - 1]?.value || ''}-${chartData[chartData.length - 1]?.date || ''}-v${displayHistoryVersion}-cv${currentVitalSignsVersion}-dv${dataVersion}`}
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
            isAnimationActive={true}
            animationDuration={300}
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
  const [history, setHistory] = useState<PatientVitalSignsHistory | null>(initialHistory || null);
  const [loading, setLoading] = useState(!initialHistory);
  const [error, setError] = useState<string | null>(null);

  // Force re-render when currentVitalSigns changes by using a state variable
  const [currentVitalSignsVersion, setCurrentVitalSignsVersion] = React.useState(0);
  const prevCurrentVitalSignsSerializedRef = React.useRef<string>('');
  const [forceUpdate, setForceUpdate] = React.useState(0);
  
  // Debug logging and version tracking
  useEffect(() => {
    const serialized = JSON.stringify(currentVitalSigns?.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value })) || []);
    
    console.log('[VitalSignsEvolutionView] currentVitalSigns useEffect triggered', {
      serialized,
      prevSerialized: prevCurrentVitalSignsSerializedRef.current,
      currentVitalSigns: currentVitalSigns?.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value })),
      changed: serialized !== prevCurrentVitalSignsSerializedRef.current
    });
    
    // Only update version if content actually changed
    if (serialized !== prevCurrentVitalSignsSerializedRef.current) {
      prevCurrentVitalSignsSerializedRef.current = serialized;
      setCurrentVitalSignsVersion(prev => {
        const newVersion = prev + 1;
        console.log('[VitalSignsEvolutionView] currentVitalSigns changed, version:', newVersion, 'data:', currentVitalSigns);
        // Force a re-render by updating forceUpdate
        setForceUpdate(newVersion);
        return newVersion;
      });
    }
    
  }, [currentVitalSigns]);

  // Create a stable key from currentVitalSigns to ensure mergedHistory recomputes when content changes
  // Group by vital_sign_id and keep only the most recent one (same logic as in mergedHistory)
  const currentVitalSignsKey = React.useMemo(() => {
    if (!currentVitalSigns || currentVitalSigns.length === 0) return '';
    // Group by vital_sign_id and keep only the most recent one (same as mergedHistory logic)
    const latestVitalSignsByType = currentVitalSigns.reduce((acc, cvs) => {
      const existing = acc[cvs.vital_sign_id];
      if (!existing || (typeof cvs.id === 'number' && typeof existing.id === 'number' && cvs.id > existing.id)) {
        acc[cvs.vital_sign_id] = cvs;
      }
      return acc;
    }, {} as Record<number, typeof currentVitalSigns[0]>);
    const latestVitalSigns = Object.values(latestVitalSignsByType);
    const key = latestVitalSigns.map(vs => `${vs.vital_sign_id}:${vs.value}:${vs.id}`).join('|');
    console.log('[VitalSignsEvolutionView] currentVitalSignsKey:', key, 'from', currentVitalSigns, 'filtered to', latestVitalSigns);
    return key;
  }, [currentVitalSigns]);

  // Merge current vital signs with historical data
  const mergedHistory = React.useMemo(() => {
    console.log('[VitalSignsEvolutionView] mergedHistory recomputing', {
      hasHistory: !!history,
      currentVitalSignsCount: currentVitalSigns?.length,
      currentVitalSignsKey,
      currentVitalSigns: currentVitalSigns?.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value }))
    });
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
        // Return new object reference even if no changes
        return {
          ...vsHistory,
          data: vsHistory.data ? [...vsHistory.data] : []
        };
      }

      // Check if this vital sign value is already in history (avoid duplicates on the same day)
      const currentValue = typeof matchingCurrentVS.value === 'string'
        ? parseFloat(matchingCurrentVS.value)
        : matchingCurrentVS.value;

      if (isNaN(currentValue)) {
        return vsHistory;
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if there's already an entry for "today" in the history
      // If so, we'll replace/update it. If not, we'll add it.
      const existingTodayIndex = vsHistory.data ? vsHistory.data.findIndex(d => d.date && d.date.startsWith(today)) : -1;

      const newDataPoint = {
        date: new Date().toISOString(),
        value: currentValue,
        unit: matchingCurrentVS.unit || (vsHistory.data && vsHistory.data.length > 0 ? vsHistory.data[0].unit : '') || '',
        consultation_id: 0 // 0 indicates this is a temporary/current vital sign not yet saved
      };


      if (existingTodayIndex >= 0) {
        // Update existing today's point - create completely new array with new object
        const newData = vsHistory.data.map((item, index) => 
          index === existingTodayIndex ? { ...newDataPoint } : { ...item }
        );
        const oldValue = vsHistory.data[existingTodayIndex]?.value;
        console.log('[VitalSignsEvolutionView] ⚠️ UPDATING EXISTING TODAY POINT', {
          vitalSignId: vsHistory.vital_sign_id,
          vitalSignName: vsHistory.vital_sign_name,
          oldValue,
          newValue: newDataPoint.value,
          newDataLength: newData.length,
          existingTodayIndex,
          oldDataLength: vsHistory.data?.length,
          newData: newData.map(d => ({ date: d.date, value: d.value }))
        });
        // CRITICAL: Return completely new object to ensure React detects the change
        return {
          ...vsHistory,
          vital_sign_id: vsHistory.vital_sign_id,
          vital_sign_name: vsHistory.vital_sign_name,
          data: [...newData] // Create new array reference
        };
      } else {
        // Add new point for today
        return {
          ...vsHistory,
          data: [...(vsHistory.data || []), newDataPoint]
        };
      }
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
    }

    console.log('[VitalSignsEvolutionView] mergedHistory computed', {
      mergedHistoryLength: mergedVitalSignsHistory.length,
      newVitalSignTypesAdded: newVitalSignTypes.length,
      currentVitalSignsVersion,
      currentVitalSignsKey,
      latestVitalSigns: latestVitalSigns.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value }))
    });
    // Always create a new object reference to ensure React detects the change
    const result = {
      ...history,
      vital_signs_history: [...mergedVitalSignsHistory] // Create new array reference
    };
    console.log('[VitalSignsEvolutionView] mergedHistory computed result', {
      vitalSignsHistoryLength: result.vital_signs_history.length,
      firstVitalSign: result.vital_signs_history[0] ? {
        vital_sign_id: result.vital_signs_history[0].vital_sign_id,
        data_length: result.vital_signs_history[0].data?.length,
        lastValue: result.vital_signs_history[0].data?.[result.vital_signs_history[0].data.length - 1]?.value
      } : null
    });
    return result;
  }, [history, currentVitalSignsKey, currentVitalSignsVersion, JSON.stringify(currentVitalSigns?.map(vs => ({ id: vs.id, vital_sign_id: vs.vital_sign_id, value: vs.value })) || [])]); // Include serialized currentVitalSigns as fallback

  // Use ref to track previous initialHistory serialized content to avoid unnecessary updates
  const prevInitialHistorySerializedRef = React.useRef<string>('');
  const prevPatientIdRef = React.useRef<number | null>(null);

  useEffect(() => {

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
        prevInitialHistorySerializedRef.current = initialHistorySerialized;
        setHistory(initialHistory);
        setLoading(false);
        return;
      } else {
        return;
      }
    } else {
      // Clear serialized ref when initialHistory is null
      prevInitialHistorySerializedRef.current = '';
    }

    // Only fetch if patientId changed and we don't have initialHistory
    if (patientId && patientId !== prevPatientIdRef.current) {
      prevPatientIdRef.current = patientId;

      const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await fetchHistory(patientId);
          setHistory(data);
        } catch (err: any) {
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
  
  // Force re-render when currentVitalSigns changes by tracking a serialized version
  const [displayHistoryVersion, setDisplayHistoryVersion] = React.useState(0);
  const prevMergedHistorySerializedRef = React.useRef<string>('');
  
  React.useEffect(() => {
    if (mergedHistory) {
      const serialized = JSON.stringify(mergedHistory.vital_signs_history?.map((vs: any) => ({
        vital_sign_id: vs.vital_sign_id,
        data_length: vs.data?.length,
        last_value: vs.data?.[vs.data.length - 1]?.value,
        last_date: vs.data?.[vs.data.length - 1]?.date
      })));
      
      // Only update version if the serialized content actually changed
      if (serialized !== prevMergedHistorySerializedRef.current) {
        prevMergedHistorySerializedRef.current = serialized;
        setDisplayHistoryVersion(prev => {
          const newVersion = prev + 1;
          console.log('[VitalSignsEvolutionView] displayHistoryVersion changed:', newVersion, 'serialized:', serialized);
          return newVersion;
        });
      }
    }
  }, [mergedHistory]);
  

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
          // Force new array reference by spreading and ensure each object is new
          const rawChartData = prepareChartData(vitalSign);
          const chartData = rawChartData.map(item => ({ ...item })); // Create new object references

          console.log('[VitalSignsEvolutionView] Rendering chart for', vitalSign.vital_sign_name, {
            chartDataLength: chartData.length,
            lastValue: chartData[chartData.length - 1]?.value,
            lastDate: chartData[chartData.length - 1]?.date,
            displayHistoryVersion,
            currentVitalSignsVersion,
            vitalSignDataLength: vitalSign.data?.length,
            chartDataRef: chartData,
            rawChartDataLength: rawChartData.length,
            vitalSignData: vitalSign.data?.map(d => ({ date: d.date, value: d.value }))
          });

          if (chartData.length === 0) {
            return null;
          }

          // Get unit from first data item if available
          const unit = vitalSign.data && vitalSign.data.length > 0
            ? vitalSign.data.find(item => item.unit)?.unit
            : null;

          // Create a stable key that includes all data points to force re-render when data changes
          // Use the actual last data point value and date for more precise change detection
          const lastDataPoint = chartData[chartData.length - 1];
          const dataKey = `${chartData.length}-${lastDataPoint?.value || ''}-${lastDataPoint?.date || ''}`;
          // Include both versions in the key to ensure re-render
          const cardKey = `${vitalSign.vital_sign_id}-${dataKey}-v${displayHistoryVersion}-cv${currentVitalSignsVersion}`;

          return (
            <Card key={cardKey} sx={{ display: 'flex', flexDirection: 'column', mb: 3, width: '100%' }}>
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
                    key={`no-anim-chart-${vitalSign.vital_sign_id}-${chartData.length}-${chartData[chartData.length - 1]?.value || ''}-${displayHistoryVersion}-cv${currentVitalSignsVersion}`}
                    vitalSign={vitalSign}
                    chartData={chartData}
                    unit={unit}
                    displayHistoryVersion={displayHistoryVersion}
                    currentVitalSignsVersion={currentVitalSignsVersion}
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

