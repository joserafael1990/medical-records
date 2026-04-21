import { useState, useCallback, useEffect } from 'react';

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  onConfirmedClose: () => void;
}

interface UseUnsavedChangesGuardReturn {
  confirmDialogOpen: boolean;
  requestClose: () => void;
  confirmClose: () => void;
  cancelClose: () => void;
}

/**
 * Guards a dialog/form against accidental data loss. When the form has
 * unsaved changes (`isDirty`), `requestClose` shows a confirmation dialog
 * instead of closing immediately. The caller decides what "dirty" means.
 */
export const useUnsavedChangesGuard = ({
  isDirty,
  onConfirmedClose
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardReturn => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmDialogOpen(true);
    } else {
      onConfirmedClose();
    }
  }, [isDirty, onConfirmedClose]);

  const confirmClose = useCallback(() => {
    setConfirmDialogOpen(false);
    onConfirmedClose();
  }, [onConfirmedClose]);

  const cancelClose = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);

  // Warn on browser back/refresh when form is dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { confirmDialogOpen, requestClose, confirmClose, cancelClose };
};
