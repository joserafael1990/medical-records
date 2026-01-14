import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseAppStateReturn {
  // Navigation state
  activeView: string;
  setActiveView: (view: string) => void;
  navigateToView: (view: string) => void;
  
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
  
  // Initialize view from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewFromUrl = urlParams.get('view') || 'dashboard';
    setActiveView(viewFromUrl);
    
    // Update URL if it doesn't match current view
    if (viewFromUrl !== 'dashboard') {
      updateUrl(viewFromUrl);
    }
  }, []);
  
  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const urlParams = new URLSearchParams(window.location.search);
      const viewFromUrl = urlParams.get('view') || 'dashboard';
      setActiveView(viewFromUrl);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Function to update URL without adding to history
  const updateUrl = (view: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState({ view }, '', url.toString());
  };
  
  // Function to navigate and add to history
  const navigateToView = (view: string) => {
    setActiveView(view);
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.pushState({ view }, '', url.toString());
  };

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
    navigateToView,
    
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
