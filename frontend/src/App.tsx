import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './styles/disable-payment-detection.css';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/common/ToastNotification';
import { twitterTheme } from './themes/twitterTheme';

// Use Twitter-inspired theme consistently
const theme = twitterTheme;

const AppWithAuth: React.FC = () => {
  const { logout } = useAuth();
  
  return <AppLayout onLogout={logout} />;
};

const App: React.FC = () => {
  console.log('🚀 CORTEX App iniciando con React + Material-UI');
  
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <ToastProvider>
            <AuthProvider>
              <ProtectedRoute>
                <AppWithAuth />
              </ProtectedRoute>
            </AuthProvider>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
// Test comment for volume mount sync
