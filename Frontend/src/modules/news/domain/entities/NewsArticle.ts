export interface NewsArticleProps {
  id: string;
  source: string;
  headline: string;
  url: string;
  summary: string;
  datetime: number;
  category: string;
  tags?: string[];
  image?: string | null;
  createdAt: string | Date;
}

/**
 * Normalize to epoch **seconds** — the unit every consumer of
 * `NewsArticle.datetime` (formatUtcNewsDate) expects. Values >= 1e12 are
 * interpreted as epoch milliseconds and converted; invalid input falls back
 * to "now".
 */
function normalizeEpochSeconds(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return Math.floor(Date.now() / 1000);
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

export class NewsArticle {
  public readonly id: string;
  public readonly source: string;
  public readonly headline: string;
  public readonly url: string;
  public readonly summary: string;
  public readonly datetime: number;
  public readonly category: string;
  public readonly tags: string[];
  public readonly image: string | null;
  public readonly createdAt: Date;

  constructor(props: NewsArticleProps) {
    this.id = props.id;
    this.source = props.source;
    this.headline = props.headline;
    this.url = props.url;
    this.summary = props.summary || '';
    this.datetime = normalizeEpochSeconds(props.datetime);
    this.category = props.category || 'general';
    this.tags = (props.tags || []).map((t) => t.replace(/^#/, '').toLowerCase());
    this.image = props.image ?? null;
    this.createdAt = typeof props.createdAt === 'string' ? new Date(props.createdAt) : props.createdAt;
  }

  public matchesSymbol(symbol: string): boolean {
    const sym = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.tags.some((t) => t.includes(sym)) || this.headline.toLowerCase().includes(sym);
  }
}
