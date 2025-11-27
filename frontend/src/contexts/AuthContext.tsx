import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services';
import { trackAmplitudeEvent, identifyAmplitudeUser, resetAmplitudeUser } from '../utils/amplitudeHelper';

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
  appointment_duration?: number; // Duration of appointments in minutes
}

interface User {
  doctor: DoctorInfo;
  token: string;
  person?: any;
}

interface LoginResult {
  success: boolean;
  error?: string;
  errorType?: string;
  canRetry?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
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
      const token = localStorage.getItem('token');
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

  const login = async (email: string, password: string): Promise<LoginResult> => {
    // No loading state - direct processing
    
    try {
      console.log('🔐 AuthContext.login: Starting login for:', email);
      const data = await apiService.auth.login({ email, password });
      console.log('🔐 AuthContext.login: Login successful, data received:', { 
        hasAccessToken: !!data?.access_token,
        hasUser: !!data?.user,
        userId: data?.user?.id 
      });
        
      // Store authentication data
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('doctor_data', JSON.stringify(data.user));
      
      // Transform user data to match DoctorInfo interface
      const doctorInfo: DoctorInfo = {
        id: String(data.user.id),
        full_name: `${data.user.title || 'Dr.'} ${data.user.first_name} ${data.user.paternal_surname} ${data.user.maternal_surname || ''}`.trim(),
        title: data.user.title || 'Dr.',
        first_name: data.user.first_name,
        paternal_surname: data.user.paternal_surname,
        maternal_surname: data.user.maternal_surname || '',
        email: data.user.email,
        specialty: '', // Will be loaded from profile
        professional_license: '' // Will be loaded from profile
      };
      
      console.log('🔐 AuthContext.login: Setting user:', doctorInfo);
      setUser({
        doctor: doctorInfo,
        token: data.access_token
      });
      
      // Track login in Amplitude
      trackAmplitudeEvent('login_successful');
      // Use email as user ID for better identification in Amplitude
      // Location will be obtained from browser automatically
      identifyAmplitudeUser(data.user.email, {
        user_type: 'doctor',
        user_id: String(data.user.id), // Keep numeric ID as property
        specialty: data.user.specialty || 'unknown',
        title: data.user.title || 'Dr.',
        first_name: data.user.first_name,
        last_name: data.user.paternal_surname
      }).catch(() => {
        // Silently fail - Amplitude tracking is non-critical
      });
      
      console.log('🔐 AuthContext.login: Login completed successfully');
      return { success: true };
    } catch (error: any) {
      // Track failed login attempt
      trackAmplitudeEvent('login_failed', {
        error_type: error?.status === 401 ? 'invalid_credentials' : 'connection_error'
      });
      
      console.error('🔐 AuthContext.login: Error caught:', error);
      console.error('🔐 AuthContext.login: Error details:', {
        message: error?.message,
        status: error?.status,
        response: error?.response?.data,
        stack: error?.stack
      });
      
      // Handle specific error messages with better UX
      // The error is already transformed by ApiBase and has message, status, and details
      let errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet y vuelve a intentar.';
      let errorType = 'connection';
      
      // Extract error information from transformed ApiError format
      // ApiBase transforms errors to have: message, status, details.detail
      const status = error?.status || error?.response?.status;
      const message = error?.message || error?.details?.detail || error?.response?.data?.detail;
      
      if (status !== undefined) {
        switch (status) {
          case 401:
            // Use the message from backend if available (e.g., "Credenciales inválidas")
            if (message && (message.includes('Credenciales') || message.includes('credentials') || message.includes('Invalid'))) {
              errorMessage = message; // Use backend message directly
            } else {
              errorMessage = 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.';
            }
            errorType = 'credentials';
            break;
            
          case 403:
            errorMessage = 'Tu cuenta no tiene permisos para acceder al sistema. Contacta al administrador.';
            errorType = 'permissions';
            break;
            
          case 422:
            if (message?.includes('email')) {
              errorMessage = 'Por favor, ingresa un correo electrónico válido.';
              errorType = 'validation';
            } else if (message?.includes('password')) {
              errorMessage = 'La contraseña no cumple con los requisitos mínimos.';
              errorType = 'validation';
            } else {
              errorMessage = message || 'Los datos ingresados no son válidos. Por favor, revisa la información.';
              errorType = 'validation';
            }
            break;
            
          case 429:
            errorMessage = 'Demasiados intentos de inicio de sesión. Por favor, espera unos minutos antes de intentar de nuevo.';
            errorType = 'rate_limit';
            break;
            
          case 500:
            errorMessage = 'Error interno del servidor. Nuestro equipo técnico ha sido notificado. Por favor, inténtalo más tarde.';
            errorType = 'server';
            break;
            
          case 502:
          case 503:
          case 504:
            errorMessage = 'El servicio no está disponible temporalmente. Por favor, inténtalo en unos minutos.';
            errorType = 'service_unavailable';
            break;
            
          case 0:
            errorMessage = 'No se pudo conectar al servidor. Por favor:\n• Verifica tu conexión a internet\n• Comprueba que el servidor esté funcionando\n• Inténtalo de nuevo en unos momentos';
            errorType = 'network';
            break;
            
          case 408:
            errorMessage = 'Tiempo de espera agotado. El servidor tardó demasiado en responder. Inténtalo de nuevo.';
            errorType = 'timeout';
            break;
            
          default:
            // Use backend message if available, otherwise use generic message
            if (message && typeof message === 'string') {
              errorMessage = message;
              errorType = 'custom';
            } else {
              errorMessage = `Error ${status}: No se pudo completar el inicio de sesión. Contacta al soporte técnico si el problema persiste.`;
              errorType = 'unknown';
            }
            break;
        }
      } 
      // Fallback for legacy Axios error format (if error was not transformed)
      else if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail;
        
        switch (status) {
          case 401:
            errorMessage = detail || 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.';
            errorType = 'credentials';
            break;
          case 403:
            errorMessage = 'Tu cuenta no tiene permisos para acceder al sistema. Contacta al administrador.';
            errorType = 'permissions';
            break;
          default:
            errorMessage = detail || `Error ${status}: No se pudo completar el inicio de sesión.`;
            errorType = 'unknown';
            break;
        }
      } 
      // Handle network errors
      else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor. Por favor:\n• Verifica tu conexión a internet\n• Comprueba que el servidor esté funcionando\n• Inténtalo de nuevo en unos momentos';
        errorType = 'network';
      } 
      // Handle unexpected errors
      else {
        errorMessage = 'Error inesperado durante el inicio de sesión. Por favor, recarga la página e inténtalo de nuevo.';
        errorType = 'unexpected';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        errorType: errorType,
        canRetry: ['connection', 'network', 'server', 'service_unavailable', 'rate_limit', 'timeout'].includes(errorType)
      };
    }
  };

  const logout = () => {
    // Track logout in Amplitude
    trackAmplitudeEvent('logout');
    resetAmplitudeUser();
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
