import { useState, useCallback } from 'react';
import { useOfficeManagement } from './useOfficeManagement';
import { useScheduleData } from './useScheduleData';
import { logger } from '../utils/logger';

export interface UseDoctorProfileViewProps {
  doctorProfileId?: number;
}

export interface UseDoctorProfileViewReturn {
  // Dialog states
  scheduleConfigDialogOpen: boolean;
  setScheduleConfigDialogOpen: (open: boolean) => void;
  officeDialogOpen: boolean;
  setOfficeDialogOpen: (open: boolean) => void;
  editingOffice: any | null;
  setEditingOffice: (office: any | null) => void;
  deleteConfirmOpen: boolean;
  setDeleteConfirmOpen: (open: boolean) => void;
  officeToDelete: any | null;
  setOfficeToDelete: (office: any | null) => void;

  // Office management
  offices: any[];
  officesLoading: boolean;
  officesError: string | null;
  handleNewOffice: () => void;
  handleEditOffice: (office: any) => void;
  handleDeleteOffice: (office: any) => void;
  confirmDeleteOffice: () => Promise<void>;
  handleSaveOffice: (office: any) => Promise<void>;

  // Schedule data
  scheduleData: any;
  scheduleLoading: boolean;
  scheduleError: string | null;
  refetchSchedule: () => void;

  // Utilities
  formatDate: (dateString: string) => string;
}

export const useDoctorProfileView = (
  props: UseDoctorProfileViewProps
): UseDoctorProfileViewReturn => {
  const { doctorProfileId } = props;

  // Dialog states
  const [scheduleConfigDialogOpen, setScheduleConfigDialogOpen] = useState(false);
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<any>(null);

  // Office management hook
  const {
    offices,
    isLoading: officesLoading,
    error: officesError,
    deleteOffice,
    fetchOffices,
    createOffice,
    updateOffice
  } = useOfficeManagement(doctorProfileId);

  // Schedule data hook
  const {
    scheduleData,
    loading: scheduleLoading,
    error: scheduleError,
    refetch: refetchSchedule
  } = useScheduleData();

  // Office management functions
  const handleNewOffice = useCallback(() => {
    logger.debug('Opening new office dialog', undefined, 'ui');
    setEditingOffice(null);
    setOfficeDialogOpen(true);
  }, []);

  const handleEditOffice = useCallback((office: any) => {
    logger.debug('Opening edit office dialog', { officeId: office?.id }, 'ui');
    setEditingOffice(office);
    setOfficeDialogOpen(true);
  }, []);

  const handleDeleteOffice = useCallback((office: any) => {
    setOfficeToDelete(office);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDeleteOffice = useCallback(async () => {
    if (officeToDelete) {
      try {
        logger.debug('Deleting office', { officeId: officeToDelete.id }, 'ui');
        await deleteOffice(officeToDelete.id);
        setDeleteConfirmOpen(false);
        setOfficeToDelete(null);
      } catch (error) {
        logger.error('Error deleting office', error, 'api');
      }
    }
  }, [officeToDelete, deleteOffice]);

  const handleSaveOffice = useCallback(async (office: any) => {
    try {
      logger.debug('Saving office', { officeId: editingOffice?.id, isEditing: !!editingOffice }, 'ui');
      if (editingOffice) {
        logger.debug('Updating existing office', { officeId: editingOffice.id }, 'ui');
        await updateOffice(editingOffice.id, office);
      } else {
        logger.debug('Creating new office', undefined, 'ui');
        await createOffice(office);
      }
      setOfficeDialogOpen(false);
      setEditingOffice(null);
      // Refresh the offices list
      fetchOffices();
    } catch (err) {
      logger.error('Error saving office', err, 'api');
    }
  }, [editingOffice, updateOffice, createOffice, fetchOffices]);

  // Utility functions
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  }, []);

  return {
    // Dialog states
    scheduleConfigDialogOpen,
    setScheduleConfigDialogOpen,
    officeDialogOpen,
    setOfficeDialogOpen,
    editingOffice,
    setEditingOffice,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    officeToDelete,
    setOfficeToDelete,

    // Office management
    offices,
    officesLoading,
    officesError,
    handleNewOffice,
    handleEditOffice,
    handleDeleteOffice,
    confirmDeleteOffice,
    handleSaveOffice,

    // Schedule data
    scheduleData,
    scheduleLoading,
    scheduleError,
    refetchSchedule,

    // Utilities
    formatDate
  };
};

