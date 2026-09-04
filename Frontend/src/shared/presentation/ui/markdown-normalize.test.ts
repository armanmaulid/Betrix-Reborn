import { describe, it, expect } from 'vitest';
import { normalizeMarkdown } from './markdown-normalize';

describe('normalizeMarkdown', () => {
  it('leaves already-well-formed markdown untouched', () => {
    const md = '## Title\n\n- one\n- two\n\n> note';
    expect(normalizeMarkdown(md)).toBe(md);
  });

  it('inserts a blank line before a heading that follows a paragraph', () => {
    const md = 'intro text\n## Heading';
    expect(normalizeMarkdown(md)).toBe('intro text\n\n## Heading');
  });

  it('separates a bold label from a preceding list item', () => {
    const md = '- **Uptrend** — bullish.\n**Level Likuiditas Kunci:**';
    expect(normalizeMarkdown(md)).toBe('- **Uptrend** — bullish.\n\n**Level Likuiditas Kunci:**');
  });

  it('separates a table from the preceding text', () => {
    const md = '**Zona Trade:**\n| A | B |\n|---|---|\n| 1 | 2 |';
    expect(normalizeMarkdown(md)).toBe(
      '**Zona Trade:**\n\n| A | B |\n|---|---|\n| 1 | 2 |'
    );
  });

  it('keeps consecutive list items together without blank lines', () => {
    const md = '- one\n- two\n- three';
    expect(normalizeMarkdown(md)).toBe('- one\n- two\n- three');
  });

  it('does not insert blank lines inside a fenced code block', () => {
    const md = 'before\n\n```\n# code\n## not a heading\n```\nafter';
    expect(normalizeMarkdown(md)).toBe(md);
  });

  it('separates a blockquote from preceding content', () => {
    const md = '- item\n> quoted';
    expect(normalizeMarkdown(md)).toBe('- item\n\n> quoted');
  });
});
