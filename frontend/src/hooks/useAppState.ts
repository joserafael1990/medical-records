import { useState, useCallback, useRef } from 'react';

export interface UseAppStateReturn {
  // Navigation state
  activeView: string;
  setActiveView: (view: string) => void;
  
  // Message state
  successMessage: string;
  formErrorMessage: string;
  fieldErrors: { [key: string]: string };
  isSubmitting: boolean;
  
  // Message actions
  showSuccessMessage: (message: string) => void;
  setFormErrorMessage: (message: string) => void;
  setFieldErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  setIsSubmitting: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useAppState = (): UseAppStateReturn => {
  // Navigation state
  const [activeView, setActiveView] = useState('dashboard');
  
  // Message state
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show success message with auto-clear
  const showSuccessMessage = useCallback((message: string) => {
    // Clear any existing timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    
    setSuccessMessage(message);
    
    // Set new timeout
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
      successTimeoutRef.current = null;
    }, 5000);
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setSuccessMessage('');
    setFormErrorMessage('');
    setFieldErrors({});
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  }, []);

  return {
    // Navigation state
    activeView,
    setActiveView,
    
    // Message state
    successMessage,
    formErrorMessage,
    fieldErrors,
    isSubmitting,
    
    // Message actions
    showSuccessMessage,
    setFormErrorMessage,
    setFieldErrors,
    setIsSubmitting,
    clearMessages
  };
};
