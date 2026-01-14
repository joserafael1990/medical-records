import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services';
import { logger } from '../utils/logger';
import type {
  AvatarOptionsResponse,
  AvatarSelectionPayload,
  AvatarMode,
  CustomAvatarOption,
  PreloadedAvatarOption,
  AvatarCurrentSelection
} from '../services/avatars/AvatarService';

export interface UseAvatarManagerOptions {
  autoFetch?: boolean;
}

export interface UseAvatarManagerReturn {
  loading: boolean;
  error: string | null;
  preloaded: PreloadedAvatarOption[];
  custom: CustomAvatarOption[];
  current: AvatarCurrentSelection | null;
  fetchAvatars: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<boolean>;
  selectAvatar: (mode: AvatarMode, data?: { templateKey?: string; relativePath?: string }) => Promise<boolean>;
  deleteCustomAvatar: (relativePath: string) => Promise<boolean>;
}

export const useAvatarManager = (
  options: UseAvatarManagerOptions = {}
): UseAvatarManagerReturn => {
  const { autoFetch = true } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preloaded, setPreloaded] = useState<PreloadedAvatarOption[]>([]);
  const [custom, setCustom] = useState<CustomAvatarOption[]>([]);
  const [current, setCurrent] = useState<AvatarCurrentSelection | null>(null);

  const applyOptions = useCallback((data: AvatarOptionsResponse) => {
    const mappedPreloaded = (data.preloaded ?? []).map(option => ({
      ...option,
      templateKey: option.templateKey ?? option.template_key
    }));
    const mappedCustom = (data.custom ?? []).map(option => ({
      ...option,
      relativePath: option.relativePath ?? option.relative_path
    }));

    setPreloaded(mappedPreloaded);
    setCustom(mappedCustom);
    setCurrent(data.current ?? null);
  }, []);

  const fetchAvatars = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.avatars.getOptions();
      applyOptions(response);
    } catch (err: any) {
      logger.error('useAvatarManager.fetchAvatars error', err, 'api');
      setError(err?.message || 'No se pudieron cargar los avatares');
    } finally {
      setLoading(false);
    }
  }, [applyOptions]);

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.avatars.uploadAvatar(file);
      const mappedCustom = (response.custom ?? []).map(option => ({
        ...option,
        relativePath: option.relativePath ?? option.relative_path
      }));
      setCustom(mappedCustom);
      // After upload we keep current selection unchanged
      return true;
    } catch (err: any) {
      logger.error('useAvatarManager.uploadAvatar error', err, 'api');
      setError(err?.message || 'No se pudo subir el avatar');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectAvatar = useCallback(async (mode: AvatarMode, data?: { templateKey?: string; relativePath?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const payload: AvatarSelectionPayload = { mode };
      if (mode === 'preloaded' && data?.templateKey) {
        payload.template_key = data.templateKey;
      }
      if (mode === 'custom' && data?.relativePath) {
        payload.relative_path = data.relativePath;
      }
      const response = await apiService.avatars.selectAvatar(payload);
      setCurrent(response.current ?? null);
      return true;
    } catch (err: any) {
      logger.error('useAvatarManager.selectAvatar error', err, 'api');
      setError(err?.message || 'No se pudo actualizar el avatar');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCustomAvatar = useCallback(async (relativePath: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.avatars.deleteCustomAvatar(relativePath);
      const mappedCustom = (response.custom ?? []).map(option => ({
        ...option,
        relativePath: option.relativePath ?? option.relative_path
      }));
      setCustom(mappedCustom);
      setCurrent(response.current ?? null);
      return response.deleted;
    } catch (err: any) {
      logger.error('useAvatarManager.deleteCustomAvatar error', err, 'api');
      setError(err?.message || 'No se pudo eliminar el avatar');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchAvatars();
    }
  }, [autoFetch, fetchAvatars]);

  return {
    loading,
    error,
    preloaded,
    custom,
    current,
    fetchAvatars,
    uploadAvatar,
    selectAvatar,
    deleteCustomAvatar
  };
};

