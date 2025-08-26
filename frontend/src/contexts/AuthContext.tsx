import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app start
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const doctorData = localStorage.getItem('doctor_data');
    
    if (token && doctorData) {
      try {
        const doctor = JSON.parse(doctorData);
        setUser({ doctor, token });
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('doctor_data');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store authentication data
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('doctor_data', JSON.stringify(data.doctor));
        
        setUser({
          doctor: data.doctor,
          token: data.access_token
        });
        
        setIsLoading(false);
        return true;
      } else {
        console.error('Login failed:', response.statusText);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error - Backend not available, using fallback mode:', error);
      
      // Fallback mode: If backend is not available, simulate login with default doctor
      if (username === 'dr.moreno' && password === 'password123') {
        const fallbackDoctor = {
          id: 'DR001',
          full_name: 'Lic. Gloria Adriana Moreno',
          title: 'Lic.',
          first_name: 'Gloria',
          paternal_surname: 'Adriana',
          maternal_surname: 'Moreno',
          email: 'dr.garcia@historias.com',
          specialty: 'Medicina General',
          professional_license: '12345678'
        };
        
        // Store fallback authentication data
        localStorage.setItem('auth_token', 'fallback_token');
        localStorage.setItem('doctor_data', JSON.stringify(fallbackDoctor));
        
        setUser({
          doctor: fallbackDoctor,
          token: 'fallback_token'
        });
        
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('doctor_data');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user
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
