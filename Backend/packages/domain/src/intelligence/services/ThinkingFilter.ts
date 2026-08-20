export interface ParsedThinkingResult {
  thinking: string;
  content: string;
}

export class ThinkingFilter {
  /**
   * Synchronously strips <think>...</think> tags and separates thinking from final content.
   */
  public static parse(raw: string): ParsedThinkingResult {
    if (!raw) return { thinking: '', content: '' };

    const thinkRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
    let thinking = '';
    let match: RegExpExecArray | null;

    while ((match = thinkRegex.exec(raw)) !== null) {
      thinking += (thinking ? '\n' : '') + match[1]?.trim();
    }

    const content = raw.replace(thinkRegex, '').trim();
    return { thinking, content };
  }

  /**
   * Creates a streaming state machine to route chunks to onThink or onDelta.
   */
  public static createStreamRouter(callbacks: {
    onThink: (chunk: string) => void;
    onDelta: (chunk: string) => void;
  }) {
    let inThinkTag = false;
    let buffer = '';

    return {
      push(chunk: string) {
        buffer += chunk;

        while (buffer.length > 0) {
          if (!inThinkTag) {
            const startIdx = buffer.indexOf('<think>');
            if (startIdx === -1) {
              // No think tag, flush non-tag prefix if no partial tag exists
              if (buffer.includes('<')) {
                const openIdx = buffer.indexOf('<');
                if (openIdx > 0) {
                  callbacks.onDelta(buffer.substring(0, openIdx));
                  buffer = buffer.substring(openIdx);
                }
                break;
              } else {
                callbacks.onDelta(buffer);
                buffer = '';
                break;
              }
            } else {
              if (startIdx > 0) {
                callbacks.onDelta(buffer.substring(0, startIdx));
              }
              inThinkTag = true;
              buffer = buffer.substring(startIdx + '<think>'.length);
            }
          } else {
            const endIdx = buffer.indexOf('</think>');
            if (endIdx === -1) {
              if (buffer.includes('</')) {
                const closeIdx = buffer.indexOf('</');
                if (closeIdx > 0) {
                  callbacks.onThink(buffer.substring(0, closeIdx));
                  buffer = buffer.substring(closeIdx);
                }
                break;
              } else {
                callbacks.onThink(buffer);
                buffer = '';
                break;
              }
            } else {
              if (endIdx > 0) {
                callbacks.onThink(buffer.substring(0, endIdx));
              }
              inThinkTag = false;
              buffer = buffer.substring(endIdx + '</think>'.length);
            }
          }
        }
      },
      flush() {
        if (buffer.length > 0) {
          if (inThinkTag) {
            callbacks.onThink(buffer);
          } else {
            callbacks.onDelta(buffer);
          }
          buffer = '';
        }
      }
    };
  }
}
