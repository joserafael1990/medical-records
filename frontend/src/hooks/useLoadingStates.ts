/**
 * Hook para manejar estados de carga específicos por contexto
 * Mejora la UX al proporcionar feedback visual detallado
 */

import { useState, useCallback, useRef } from 'react';

export type LoadingState = 
  | 'idle'
  | 'loading'
  | 'success' 
  | 'error'
  | 'retrying';

export interface LoadingContext {
  state: LoadingState;
  message?: string;
  progress?: number;
  startTime?: number;
  retryCount?: number;
}

export interface LoadingStates {
  // Index signature to allow Record<string, LoadingContext> compatibility
  [key: string]: LoadingContext;
  
  // Gestión de pacientes
  creatingPatient: LoadingContext;
  updatingPatient: LoadingContext;
  loadingPatientHistory: LoadingContext;
  loadingPatientList: LoadingContext;
  
  // Consultas médicas
  savingConsultation: LoadingContext;
  loadingConsultations: LoadingContext;
  generatingPrescription: LoadingContext;
  
  // Citas
  creatingAppointment: LoadingContext;
  updatingAppointment: LoadingContext;
  loadingCalendar: LoadingContext;
  
  // Estudios clínicos
  uploadingStudy: LoadingContext;
  processingStudy: LoadingContext;
  downloadingStudy: LoadingContext;
  
  // Perfil médico
  updatingProfile: LoadingContext;
  loadingProfile: LoadingContext;
  
  // Autenticación
  authenticating: LoadingContext;
  refreshingToken: LoadingContext;
  
  // General
  saving: LoadingContext;
  deleting: LoadingContext;
  searching: LoadingContext;
}

const createInitialContext = (): LoadingContext => ({
  state: 'idle',
  message: undefined,
  progress: undefined,
  startTime: undefined,
  retryCount: 0
});

const createInitialStates = (): LoadingStates => ({
  creatingPatient: createInitialContext(),
  updatingPatient: createInitialContext(),
  loadingPatientHistory: createInitialContext(),
  loadingPatientList: createInitialContext(),
  savingConsultation: createInitialContext(),
  loadingConsultations: createInitialContext(),
  generatingPrescription: createInitialContext(),
  creatingAppointment: createInitialContext(),
  updatingAppointment: createInitialContext(),
  loadingCalendar: createInitialContext(),
  uploadingStudy: createInitialContext(),
  processingStudy: createInitialContext(),
  downloadingStudy: createInitialContext(),
  updatingProfile: createInitialContext(),
  loadingProfile: createInitialContext(),
  authenticating: createInitialContext(),
  refreshingToken: createInitialContext(),
  saving: createInitialContext(),
  deleting: createInitialContext(),
  searching: createInitialContext()
});

export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>(createInitialStates);
  const timeoutRefs = useRef<Map<keyof LoadingStates, NodeJS.Timeout>>(new Map());

  const setLoadingState = useCallback((
    context: keyof LoadingStates, 
    state: LoadingState, 
    options?: {
      message?: string;
      progress?: number;
      autoReset?: boolean;
      resetDelay?: number;
    }
  ) => {
    const { message, progress, autoReset = false, resetDelay = 3000 } = options || {};
    
    setLoadingStates(prev => ({
      ...prev,
      [context]: {
        ...prev[context],
        state,
        message,
        progress,
        startTime: state === 'loading' ? Date.now() : prev[context].startTime,
        retryCount: state === 'retrying' 
          ? (prev[context].retryCount || 0) + 1 
          : prev[context].retryCount || 0
      }
    }));

    // Clear any existing timeout for this context
    const existingTimeout = timeoutRefs.current.get(context);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Auto-reset para estados success/error si se especifica
    if (autoReset && (state === 'success' || state === 'error')) {
      const timeout = setTimeout(() => {
        setLoadingStates(prev => ({
          ...prev,
          [context]: createInitialContext()
        }));
        timeoutRefs.current.delete(context);
      }, resetDelay);
      
      timeoutRefs.current.set(context, timeout);
    }
  }, []);

  const resetLoadingState = useCallback((context: keyof LoadingStates) => {
    setLoadingStates(prev => ({
      ...prev,
      [context]: createInitialContext()
    }));
    
    const timeout = timeoutRefs.current.get(context);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(context);
    }
  }, []);

  const resetAllLoadingStates = useCallback(() => {
    setLoadingStates(createInitialStates());
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(context => 
      context.state === 'loading' || context.state === 'retrying'
    );
  }, [loadingStates]);

  const getLoadingDuration = useCallback((context: keyof LoadingStates): number => {
    const loadingContext = loadingStates[context];
    if (!loadingContext.startTime || loadingContext.state === 'idle') {
      return 0;
    }
    return Date.now() - loadingContext.startTime;
  }, [loadingStates]);

  // Helper functions para contextos específicos
  const startLoading = useCallback((context: keyof LoadingStates, message?: string) => {
    setLoadingState(context, 'loading', { message });
  }, [setLoadingState]);

  const finishLoading = useCallback((
    context: keyof LoadingStates, 
    success: boolean, 
    message?: string
  ) => {
    setLoadingState(context, success ? 'success' : 'error', { 
      message, 
      autoReset: true,
      resetDelay: success ? 2000 : 5000 
    });
  }, [setLoadingState]);

  const retryLoading = useCallback((context: keyof LoadingStates, message?: string) => {
    setLoadingState(context, 'retrying', { message });
  }, [setLoadingState]);

  return {
    loadingStates,
    setLoadingState,
    resetLoadingState,
    resetAllLoadingStates,
    isAnyLoading,
    getLoadingDuration,
    startLoading,
    finishLoading,
    retryLoading
  };
};

export default useLoadingStates;

