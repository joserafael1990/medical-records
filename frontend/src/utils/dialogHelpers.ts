/**
 * Helper function to prevent dialog from closing when clicking outside (backdrop click)
 * while still allowing it to close via ESC key or close button
 * 
 * Usage:
 * <Dialog
 *   open={open}
 *   onClose={preventBackdropClose(handleClose)}
 * >
 */
export const preventBackdropClose = (handleClose: () => void) => {
  return (event: {}, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick') {
      return; // Don't close on backdrop click
    }
    handleClose(); // Close for other reasons (ESC key, close button, etc.)
  };
};

