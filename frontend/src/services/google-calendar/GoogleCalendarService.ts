import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export interface GoogleCalendarStatus {
  connected: boolean;
  sync_enabled?: boolean;
  last_sync_at?: string;
  calendar_id?: string;
}

export class GoogleCalendarService extends ApiBase {
  /**
   * Obtener URL de autorización de Google Calendar
   * @param redirectUri URI de redirección después de autorización
   */
  async getAuthorizationUrl(redirectUri: string): Promise<string> {
    try {
      logger.debug('Obteniendo URL de autorización de Google Calendar', { redirectUri }, 'api');
      
      const response = await this.api.get<{ authorization_url: string }>(
        `/api/google-calendar/oauth/authorize`,
        { params: { redirect_uri: redirectUri } }
      );
      
      logger.debug('URL de autorización obtenida', undefined, 'api');
      return response.data.authorization_url;
    } catch (error: any) {
      logger.error('Error al obtener URL de autorización de Google Calendar', error, 'api');
      throw error;
    }
  }

  /**
   * Verificar estado de conexión con Google Calendar
   */
  async getStatus(): Promise<GoogleCalendarStatus> {
    try {
      logger.debug('Verificando estado de Google Calendar', undefined, 'api');
      
      const response = await this.api.get<GoogleCalendarStatus>('/api/google-calendar/status');
      
      logger.debug('Estado de Google Calendar obtenido', { 
        connected: response.data.connected,
        sync_enabled: response.data.sync_enabled 
      }, 'api');
      
      return response.data;
    } catch (error: any) {
      logger.error('Error al verificar estado de Google Calendar', error, 'api');
      throw error;
    }
  }

  /**
   * Desconectar Google Calendar
   */
  async disconnect(): Promise<void> {
    try {
      logger.debug('Desconectando Google Calendar', undefined, 'api');
      
      await this.api.post('/api/google-calendar/disconnect');
      
      logger.info('Google Calendar desconectado exitosamente', undefined, 'api');
    } catch (error: any) {
      logger.error('Error al desconectar Google Calendar', error, 'api');
      throw error;
    }
  }

  /**
   * Habilitar o deshabilitar sincronización con Google Calendar
   * @param enabled true para habilitar, false para deshabilitar
   */
  async toggleSync(enabled: boolean): Promise<void> {
    try {
      logger.debug('Cambiando estado de sincronización', { enabled }, 'api');
      
      await this.api.post('/api/google-calendar/sync/toggle', null, {
        params: { enabled }
      });
      
      logger.info('Estado de sincronización actualizado', { enabled }, 'api');
    } catch (error: any) {
      logger.error('Error al cambiar estado de sincronización', error, 'api');
      throw error;
    }
  }
}



