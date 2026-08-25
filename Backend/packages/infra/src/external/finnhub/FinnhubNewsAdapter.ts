import { INewsProvider, NewsArticle, NewsTagging } from '@betrix/domain';

export class FinnhubNewsAdapter implements INewsProvider {
  private readonly apiKey: string;
  private readonly pollingIntervalMs: number;

  constructor(apiKey: string, pollingIntervalSec: number = 10) {
    this.apiKey = apiKey;
    this.pollingIntervalMs = pollingIntervalSec * 1000;
  }

  getProviderName(): string {
    return 'Finnhub';
  }

  getPollingIntervalMs(): number {
    return this.pollingIntervalMs;
  }

  async fetchNews(category: string = 'general'): Promise<NewsArticle[]> {
    if (!this.apiKey) return [];

    try {
      const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${this.apiKey}`;
      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000)
      });

      if (!resp.ok) {
        console.error(`[FinnhubNewsAdapter] News fetch returned status ${resp.status}`);
        return [];
      }

      const items = (await resp.json()) as any[];
      if (!Array.isArray(items)) return [];

      return items
        .filter((item) => item.headline && item.url)
        .slice(0, 30)
        .map((item) => {
          const headline = item.headline.trim();
          const summary = (item.summary || '').trim();
          const tags = NewsTagging.tagArticle(headline, summary);

          return new NewsArticle({
            id: String(item.id || item.url),
            source: item.source || 'Finnhub',
            headline,
            url: item.url,
            summary,
            datetime: Number(item.datetime || Math.floor(Date.now() / 1000)),
            category: item.category || category,
            tags,
            image: item.image || null,
            createdAt: new Date()
          });
        });
    } catch (err) {
      console.error('[FinnhubNewsAdapter] Error polling news:', err);
      return [];
    }
  }
}
