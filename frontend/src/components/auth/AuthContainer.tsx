import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginView from './LoginView';
import RegisterView from './RegisterView';

const AuthContainer: React.FC = () => {
  const { showRegister, setShowRegister } = useAuth();

  if (showRegister) {
    return (
      <RegisterView 
        onBackToLogin={() => setShowRegister(false)} 
      />
    );
  }

  return <LoginView />;
};

export default AuthContainer;
