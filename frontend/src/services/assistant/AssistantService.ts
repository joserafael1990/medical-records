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

export interface AssistantConversationSummary {
  conversation_id: string;
  title: string;
  current_patient_id?: number | null;
  created_at?: string | null;
  last_activity?: string | null;
}

export interface AssistantConversationMessage {
  role: 'user' | 'model' | string;
  content: string;
  tool_calls?: AssistantToolCall[] | null;
  created_at?: string | null;
}

export interface AssistantConversationDetail {
  conversation_id: string;
  title?: string | null;
  current_patient_id?: number | null;
  created_at?: string | null;
  last_activity?: string | null;
  messages: AssistantConversationMessage[];
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

  async listConversations(limit = 20): Promise<AssistantConversationSummary[]> {
    try {
      const response = await this.api.get<{ conversations: AssistantConversationSummary[] }>(
        '/api/assistant/conversations',
        { params: { limit } }
      );
      return response.data.conversations;
    } catch (error) {
      logger.error('Error listing assistant conversations', error, 'api');
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<AssistantConversationDetail> {
    try {
      const response = await this.api.get<AssistantConversationDetail>(
        `/api/assistant/conversations/${conversationId}`
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching assistant conversation', error, 'api');
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.api.delete(`/api/assistant/conversations/${conversationId}`);
    } catch (error) {
      logger.error('Error deleting assistant conversation', error, 'api');
      throw error;
    }
  }
}
