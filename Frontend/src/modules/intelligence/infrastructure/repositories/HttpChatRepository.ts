import type { IChatRepository } from '../../domain/repositories/IChatRepository';
import type { ChatStreamRequest, ChatStreamCallbacks } from '../../domain/entities/ChatStream';

/**
 * SSE transport for `/api/chat/stream`.
 *
 * Owns the wire-level concerns the presentation layer must not know about:
 * the fetch, the `text/event-stream` framing (double-newline delimiters,
 * `event:`/`data:` lines), residual-buffer flushing, and the backend's
 * JSON-encoded payload convention (see `chat.routes.ts`, which stringifies
 * every event payload so `think`/`delta` chunks keep their newlines on a
 * single `data:` line).
 */
export class HttpChatRepository implements IChatRepository {
  async stream(
    request: ChatStreamRequest,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      const message =
        data?.error?.message ||
        data?.message ||
        `Stream request failed (${res.status})`;
      throw new Error(message);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // The backend JSON-encodes every SSE payload, so `think`/`delta` chunks
    // arrive as JSON strings with newlines preserved. Decode them here;
    // tolerate raw (non-JSON) chunks as a fallback across deploy windows.
    const decodeText = (raw: string): string => {
      try {
        const decoded = JSON.parse(raw);
        return typeof decoded === 'string' ? decoded : raw;
      } catch {
        return raw;
      }
    };

    const dispatchEvent = (event: string, data: string) => {
      if (event === 'context') {
        try {
          callbacks.onContext?.(JSON.parse(data));
        } catch {
          // Ignore a malformed context frame; the stream can still complete.
        }
      } else if (event === 'think') {
        callbacks.onThink?.(decodeText(data));
      } else if (event === 'delta') {
        callbacks.onDelta?.(decodeText(data));
      } else if (event === 'done') {
        try {
          callbacks.onDone?.(JSON.parse(data));
        } catch {
          // Ignore malformed done metadata.
        }
      } else if (event === 'error') {
        try {
          callbacks.onError?.(JSON.parse(data)?.message ?? data);
        } catch {
          callbacks.onError?.(data);
        }
      }
    };

    const dispatchFrame = (frame: string) => {
      let eventName = '';
      let eventData = '';
      let firstData = true;
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          // Preserve the payload verbatim: strip the `data:` prefix and a
          // single optional leading space, join multiple data lines with \n.
          const value = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
          eventData += (firstData ? '' : '\n') + value;
          firstData = false;
        }
      }
      if (eventName || eventData) dispatchEvent(eventName || 'message', eventData);
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        dispatchFrame(frame);
      }
    }

    // Flush a residual final frame that lacked the trailing blank line.
    if (buffer.trim()) dispatchFrame(buffer);
  }
}

export const chatRepository = new HttpChatRepository();
