import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

// Types for authentication
interface DoctorInfo {
  id: string;
  full_name: string;
  title: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname?: string;
  email: string;
  specialty: string;
  professional_license: string;
}

interface User {
  doctor: DoctorInfo;
  token: string;
  person?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  showRegister: boolean;
  setShowRegister: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // Check for existing authentication on app start
  useEffect(() => {
    const checkAuthState = async () => {
      const token = localStorage.getItem('token'); // Changed from 'auth_token' to 'token'
      const doctorData = localStorage.getItem('doctor_data');
      
      if (token && doctorData) {
        try {
          const doctor = JSON.parse(doctorData);
          setUser({ doctor, token });
        } catch (error) {
          console.error('Error parsing stored auth data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('doctor_data');
        }
      }
      
      // Add a minimum loading time to prevent blinking
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsLoading(false);
    };
    
    checkAuthState();
  }, []);

  // Listen for auth expiration events from API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      console.log('🔄 Auth expired event received, logging out user...');
      setUser(null);
      setShowRegister(false);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const data = await apiService.login(email, password);
        
        // Store authentication data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('doctor_data', JSON.stringify(data.user));
        
        setUser({
          doctor: data.user,
          token: data.access_token
        });
        
        setIsLoading(false);
        return true;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token'); // Changed from 'auth_token' to 'token'
    localStorage.removeItem('doctor_data');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    showRegister,
    setShowRegister
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
