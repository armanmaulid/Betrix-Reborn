import type {
  ChatStreamRequest,
  ChatStreamCallbacks
} from '../entities/ChatStream';

export interface IChatRepository {
  /**
   * POSTs a chat request to the backend SSE stream and invokes the callbacks
   * as server-sent events arrive. Resolves when the stream closes (normally or
   * via abort); throws on transport-level failure (non-2xx response, network).
   */
  stream(request: ChatStreamRequest, callbacks: ChatStreamCallbacks, signal?: AbortSignal): Promise<void>;
}
