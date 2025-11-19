import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeGlobalErrorHandlers } from './utils/globalErrorHandlers';
import * as Sentry from '@sentry/react';

// Initialize Sentry for error monitoring (frontend)
// Solo se activa si REACT_APP_SENTRY_DSN está definido (solo en producción)
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 0.0,
  enabled: Boolean(process.env.REACT_APP_SENTRY_DSN), // Solo si hay DSN
});

// Initialize global error handlers to catch unhandled errors
initializeGlobalErrorHandlers();

console.log('🚀 Iniciando CORTEX con React + Material-UI...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
