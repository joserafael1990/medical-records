import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginView from './LoginView';
import RegisterView from './RegisterView';
import ForgotPasswordView from './ForgotPasswordView';
import ResetPasswordView from './ResetPasswordView';

const AuthContainer: React.FC = () => {
  const { showRegister, setShowRegister } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen to pathname changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Check pathname on mount
    handleLocationChange();

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);

    // Poll for pathname changes (since we're using window.location.href)
    const interval = setInterval(() => {
      if (window.location.pathname !== currentPath) {
        handleLocationChange();
      }
    }, 100);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [currentPath]);

  // Handle password reset route
  if (currentPath === '/reset-password') {
    return <ResetPasswordView />;
  }

  // Handle forgot password route
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordView />;
  }

  // Handle register view
  if (showRegister) {
    return (
      <RegisterView 
        onBackToLogin={() => setShowRegister(false)} 
      />
    );
  }

  // Default: Login view
  return <LoginView />;
};

export default AuthContainer;
