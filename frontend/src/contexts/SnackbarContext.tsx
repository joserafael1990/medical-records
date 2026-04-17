import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, AlertColor, Snackbar } from '@mui/material';

type Severity = AlertColor; // 'success' | 'info' | 'warning' | 'error'

interface SnackbarMessage {
  id: number;
  message: string;
  severity: Severity;
  autoHideDuration: number;
}

interface SnackbarContextValue {
  notify: (message: string, severity?: Severity, options?: { durationMs?: number }) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  warning: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

const DEFAULT_DURATION: Record<Severity, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6500,
};

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<SnackbarMessage | null>(null);
  const [queue, setQueue] = useState<SnackbarMessage[]>([]);

  const enqueue = useCallback((message: string, severity: Severity, durationMs?: number) => {
    const entry: SnackbarMessage = {
      id: Date.now() + Math.random(),
      message,
      severity,
      autoHideDuration: durationMs ?? DEFAULT_DURATION[severity],
    };
    setQueue((prev) => (current ? [...prev, entry] : prev));
    setCurrent((prev) => prev ?? entry);
  }, [current]);

  const handleClose = useCallback((_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setCurrent(null);
    // Shift next off the queue after the close animation
    setTimeout(() => {
      setQueue((prev) => {
        if (prev.length === 0) return prev;
        const [next, ...rest] = prev;
        setCurrent(next);
        return rest;
      });
    }, 180);
  }, []);

  const value = useMemo<SnackbarContextValue>(
    () => ({
      notify: (message, severity = 'info', options) => enqueue(message, severity, options?.durationMs),
      success: (m, d) => enqueue(m, 'success', d),
      error: (m, d) => enqueue(m, 'error', d),
      warning: (m, d) => enqueue(m, 'warning', d),
      info: (m, d) => enqueue(m, 'info', d),
    }),
    [enqueue]
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={current?.autoHideDuration ?? 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {current ? (
          <Alert
            onClose={() => handleClose()}
            severity={current.severity}
            variant="filled"
            sx={{ width: '100%', minWidth: 280 }}
          >
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used inside <SnackbarProvider>');
  return ctx;
}
