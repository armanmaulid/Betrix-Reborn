import { Nullable } from '@betrix/core';

export interface NewsArticleProps {
  id: string;
  source: string;
  headline: string;
  url: string;
  summary: string;
  datetime: number; // Unix timestamp in seconds
  category: string;
  tags?: string[];
  image?: Nullable<string>;
  createdAt?: Date;
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
  public readonly image: Nullable<string>;
  public readonly createdAt: Date;

  constructor(props: NewsArticleProps) {
    this.id = props.id;
    this.source = props.source;
    this.headline = props.headline;
    this.url = props.url;
    this.summary = props.summary;
    this.datetime = props.datetime;
    this.category = props.category;
    this.tags = props.tags ?? [];
    this.image = props.image ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  /** Age of the article in seconds from now */
  public age(): number {
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.max(0, nowSec - this.datetime);
  }

  /** True if article was published within the given seconds threshold */
  public isRecent(thresholdSeconds: number = 3600): boolean {
    return this.age() <= thresholdSeconds;
  }

  /** Check if this article is relevant to a given symbol based on tags and category */
  public matchesSymbol(symbol: string): boolean {
    const upper = symbol.toUpperCase();
    const symbolRoot = upper.replace(/(USD|EUR|GBP|JPY|BTC|ETH|XAU|XAG|US500|US30|NAS100|XTI|XBR)/g, '').trim() || upper;
    return (
      this.tags.some((tag) => tag.toUpperCase() === upper || tag.toUpperCase() === symbolRoot) ||
      this.headline.toUpperCase().includes(upper) ||
      this.summary.toUpperCase().includes(upper)
    );
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      source: this.source,
      headline: this.headline,
      url: this.url,
      summary: this.summary,
      datetime: this.datetime,
      category: this.category,
      tags: this.tags,
      image: this.image,
      createdAt: this.createdAt.toISOString()
    };
  }
}
