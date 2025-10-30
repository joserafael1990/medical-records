/**
 * Utilidades para configurar MenuProps de Select components
 * Soluciona el problema de dropdowns cortados en responsive design
 */

export const getSelectMenuProps = (options?: {
  maxHeight?: number;
  minWidth?: number;
  width?: string;
}) => {
  const {
    maxHeight = 300,
    minWidth = 200,
    width = 'auto'
  } = options || {};

  return {
    PaperProps: {
      style: {
        maxHeight,
        width,
        minWidth,
        zIndex: 9999, // Ensure dropdown appears above other elements
        position: 'fixed' as const,
        overflow: 'auto',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }
    },
    anchorOrigin: {
      vertical: 'bottom' as const,
      horizontal: 'left' as const,
    },
    transformOrigin: {
      vertical: 'top' as const,
      horizontal: 'left' as const,
    },
    disableScrollLock: false, // Allow scroll lock for better positioning
    disablePortal: true // Disable portal to prevent positioning issues
  };
};

/**
 * MenuProps para dropdowns pequeños (países, estados, etc.)
 */
export const getSmallSelectMenuProps = () => getSelectMenuProps({
  maxHeight: 250,
  minWidth: 180,
  width: 'auto'
});

/**
 * MenuProps para dropdowns medianos (pacientes, consultorios, etc.)
 */
export const getMediumSelectMenuProps = () => getSelectMenuProps({
  maxHeight: 300,
  minWidth: 220,
  width: 'auto'
});

/**
 * MenuProps para dropdowns grandes (listas extensas)
 */
export const getLargeSelectMenuProps = () => getSelectMenuProps({
  maxHeight: 350,
  minWidth: 280,
  width: 'auto'
});
