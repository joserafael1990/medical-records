import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeGlobalErrorHandlers } from './utils/globalErrorHandlers';

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
