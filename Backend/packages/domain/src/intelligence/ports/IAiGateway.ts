export interface AiPromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  model: string;
  messages: AiPromptMessage[];
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
  apiKey?: string;
}

export interface AiCompletionResponse {
  reply: string;
  thinking?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface AiStreamCallbacks {
  onThink?: (chunk: string) => void;
  onDelta?: (chunk: string) => void;
  onDone?: (meta: { inputTokens: number; outputTokens: number; latencyMs: number }) => void;
  onError?: (error: Error) => void;
}

export interface IAiGateway {
  complete(request: AiCompletionRequest, signal?: AbortSignal): Promise<AiCompletionResponse>;
  stream(
    request: AiCompletionRequest,
    callbacks: AiStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void>;
}
