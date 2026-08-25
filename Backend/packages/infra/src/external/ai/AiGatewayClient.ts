import {
  IAiGateway,
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamCallbacks,
  ThinkingFilter
} from '@betrix/domain';
import { AppError } from '@betrix/core';

export class AiGatewayClient implements IAiGateway {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, apiKey: string, timeoutMs: number = 60000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async complete(request: AiCompletionRequest, signal?: AbortSignal): Promise<AiCompletionResponse> {
    let reply = '';
    let thinking = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let latencyMs = 0;

    await this.stream(
      request,
      {
        onThink: (chunk) => {
          thinking += chunk;
        },
        onDelta: (chunk) => {
          reply += chunk;
        },
        onDone: (meta) => {
          inputTokens = meta.inputTokens;
          outputTokens = meta.outputTokens;
          latencyMs = meta.latencyMs;
        }
      },
      signal
    );

    return {
      reply: reply.trim() || (thinking.trim() ? 'Analysis complete.' : 'Analysis complete.'),
      thinking: thinking.trim() || undefined,
      inputTokens,
      outputTokens,
      latencyMs
    };
  }

  async stream(
    request: AiCompletionRequest,
    callbacks: AiStreamCallbacks,
    externalSignal?: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    // Bug #5: abort the upstream fetch when the CLIENT disconnects, not only on
    // our internal timeout. Without this, a user who closes the tab mid-stream
    // keeps the (billed) generation running to completion while nobody receives
    // the output. The controller's signal is what fetch() actually observes, so
    // relaying the external abort through it is enough.
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const targetBaseUrl = (request.baseUrl || this.baseUrl).replace(/\/+$/, '');
    const targetApiKey = request.apiKey || this.apiKey;

    try {
      const response = await fetch(`${targetBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(targetApiKey ? { Authorization: `Bearer ${targetApiKey}` } : {})
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature ?? 0.7,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          `AI Gateway stream error (${response.status}): ${errorText}`,
          response.status
        );
      }

      if (!response.body) {
        throw new AppError('AI Gateway response body is empty', 502);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullContent = '';

      const router = ThinkingFilter.createStreamRouter({
        onThink: (chunk) => callbacks.onThink?.(chunk),
        onDelta: (chunk) => callbacks.onDelta?.(chunk)
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.substring(6));
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.reasoning_content) {
                callbacks.onThink?.(delta.reasoning_content);
              }
              if (delta?.content) {
                fullContent += delta.content;
                router.push(delta.content);
              }
            } catch {
              // Ignore partial JSON parse errors in SSE stream
            }
          }
        }
      }

      router.flush();
      const latencyMs = Date.now() - startTime;
      const inputTokens = Math.ceil(JSON.stringify(request.messages).length / 4);
      const outputTokens = Math.ceil(fullContent.length / 4);

      callbacks.onDone?.({ inputTokens, outputTokens, latencyMs });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onError?.(new AppError('AI Gateway stream timed out', 504));
      } else {
        callbacks.onError?.(err);
      }
      throw err;
    } finally {
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      clearTimeout(timeout);
    }
  }
}
