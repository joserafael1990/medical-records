import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export interface LLMTraceListItem {
  id: number;
  created_at: string;
  trace_id: string;
  source: string;
  model?: string | null;
  user_id?: number | null;
  patient_id?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  latency_ms?: number | null;
  cost_usd?: number | null;
  finish_reason?: string | null;
  has_error: boolean;
  tool_call_count: number;
}

export interface LLMTraceListResponse {
  items: LLMTraceListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface LLMTraceDetailRow extends LLMTraceListItem {
  system_prompt?: string | null;
  user_input?: string | null;
  response_text?: string | null;
  conversation_history?: Array<Record<string, unknown>> | null;
  tools_available?: Array<Record<string, unknown>> | null;
  tool_calls?: Array<{ name: string; args: Record<string, unknown> }> | null;
  tool_results?: Array<{ name: string; result: unknown }> | null;
  session_id?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LLMTraceDetailResponse {
  trace_id: string;
  rows: LLMTraceDetailRow[];
}

export interface LLMTracesStatsBySource {
  source: string;
  count: number;
  cost_usd: number;
  error_count: number;
}

export interface LLMTracesStats {
  total_calls: number;
  total_cost_usd: number;
  error_rate: number;
  latency_ms_avg: number;
  latency_ms_p95: number;
  by_source: LLMTracesStatsBySource[];
  from: string;
  to: string;
}

export interface LLMTracesListFilters {
  source?: string;
  user_id?: number;
  has_error?: boolean;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export class LLMTracesService extends ApiBase {
  async list(filters: LLMTracesListFilters = {}): Promise<LLMTraceListResponse> {
    try {
      const response = await this.api.get<LLMTraceListResponse>(
        '/api/admin/llm-traces',
        { params: filters },
      );
      return response.data;
    } catch (error) {
      logger.error('Error listing LLM traces', error, 'api');
      throw error;
    }
  }

  async getStats(from?: string, to?: string): Promise<LLMTracesStats> {
    try {
      const response = await this.api.get<LLMTracesStats>(
        '/api/admin/llm-traces/stats',
        { params: { from, to } },
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching LLM traces stats', error, 'api');
      throw error;
    }
  }

  async getTrace(traceId: string): Promise<LLMTraceDetailResponse> {
    try {
      const response = await this.api.get<LLMTraceDetailResponse>(
        `/api/admin/llm-traces/${traceId}`,
      );
      return response.data;
    } catch (error) {
      logger.error('Error fetching LLM trace detail', error, 'api');
      throw error;
    }
  }
}
