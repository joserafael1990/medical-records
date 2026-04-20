import { ApiBase } from '../base/ApiBase';
import { API_CONFIG } from '../../constants';
import { logger } from '../../utils/logger';

export interface AssistantChatRequest {
  message: string;
  conversation_id?: string | null;
  current_patient_id?: number | null;
}

export interface AssistantToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AssistantChatResponse {
  reply: string;
  conversation_id: string;
  tool_calls: AssistantToolCall[];
  sandbox: boolean;
}

export class AssistantService extends ApiBase {
  async chat(payload: AssistantChatRequest): Promise<AssistantChatResponse> {
    try {
      const response = await this.api.post<AssistantChatResponse>(
        API_CONFIG.ENDPOINTS.ASSISTANT_CHAT,
        payload
      );
      return response.data;
    } catch (error) {
      logger.error('Error calling assistant chat endpoint', error, 'api');
      throw error;
    }
  }
}
