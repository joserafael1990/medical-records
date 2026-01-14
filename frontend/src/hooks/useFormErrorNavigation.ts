/**
 * Hook para navegación automática a errores en formularios
 * Mejora la UX al guiar al usuario directamente a los campos con problemas
 */

import { useCallback, useRef } from 'react';

export interface ErrorField {
  fieldName: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  element?: HTMLElement;
  position?: {
    top: number;
    left: number;
  };
}

export interface FormSection {
  id: string;
  name: string;
  element?: HTMLElement;
  errorCount: number;
  isVisible: boolean;
}

export interface ErrorNavigationOptions {
  scrollBehavior?: 'smooth' | 'auto';
  scrollOffset?: number;
  focusElement?: boolean;
  highlightDuration?: number;
  skipWarnings?: boolean;
  groupBySection?: boolean;
}

const DEFAULT_OPTIONS: ErrorNavigationOptions = {
  scrollBehavior: 'smooth',
  scrollOffset: 80, // Account for fixed headers
  focusElement: true,
  highlightDuration: 2000,
  skipWarnings: false,
  groupBySection: true
};

export const useFormErrorNavigation = (options: ErrorNavigationOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const errorElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const highlightTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Register form elements for error navigation
  const registerField = useCallback((fieldName: string, element: HTMLElement) => {
    if (element) {
      errorElementsRef.current.set(fieldName, element);
    }
  }, []);

  const unregisterField = useCallback((fieldName: string) => {
    errorElementsRef.current.delete(fieldName);
    
    // Clear any existing highlight timeout
    const timeout = highlightTimeouts.current.get(fieldName);
    if (timeout) {
      clearTimeout(timeout);
      highlightTimeouts.current.delete(fieldName);
    }
  }, []);

  // Find all form fields with errors
  const findErrorFields = useCallback((
    fieldErrors: Record<string, string>,
    validationErrors?: Record<string, any>
  ): ErrorField[] => {
    const errorFields: ErrorField[] = [];

    // Add field validation errors
    Object.entries(fieldErrors).forEach(([fieldName, message]) => {
      if (message) {
        const element = errorElementsRef.current.get(fieldName) || 
                        document.querySelector(`[name="${fieldName}"]`) as HTMLElement ||
                        document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement;

        errorFields.push({
          fieldName,
          message,
          severity: 'error',
          element: element || undefined,
          position: element ? getElementPosition(element) : undefined
        });
      }
    });

    // Add real-time validation errors
    if (validationErrors) {
      Object.entries(validationErrors).forEach(([fieldName, validation]) => {
        if (validation && !validation.isValid && !config.skipWarnings || validation.severity === 'error') {
          const element = errorElementsRef.current.get(fieldName) || 
                          document.querySelector(`[name="${fieldName}"]`) as HTMLElement;

          errorFields.push({
            fieldName,
            message: validation.message,
            severity: validation.severity || 'error',
            element: element || undefined,
            position: element ? getElementPosition(element) : undefined
          });
        }
      });
    }

    return errorFields.sort((a, b) => {
      // Sort by position (top to bottom)
      if (a.position && b.position) {
        return a.position.top - b.position.top;
      }
      // Errors first, then warnings
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      return 0;
    });
  }, [config.skipWarnings]);

  // Get element position relative to document
  const getElementPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX
    };
  };

  // Scroll to specific element
  const scrollToElement = useCallback((element: HTMLElement) => {
    const elementPosition = getElementPosition(element);
    const targetPosition = elementPosition.top - config.scrollOffset!;

    window.scrollTo({
      top: Math.max(0, targetPosition),
      behavior: config.scrollBehavior
    });

    // Focus the element if it's focusable
    if (config.focusElement) {
      setTimeout(() => {
        if (element.focus && typeof element.focus === 'function') {
          element.focus();
        }
        // For Material-UI components, try to focus the input inside
        const input = element.querySelector('input, textarea, select') as HTMLElement;
        if (input && input.focus) {
          input.focus();
        }
      }, 100);
    }
  }, [config.scrollBehavior, config.scrollOffset, config.focusElement]);

  // Highlight element with visual feedback
  const highlightElement = useCallback((element: HTMLElement, fieldName: string) => {
    // Clear existing highlight
    const existingTimeout = highlightTimeouts.current.get(fieldName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Add highlight class
    element.classList.add('form-error-highlight');
    
    // Find the Material-UI field container
    const muiField = element.closest('.MuiFormControl-root') || 
                     element.closest('.MuiTextField-root') ||
                     element;
    
    if (muiField) {
      muiField.classList.add('form-error-highlight');
    }

    // Remove highlight after duration
    const timeout = setTimeout(() => {
      element.classList.remove('form-error-highlight');
      if (muiField) {
        muiField.classList.remove('form-error-highlight');
      }
      highlightTimeouts.current.delete(fieldName);
    }, config.highlightDuration);

    highlightTimeouts.current.set(fieldName, timeout);
  }, [config.highlightDuration]);

  // Navigate to first error
  const scrollToFirstError = useCallback((
    fieldErrors: Record<string, string>,
    validationErrors?: Record<string, any>
  ) => {
    const errorFields = findErrorFields(fieldErrors, validationErrors);
    
    if (errorFields.length === 0) {
      return false;
    }

    const firstError = errorFields[0];
    if (firstError.element) {
      scrollToElement(firstError.element);
      highlightElement(firstError.element, firstError.fieldName);
      return true;
    }

    return false;
  }, [findErrorFields, scrollToElement, highlightElement]);

  // Navigate to specific error by field name
  const scrollToField = useCallback((fieldName: string) => {
    const element = errorElementsRef.current.get(fieldName) || 
                    document.querySelector(`[name="${fieldName}"]`) as HTMLElement ||
                    document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement;

    if (element) {
      scrollToElement(element);
      highlightElement(element, fieldName);
      return true;
    }

    return false;
  }, [scrollToElement, highlightElement]);

  // Get error summary by section
  const getErrorSummary = useCallback((
    fieldErrors: Record<string, string>,
    validationErrors?: Record<string, any>
  ) => {
    const errorFields = findErrorFields(fieldErrors, validationErrors);
    
    const summary = {
      totalErrors: errorFields.filter(f => f.severity === 'error').length,
      totalWarnings: errorFields.filter(f => f.severity === 'warning').length,
      totalIssues: errorFields.length,
      errorsBySection: new Map<string, ErrorField[]>(),
      firstError: errorFields.find(f => f.severity === 'error'),
      allErrors: errorFields
    };

    // Group errors by form section if enabled
    if (config.groupBySection) {
      errorFields.forEach(errorField => {
        if (errorField.element) {
          const section = errorField.element.closest('[data-form-section]') as HTMLElement;
          const sectionName = section?.dataset.formSection || 'general';
          
          if (!summary.errorsBySection.has(sectionName)) {
            summary.errorsBySection.set(sectionName, []);
          }
          summary.errorsBySection.get(sectionName)!.push(errorField);
        }
      });
    }

    return summary;
  }, [findErrorFields, config.groupBySection]);

  // Create navigation function for step forms
  const createStepNavigation = useCallback((steps: string[]) => {
    return (
      fieldErrors: Record<string, string>,
      validationErrors?: Record<string, any>
    ) => {
      const errorFields = findErrorFields(fieldErrors, validationErrors);
      const errorsByStep = new Map<string, ErrorField[]>();

      // Group errors by step
      errorFields.forEach(errorField => {
        if (errorField.element) {
          const stepElement = errorField.element.closest('[data-step]') as HTMLElement;
          const stepName = stepElement?.dataset.step || 'unknown';
          
          if (!errorsByStep.has(stepName)) {
            errorsByStep.set(stepName, []);
          }
          errorsByStep.get(stepName)!.push(errorField);
        }
      });

      // Find first step with errors
      for (const step of steps) {
        if (errorsByStep.has(step) && errorsByStep.get(step)!.length > 0) {
          return {
            stepWithError: step,
            stepIndex: steps.indexOf(step),
            errors: errorsByStep.get(step)!,
            hasErrors: true
          };
        }
      }

      return { hasErrors: false };
    };
  }, [findErrorFields]);

  // Cleanup function
  const cleanup = useCallback(() => {
    highlightTimeouts.current.forEach(timeout => clearTimeout(timeout));
    highlightTimeouts.current.clear();
    errorElementsRef.current.clear();
  }, []);

  return {
    registerField,
    unregisterField,
    scrollToFirstError,
    scrollToField,
    findErrorFields,
    getErrorSummary,
    createStepNavigation,
    cleanup
  };
};

// CSS styles for error highlighting (to be added to global styles)
export const ERROR_NAVIGATION_STYLES = `
  .form-error-highlight {
    animation: errorPulse 0.5s ease-in-out;
    box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.3) !important;
    border-color: rgba(244, 67, 54, 0.8) !important;
  }

  .form-error-highlight .MuiOutlinedInput-root {
    border-color: rgba(244, 67, 54, 0.8) !important;
  }

  @keyframes errorPulse {
    0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.5); }
    50% { box-shadow: 0 0 0 4px rgba(244, 67, 54, 0.3); }
    100% { box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.3); }
  }
`;

export default useFormErrorNavigation;
