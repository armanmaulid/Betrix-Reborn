export interface ParsedThinkingResult {
  thinking: string;
  content: string;
}

export class ThinkingParser {
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
}
