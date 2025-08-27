/**
 * Generic CRUD hook for managing resources with consistent patterns
 * Reduces code duplication and provides unified error handling
 */
import { useState, useCallback, useRef } from 'react';

export interface CRUDConfig<T, FormData> {
  // Resource name for error messages
  resourceName: string;
  
  // API service methods
  api: {
    getAll: () => Promise<T[]>;
    getById?: (id: string) => Promise<T>;
    create: (data: FormData) => Promise<T>;
    update: (id: string, data: Partial<FormData>) => Promise<T>;
    delete: (id: string) => Promise<void>;
  };
  
  // Initial form data
  initialFormData: FormData;
  
  // Validation function
  validate?: (data: FormData) => Record<string, string>;
  
  // Transform data before sending to API
  transformForCreate?: (data: FormData) => any;
  transformForUpdate?: (data: FormData) => any;
  
  // Success messages
  messages?: {
    created?: string;
    updated?: string;
    deleted?: string;
  };
}

export interface CRUDState<T, FormData> {
  // Data state
  items: T[];
  selectedItem: T | null;
  isLoading: boolean;
  
  // Form state
  formData: FormData;
  isEditing: boolean;
  isSubmitting: boolean;
  
  // UI state
  dialogOpen: boolean;
  
  // Error state
  error: string | null;
  fieldErrors: Record<string, string>;
  
  // Success state
  successMessage: string;
}

export interface CRUDActions<T, FormData> {
  // Data actions
  fetchItems: () => Promise<void>;
  fetchItem: (id: string) => Promise<void>;
  refreshItems: () => void;
  
  // Form actions
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
  resetForm: () => void;
  validateForm: () => boolean;
  
  // CRUD actions
  handleCreate: () => void;
  handleEdit: (item: T) => void;
  handleSubmit: () => Promise<void>;
  handleDelete: (item: T) => Promise<void>;
  
  // UI actions
  openDialog: () => void;
  closeDialog: () => void;
  handleCancel: () => void;
  
  // Message actions
  clearMessages: () => void;
  showSuccess: (message: string) => void;
}

export function useCRUD<T extends { id: string }, FormData>(
  config: CRUDConfig<T, FormData>
): CRUDState<T, FormData> & CRUDActions<T, FormData> {
  
  // State
  const [items, setItems] = useState<T[]>([]);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(config.initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear success message after timeout
  const clearSuccessMessage = useCallback(() => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  }, []);
  
  // Data actions
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await config.api.getAll();
      setItems(data);
    } catch (err: any) {
      setError(`Error al cargar ${config.resourceName}s: ${err.message || err.detail || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config.api, config.resourceName]);
  
  const fetchItem = useCallback(async (id: string) => {
    if (!config.api.getById) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await config.api.getById(id);
      setSelectedItem(data);
    } catch (err: any) {
      setError(`Error al cargar ${config.resourceName}: ${err.message || err.detail || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config.api, config.resourceName]);
  
  const refreshItems = useCallback(() => {
    fetchItems();
  }, [fetchItems]);
  
  // Form actions
  const updateFormData = useCallback((data: FormData | ((prev: FormData) => FormData)) => {
    setFormData(data);
    // Clear field errors when user types
    setFieldErrors({});
  }, []);
  
  const resetForm = useCallback(() => {
    setFormData(config.initialFormData);
    setFieldErrors({});
    setError(null);
    setSelectedItem(null);
    setIsEditing(false);
  }, [config.initialFormData]);
  
  const validateForm = useCallback((): boolean => {
    if (!config.validate) return true;
    
    const errors = config.validate(formData);
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setError(`Por favor, completa todos los campos obligatorios de ${config.resourceName}.`);
      return false;
    }
    
    setError(null);
    return true;
  }, [config.validate, formData, config.resourceName]);
  
  // CRUD actions
  const handleCreate = useCallback(() => {
    resetForm();
    setIsEditing(false);
    setDialogOpen(true);
  }, [resetForm]);
  
  const handleEdit = useCallback((item: T) => {
    setSelectedItem(item);
    setFormData(item as unknown as FormData);
    setIsEditing(true);
    setDialogOpen(true);
    setError(null);
    setFieldErrors({});
  }, []);
  
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isEditing && selectedItem) {
        // Update
        const dataToUpdate = config.transformForUpdate ? 
          config.transformForUpdate(formData) : formData;
        
        await config.api.update(selectedItem.id, dataToUpdate);
        
        const message = config.messages?.updated || 
          `${config.resourceName} actualizado exitosamente`;
        setSuccessMessage(message);
      } else {
        // Create
        const dataToCreate = config.transformForCreate ? 
          config.transformForCreate(formData) : formData;
        
        await config.api.create(dataToCreate);
        
        const message = config.messages?.created || 
          `${config.resourceName} creado exitosamente`;
        setSuccessMessage(message);
      }
      
      setDialogOpen(false);
      resetForm();
      refreshItems();
      clearSuccessMessage();
      
    } catch (err: any) {
      // Handle validation errors from API
      if (err.status === 422 && err.detail) {
        if (Array.isArray(err.detail)) {
          const errors: Record<string, string> = {};
          err.detail.forEach((error: any) => {
            const field = error.loc?.[1] || error.loc?.[0];
            if (field) {
              errors[field] = error.msg;
            }
          });
          setFieldErrors(errors);
          setError('Por favor, corrige los errores en el formulario.');
        } else {
          setError(err.detail);
        }
      } else {
        setError(`Error al guardar ${config.resourceName}: ${err.message || err.detail || 'Error desconocido'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm, 
    isEditing, 
    selectedItem, 
    formData, 
    config, 
    resetForm, 
    refreshItems, 
    clearSuccessMessage
  ]);
  
  const handleDelete = useCallback(async (item: T) => {
    const itemName = (item as any).name || (item as any).full_name || `${config.resourceName} ${item.id}`;
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${itemName}?`)) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await config.api.delete(item.id);
      
      const message = config.messages?.deleted || 
        `${config.resourceName} eliminado exitosamente`;
      setSuccessMessage(message);
      
      refreshItems();
      clearSuccessMessage();
      
    } catch (err: any) {
      setError(`Error al eliminar ${config.resourceName}: ${err.message || err.detail || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [config, refreshItems, clearSuccessMessage]);
  
  // UI actions
  const openDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);
  
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    resetForm();
  }, [resetForm]);
  
  const handleCancel = useCallback(() => {
    closeDialog();
  }, [closeDialog]);
  
  // Message actions
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage('');
    setFieldErrors({});
  }, []);
  
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    clearSuccessMessage();
  }, [clearSuccessMessage]);
  
  return {
    // State
    items,
    selectedItem,
    isLoading,
    formData,
    isEditing,
    isSubmitting,
    dialogOpen,
    error,
    fieldErrors,
    successMessage,
    
    // Actions
    fetchItems,
    fetchItem,
    refreshItems,
    setFormData: updateFormData,
    resetForm,
    validateForm,
    handleCreate,
    handleEdit,
    handleSubmit,
    handleDelete,
    openDialog,
    closeDialog,
    handleCancel,
    clearMessages,
    showSuccess
  };
}
