/**
 * Normalizes "tight" markdown — the style LLMs typically emit, where block
 * elements are separated by a single newline instead of the blank line that
 * CommonMark/GFM requires to start a new block.
 *
 * The renderer itself does not invent structure; a missing blank line makes a
 * list item, heading, blockquote or table collapse into the previous block
 * (e.g. `**Label:**` after a list gets absorbed into the last `<li>`). This
 * function inserts the missing blank lines so the output reads as the model
 * intended, while never removing or rewriting any content.
 *
 * Conservative by design: fenced code blocks are left untouched, and blank
 * lines are only ever inserted before a recognized block starter.
 */
export function normalizeMarkdown(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];

  let prevBlank = true; // treat the document start as a blank line
  let prevInList = false;
  let prevIsTable = false;
  let prevBlockquote = false;
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      out.push('');
      prevBlank = true;
      prevInList = false;
      prevIsTable = false;
      prevBlockquote = false;
      continue;
    }

    // Track fenced code blocks so we never insert blank lines inside them.
    const fence = trimmed.match(/^(`{3,}|~{3,})/);
    if (fence) {
      out.push(line);
      if (!inFence) {
        inFence = true;
      } else {
        inFence = false;
      }
      prevBlank = false;
      prevInList = false;
      prevIsTable = false;
      prevBlockquote = false;
      continue;
    }

    if (inFence) {
      out.push(line);
      prevBlank = false;
      continue;
    }

    const isHeading = /^#{1,6}\s/.test(trimmed);
    const isListItem = /^[-*+]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
    const isBlockquote = /^>/.test(trimmed);
    const isTableRow = /^\|/.test(trimmed);
    // A line that is only a bold label, e.g. "**Struktur Pasar:**"
    const isBoldLabel = /^\*\*[^*]+\*\*[\s:]*$/.test(trimmed);

    let needsBlank = false;
    if (!prevBlank) {
      if (isHeading || isBlockquote || (isTableRow && !prevIsTable)) {
        needsBlank = true;
      } else if (isListItem && !prevInList) {
        needsBlank = true;
      } else if (isBoldLabel && (prevInList || prevIsTable || prevBlockquote)) {
        needsBlank = true;
      }
    }

    if (needsBlank) out.push('');

    out.push(line);
    prevBlank = false;
    prevInList = isListItem;
    prevIsTable = isTableRow;
    prevBlockquote = isBlockquote;
  }

  return out.join('\n');
}
