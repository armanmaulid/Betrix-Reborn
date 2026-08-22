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
    this.datetime = Number(props.datetime || Date.now());
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
