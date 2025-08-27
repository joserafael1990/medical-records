import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import AuthContainer from './AuthContainer';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          backgroundColor: '#f5f5f5',
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        <CircularProgress 
          size={40}
          sx={{ 
            color: '#1976d2',
            mb: 2 
          }} 
        />
        <Box sx={{ textAlign: 'center', opacity: 0.7 }}>
          Cargando AVANT...
        </Box>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          transition: 'opacity 0.3s ease-in-out',
          minHeight: '100vh'
        }}
      >
        <AuthContainer />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        transition: 'opacity 0.3s ease-in-out',
        minHeight: '100vh'
      }}
    >
      {children}
    </Box>
  );
};

export default ProtectedRoute;
