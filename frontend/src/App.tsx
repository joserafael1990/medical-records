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
import './styles/disable-recharts-animations.css';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthContainer from './components/auth/AuthContainer';
import { ToastProvider } from './components/common/ToastNotification';
import { twitterTheme } from './themes/twitterTheme';
import { PublicPrivacyNotice } from './components/public/PublicPrivacyNotice';
import { LandingPage } from './components/public/LandingPage';

// Use Twitter-inspired theme consistently
const theme = twitterTheme;

const AppWithAuth: React.FC = () => {
  const { logout, isAuthenticated } = useAuth();
  const currentPath = window.location.pathname;
  
  // Check if we're on a public privacy notice page
  const isPrivacyNoticePage = currentPath.startsWith('/privacy-notice') || 
                               currentPath === '/privacy' ||
                               currentPath === '/aviso-privacidad';
  
  // If public privacy notice page, show it regardless of auth status
  if (isPrivacyNoticePage) {
    return <PublicPrivacyNotice />;
  }
  
  // If not authenticated, show auth container (login, register, forgot password, reset password)
  if (!isAuthenticated) {
    return <AuthContainer />;
  }
  
  // If authenticated, show main app
  return <AppLayout onLogout={logout} />;
};

const App: React.FC = () => {
  // App initialization - no logging needed
  
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <ToastProvider>
            <AuthProvider>
              <AppWithAuth />
            </AuthProvider>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
// Test comment for volume mount sync
