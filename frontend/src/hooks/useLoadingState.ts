import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

export interface UseLoadingStateOptions {
  initialLoading?: boolean;
  minLoadingTime?: number; // Minimum time to show loading (for better UX)
  retryAttempts?: number;
  retryDelay?: number;
}

export interface UseLoadingStateReturn<T> {
  state: LoadingState;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setData: (data: T) => void;
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
}

export function useLoadingState<T = any>(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn<T> {
  const {
    initialLoading = false,
    minLoadingTime = 300, // Show loading for at least 300ms
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    data: null
  });

  const lastAsyncFnRef = useRef<(() => Promise<T>) | null>(null);
  const currentAttemptRef = useRef(0);
  const loadingStartTimeRef = useRef<number | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      loadingStartTimeRef.current = Date.now();
    }
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, error: null, isLoading: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null
    });
    currentAttemptRef.current = 0;
    lastAsyncFnRef.current = null;
    loadingStartTimeRef.current = null;
  }, []);

  const executeWithMinTime = useCallback(async (asyncFn: () => Promise<T>): Promise<T> => {
    const startTime = loadingStartTimeRef.current || Date.now();
    
    try {
      const result = await asyncFn();
      
      // Ensure minimum loading time for better UX
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      return result;
    } catch (error) {
      // Still respect minimum loading time even for errors
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      throw error;
    }
  }, [minLoadingTime]);

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    lastAsyncFnRef.current = asyncFn;
    currentAttemptRef.current = 1;
    
    setLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const result = await executeWithMinTime(asyncFn);
      setData(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ha ocurrido un error';
      setError(errorMessage);
      return null;
    }
  }, [setLoading, setData, setError, executeWithMinTime]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastAsyncFnRef.current) {
      console.warn('No previous function to retry');
      return null;
    }

    if (currentAttemptRef.current >= retryAttempts) {
      console.warn(`Maximum retry attempts (${retryAttempts}) reached`);
      return null;
    }

    currentAttemptRef.current += 1;

    // Add delay between retries
    if (currentAttemptRef.current > 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * currentAttemptRef.current));
    }

    setLoading(true);
    setState(prev => ({ ...prev, error: null }));

    try {
      const result = await executeWithMinTime(lastAsyncFnRef.current);
      setData(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ha ocurrido un error';
      
      if (currentAttemptRef.current >= retryAttempts) {
        setError(`${errorMessage} (${retryAttempts} intentos fallidos)`);
      } else {
        setError(`${errorMessage} (Intento ${currentAttemptRef.current}/${retryAttempts})`);
      }
      return null;
    }
  }, [retryAttempts, retryDelay, setLoading, setData, setError, executeWithMinTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lastAsyncFnRef.current = null;
      currentAttemptRef.current = 0;
      loadingStartTimeRef.current = null;
    };
  }, []);

  return {
    state,
    setLoading,
    setError,
    setData,
    execute,
    retry,
    reset
  };
}

// Specialized hook for API calls
export function useApiCall<T = any>(options: UseLoadingStateOptions = {}) {
  const loadingState = useLoadingState<T>(options);

  const callApi = useCallback(async (
    apiCall: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: string) => void;
    }
  ): Promise<T | null> => {
    const result = await loadingState.execute(apiCall);
    
    if (result && options?.onSuccess) {
      options.onSuccess(result);
    }
    
    if (!result && loadingState.state.error && options?.onError) {
      options.onError(loadingState.state.error);
    }
    
    return result;
  }, [loadingState]);

  return {
    ...loadingState,
    callApi
  };
}

// Hook for multiple concurrent loading states
export function useMultipleLoadingStates<T extends Record<string, any>>(
  keys: (keyof T)[],
  options: UseLoadingStateOptions = {}
) {
  const states = keys.reduce((acc, key) => {
    acc[key] = useLoadingState(options);
    return acc;
  }, {} as Record<keyof T, UseLoadingStateReturn<any>>);

  const isAnyLoading = Object.values(states).some(state => state.state.isLoading);
  const hasAnyError = Object.values(states).some(state => state.state.error);
  const allErrors = Object.entries(states)
    .filter(([_, state]) => state.state.error)
    .map(([key, state]) => ({ key, error: state.state.error }));

  const resetAll = useCallback(() => {
    Object.values(states).forEach(state => state.reset());
  }, [states]);

  return {
    states,
    isAnyLoading,
    hasAnyError,
    allErrors,
    resetAll
  };
}
