import {
  IAiGateway,
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamCallbacks,
  ThinkingFilter
} from '@betrix/domain';
import { AppError } from '@betrix/core';
import { env } from '@betrix/config';

export class AiGatewayClient implements IAiGateway {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, apiKey: string, timeoutMs: number = 60000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async complete(
    request: AiCompletionRequest,
    signal?: AbortSignal
  ): Promise<AiCompletionResponse> {
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
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, AbortSignal.timeout(this.timeoutMs)])
      : AbortSignal.timeout(this.timeoutMs);

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
        signal
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
      let providerUsage: { inputTokens?: number; outputTokens?: number } | undefined;

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

              // T1.5 — capture real upstream usage when the provider sends it
              // (final OpenAI-compatible chunk carries `usage` with empty
              // choices). Preferred over the chars/4 estimate for billing.
              const u = parsed.usage;
              if (
                u &&
                (Number.isFinite(Number(u.prompt_tokens)) ||
                  Number.isFinite(Number(u.completion_tokens)))
              ) {
                providerUsage = {
                  inputTokens: Number(u.prompt_tokens),
                  outputTokens: Number(u.completion_tokens)
                };
              }

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

      // T1.5 — prefer REAL upstream usage for billing; fall back to the
      // chars/4 estimate only when the provider did not report usage, or when
      // BILLING_SOURCE=estimate is forced.
      const estimatedInput = Math.ceil(JSON.stringify(request.messages).length / 4);
      const estimatedOutput = Math.ceil(fullContent.length / 4);
      const preferProvider = env.BILLING_SOURCE !== 'estimate';
      const realInput = providerUsage?.inputTokens;
      const realOutput = providerUsage?.outputTokens;
      const inputTokens = preferProvider && realInput ? realInput : estimatedInput;
      const outputTokens = preferProvider && realOutput ? realOutput : estimatedOutput;

      callbacks.onDone?.({ inputTokens, outputTokens, latencyMs });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        callbacks.onError?.(new AppError('AI Gateway stream timed out', 504));
      } else {
        callbacks.onError?.(err);
      }
      throw err;
    }
  }
}
