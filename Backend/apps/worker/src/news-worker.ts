import pino from 'pino';
import { env } from '@betrix/config';
import { createPgPool, createDrizzleClient, DrizzleNewsRepository } from '@betrix/infra';
import { NewsArticle, NewsTagging } from '@betrix/domain';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export function detectSmartCategory(tags: string[]): string {
  if (tags.includes('btc') || tags.includes('eth')) return 'crypto';
  if (tags.includes('metal')) return 'metal';
  if (tags.includes('oil')) return 'energy';
  if (tags.includes('indices')) return 'indices';
  if (tags.includes('usd') || tags.includes('eur') || tags.includes('gbp') || tags.includes('jpy')) return 'forex';
  return 'general';
}

export function detectSentiment(headline: string, summary: string): 'positive' | 'negative' | 'neutral' {
  const text = `${headline} ${summary}`.toLowerCase();

  const positiveWords = ['rally', 'surge', 'jump', 'gain', 'rise', 'bull', 'record high', 'boom', 'boost', 'profit', 'outperform'];
  const negativeWords = ['plunge', 'slump', 'crash', 'drop', 'fall', 'bear', 'record low', 'loss', 'sink', 'decline', 'fear', 'crisis'];

  let score = 0;
  for (const w of positiveWords) {
    if (text.includes(w)) score++;
  }
  for (const w of negativeWords) {
    if (text.includes(w)) score--;
  }

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

export class NewsWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;
  private pool = createPgPool(env.DATABASE_URL, 5);
  private newsRepo: DrizzleNewsRepository;

  constructor(
    private readonly apiKey: string = env.FINNHUB_API_KEY,
    private readonly pollIntervalMs: number = 10000 // 10 seconds interval
  ) {
    const db = createDrizzleClient(this.pool);
    this.newsRepo = new DrizzleNewsRepository(db);
  }

  public async start(): Promise<void> {
    if (!this.apiKey) {
      logger.error('FINNHUB_API_KEY is not configured in .env. Exiting News Worker...');
      process.exit(1);
    }

    logger.info(`Starting Smart News Ingestion Worker (Poll interval: ${this.pollIntervalMs / 1000}s)...`);

    // Initial immediate fetch
    await this.pollNews();

    // Schedule regular 10s intervals
    this.timer = setInterval(() => {
      this.pollNews().catch((err) => {
        logger.error({ err: err.message }, 'Unexpected error during news polling loop');
      });
    }, this.pollIntervalMs);
  }

  public async pollNews(): Promise<void> {
    if (this.isRunning || this.isShuttingDown) return;
    this.isRunning = true;

    try {
      const url = `https://finnhub.io/api/v1/news?category=general&token=${this.apiKey}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        logger.warn(`Finnhub News API returned status: ${resp.status} ${resp.statusText}`);
        return;
      }

      const items: any[] = await resp.json();
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }

      const articlesToSave: NewsArticle[] = [];

      for (const item of items.slice(0, 30)) {
        if (!item.headline || !item.url) continue;

        const headline = String(item.headline).trim();
        const summary = String(item.summary || '').trim();
        const newsUrl = String(item.url).trim();
        const source = String(item.source || 'Finnhub').trim();
        const imageUrl = item.image ? String(item.image).trim() : null;
        const datetime = item.datetime ? Number(item.datetime) : Math.floor(Date.now() / 1000);

        // Stable id from Finnhub so onConflictDoNothing dedupes across polls
        const finnhubId = item.id ? String(item.id) : null;
        if (!finnhubId) continue;

        // 1. Smart backend tagging and categorization
        const tags = NewsTagging.tagArticle(headline, summary);
        const category = detectSmartCategory(tags);

        const article = new NewsArticle({
          id: finnhubId,
          headline,
          summary,
          url: newsUrl,
          source,
          category,
          tags,
          image: imageUrl,
          datetime
        });

        articlesToSave.push(article);
      }

      if (articlesToSave.length > 0) {
        const savedCount = await this.newsRepo.saveMany(articlesToSave);
        if (savedCount > 0) {
          logger.info(`[NEWS INGESTION] Successfully ingested ${savedCount} new unique market news articles.`);
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to fetch or ingest news from Finnhub');
    } finally {
      this.isRunning = false;
    }
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.pool.end();
    logger.info('News Worker stopped cleanly.');
  }
}

// Direct CLI entrypoint execution
const isDirectExecution = process.argv[1]?.endsWith('news-worker.ts') || process.argv[1]?.endsWith('news-worker.js');
if (isDirectExecution) {
  const worker = new NewsWorker();

  const shutdown = async () => {
    logger.info('Received shutdown signal. Stopping News Worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Failed to start News Worker');
    process.exit(1);
  });
}
