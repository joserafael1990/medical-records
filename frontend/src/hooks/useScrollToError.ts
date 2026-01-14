import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';
import { trackAmplitudeUXError } from '../utils/amplitudeHelper';

/**
 * Hook personalizado para hacer scroll automático hacia los mensajes de error
 * cuando aparecen en formularios o páginas
 * Siempre hace scroll al inicio de la página cuando hay un error
 */
export const useScrollToError = (error: string | null | undefined, enabled: boolean = true) => {
  const errorRef = useRef<HTMLDivElement>(null);
  const previousError = useRef<string | null | undefined>(null);
  const hasScrolled = useRef<boolean>(false);

  useEffect(() => {
    // Solo hacer scroll si hay un error y está habilitado
    if (enabled && error) {
      // Si es un error nuevo, resetear el flag
      if (error !== previousError.current) {
        hasScrolled.current = false;
        previousError.current = error;
      }

      // Hacer scroll solo si no lo hemos hecho aún para este error
      if (!hasScrolled.current) {
        const timeoutId = setTimeout(() => {
          // Track UX error
          trackAmplitudeUXError('form_error', error.substring(0, 100));
          
          // Siempre hacer scroll al inicio de la página
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
          
          hasScrolled.current = true;
        }, 200); // Delay para asegurar renderizado

        return () => clearTimeout(timeoutId);
      }
    } else if (!error) {
      // Reset cuando el error se limpia
      previousError.current = null;
      hasScrolled.current = false;
    }
  }, [error, enabled]);

  return errorRef;
};

/**
 * Hook para hacer scroll automático a errores de validación de campos
 * Útil cuando hay múltiples campos con errores
 */
export const useScrollToFieldError = (
  fieldErrors: Record<string, string> | undefined,
  enabled: boolean = true
) => {
  const errorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousErrors = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || !fieldErrors || Object.keys(fieldErrors).length === 0) {
      return;
    }

    // Encontrar el primer campo con error nuevo
    const firstNewError = Object.keys(fieldErrors).find(
      fieldName => fieldErrors[fieldName] && fieldErrors[fieldName] !== previousErrors.current[fieldName]
    );

    if (firstNewError) {
      const timeoutId = setTimeout(() => {
        const errorElement = errorRefs.current[firstNewError];
        if (errorElement) {
          errorElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);

      // Actualizar errores anteriores
      previousErrors.current = { ...fieldErrors };

      return () => clearTimeout(timeoutId);
    }
  }, [fieldErrors, enabled]);

  // Función para registrar refs de campos
  const registerFieldRef = (fieldName: string) => (ref: HTMLDivElement | null) => {
    errorRefs.current[fieldName] = ref;
  };

  return { registerFieldRef };
};

/**
 * Hook para hacer scroll automático en diálogos de Material-UI
 * Maneja el caso especial de DialogContent y también hace scroll al inicio de la página
 * Siempre hace scroll tanto al inicio del diálogo como al inicio de la página completa
 */
export const useScrollToErrorInDialog = (
  error: string | null | undefined,
  enabled: boolean = true
) => {
  const errorRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const previousError = useRef<string | null | undefined>(null);
  const hasScrolled = useRef<boolean>(false);

  useEffect(() => {
    if (enabled && error) {
      // Si es un error nuevo, resetear el flag
      if (error !== previousError.current) {
        hasScrolled.current = false;
        previousError.current = error;
      }

      // Hacer scroll solo si no lo hemos hecho aún para este error
      if (!hasScrolled.current) {
        const timeoutId = setTimeout(() => {
          if (errorRef.current) {
            // PRIMERO: Hacer scroll al inicio de la página completa (siempre)
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            
            // SEGUNDO: Buscar el DialogContent padre y hacer scroll dentro del diálogo
            const dialogContent = errorRef.current.closest('[role="dialog"]')
              ?.querySelector('.MuiDialogContent-root') as HTMLElement;
            
            if (dialogContent) {
              // Hacer scroll dentro del DialogContent al inicio después de un pequeño delay
              setTimeout(() => {
                dialogContent.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                });
              }, 300);
            }
            
            hasScrolled.current = true;
          } else {
            // Si no hay errorRef, igual hacer scroll al inicio de la página
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            hasScrolled.current = true;
          }
        }, 250); // Delay para asegurar renderizado

        return () => clearTimeout(timeoutId);
      }
    } else if (!error) {
      // Reset cuando el error se limpia
      previousError.current = null;
      hasScrolled.current = false;
    }
  }, [error, enabled]);

  return { errorRef, dialogContentRef };
};

