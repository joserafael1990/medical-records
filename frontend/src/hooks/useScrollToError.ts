import { useEffect, useRef } from 'react';

/**
 * Hook personalizado para hacer scroll automático hacia los mensajes de error
 * cuando aparecen en formularios o diálogos
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
          if (errorRef.current) {
            console.log('🔝 Scrolling to error:', error.substring(0, 50));
            
            // Scroll directo al inicio de la página
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            
            console.log('✅ Scrolled to top of page');
            hasScrolled.current = true;
          }
        }, 200); // Aumentado el delay para asegurar renderizado

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
 * Maneja el caso especial de DialogContent
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
            console.log('🔝 Dialog: Scrolling to error:', error.substring(0, 50));
            
            // Buscar el DialogContent padre
            const dialogContent = errorRef.current.closest('[role="dialog"]')
              ?.querySelector('.MuiDialogContent-root') as HTMLElement;
            
            if (dialogContent) {
              // Hacer scroll dentro del DialogContent al inicio
              dialogContent.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
              console.log('✅ Scrolled DialogContent to top');
            } else {
              // Fallback: scroll directo al inicio de la página
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
              console.log('✅ Scrolled to top of page (fallback)');
            }
            
            hasScrolled.current = true;
          }
        }, 250); // Delay mayor para diálogos

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

