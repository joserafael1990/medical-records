import { ApiBase } from '../base/ApiBase';
import { API_CONFIG } from '../../constants';
import { logger } from '../../utils/logger';

export type AvatarMode = 'initials' | 'preloaded' | 'custom';

export interface PreloadedAvatarOption {
  type: 'preloaded';
  key: string;
  template_key: string;
  filename: string;
  url: string;
  templateKey?: string;
}

export interface CustomAvatarOption {
  type: 'custom';
  filename: string;
  relative_path: string;
  url: string;
  relativePath?: string;
}

export interface AvatarCurrentSelection {
  avatar_type: AvatarMode;
  avatar_template_key?: string | null;
  avatar_file_path?: string | null;
  url?: string | null;
  avatar_url?: string | null;
}

export interface AvatarOptionsResponse {
  preloaded: PreloadedAvatarOption[];
  custom: CustomAvatarOption[];
  current: AvatarCurrentSelection;
}

export interface AvatarUploadResponse {
  avatar: CustomAvatarOption;
  custom: CustomAvatarOption[];
}

export interface AvatarDeleteResponse {
  deleted: boolean;
  custom: CustomAvatarOption[];
  current: AvatarCurrentSelection;
}

export interface AvatarSelectionPayload {
  mode: AvatarMode;
  template_key?: string;
  relative_path?: string;
}

export class AvatarService extends ApiBase {
  async getOptions(): Promise<AvatarOptionsResponse> {
    try {
      const response = await this.api.get<AvatarOptionsResponse>(API_CONFIG.ENDPOINTS.AVATAR_OPTIONS);
      return response.data;
    } catch (error) {
      logger.error('Error fetching avatar options', error, 'api');
      throw error;
    }
  }

  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.api.post<AvatarUploadResponse>(API_CONFIG.ENDPOINTS.AVATAR_UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error uploading custom avatar', error, 'api');
      throw error;
    }
  }

  async selectAvatar(payload: AvatarSelectionPayload): Promise<{ current: AvatarCurrentSelection }> {
    try {
      const response = await this.api.post<{ current: AvatarCurrentSelection }>(
        API_CONFIG.ENDPOINTS.AVATAR_SELECT,
        payload
      );
      return response.data;
    } catch (error) {
      logger.error('Error selecting avatar', error, 'api');
      throw error;
    }
  }

  async deleteCustomAvatar(relativePath: string): Promise<AvatarDeleteResponse> {
    try {
      const response = await this.api.delete<AvatarDeleteResponse>(
        API_CONFIG.ENDPOINTS.AVATAR_DELETE,
        {
          params: { relative_path: relativePath }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Error deleting custom avatar', error, 'api');
      throw error;
    }
  }
}

