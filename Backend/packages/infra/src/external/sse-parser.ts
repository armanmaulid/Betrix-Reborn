/**
 * I1 — shared SSE chunk parser.
 *
 * Both `AiGatewayClient` and `FxMacroDataClient` consume Server-Sent Events
 * from a Node `ReadableStream` reader. The boilerplate is the same:
 *   - `TextDecoder` for UTF-8 chunks
 *   - a line buffer split on `\n` (we use `\n` rather than `\n\n` because
 *     each event block is then split on `\n` again internally and the
 *     `data:` line is extracted — this handles both single-line events
 *     and multi-line events uniformly)
 *   - skip blank lines + SSE comments (lines starting with `:`)
 *   - skip the OpenAI-style `data: [DONE]` sentinel (caller can override)
 *   - yield the payload after the `data:` prefix (with or without space)
 *
 * Usage:
 *   const parser = createSseParser({ onData: (s) => ... });
 *   while (true) {
 *     const { done, value } = await reader.read();
 *     if (done) break;
 *     parser.feed(decoder.decode(value, { stream: true }));
 *   }
 *   parser.end();
 */
export interface SseParserOptions {
  /** Called for every parsed `data:` payload (text after `data:` prefix, trimmed). */
  onData: (data: string) => void;
  /**
   * If a data line equals this value exactly, it's skipped (OpenAI
   * `[DONE]` sentinel). Set to `null` to disable.
   */
  doneSentinel?: string | null;
}

export interface SseParser {
  /** Feed one or more decoded SSE chunks. */
  feed(chunk: string): void;
  /** Flush any trailing buffered line that did not end with `\n`. */
  end(): void;
  /** Reset the internal buffer (e.g. between SSE sessions). */
  reset(): void;
}

export function createSseParser(opts: SseParserOptions): SseParser {
  const sentinel = opts.doneSentinel === undefined ? 'data: [DONE]' : opts.doneSentinel;
  let buffer = '';

  return {
    feed(chunk: string) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (!trimmed.startsWith('data:')) continue;
        if (sentinel !== null && trimmed === sentinel) continue;
        const payload = trimmed.startsWith('data: ') ? trimmed.substring(6) : trimmed.substring(5);
        const value = payload.trim();
        if (!value) continue;
        opts.onData(value);
      }
    },
    end() {
      if (buffer.trim()) {
        this.feed('\n');
      }
      buffer = '';
    },
    reset() {
      buffer = '';
    }
  };
}
