import pino from 'pino';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  DrizzleNewsRepository,
  DrizzleWorkerStateRepository,
  RedisWorkerCommandBus
} from '@betrix/infra';
import { NewsArticle, NewsTagging } from '@betrix/domain';
import type { IManagedWorker, WorkerHealthSnapshot } from '@betrix/application';
import { ManagedWorkerBase } from './shared/ManagedWorkerBase.js';

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
  if (tags.includes('usd') || tags.includes('eur') || tags.includes('gbp') || tags.includes('jpy'))
    return 'forex';
  return 'general';
}

export function detectSentiment(
  headline: string,
  summary: string
): 'positive' | 'negative' | 'neutral' {
  const text = `${headline} ${summary}`.toLowerCase();

  const positiveWords = [
    'rally',
    'surge',
    'jump',
    'gain',
    'rise',
    'bull',
    'record high',
    'boom',
    'boost',
    'profit',
    'outperform'
  ];
  const negativeWords = [
    'plunge',
    'slump',
    'crash',
    'drop',
    'fall',
    'bear',
    'record low',
    'loss',
    'sink',
    'decline',
    'fear',
    'crisis'
  ];

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

export class NewsWorker extends ManagedWorkerBase implements IManagedWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;
  private isPaused = false;
  private pool: ReturnType<typeof createPgPool>;
  private newsRepo: DrizzleNewsRepository;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;

  constructor(
    private readonly apiKey: string = env.FINNHUB_API_KEY,
    private readonly pollIntervalMs: number = 10000 // 10 seconds interval
  ) {
    const redis = createRedisClient();
    const pool = createPgPool(env.DATABASE_URL, 5);
    const db = createDrizzleClient(pool);
    super(
      'finnhub-news-poller',
      new RedisWorkerCommandBus(redis),
      new DrizzleWorkerStateRepository(db),
      logger
    );

    this.pool = pool;
    this.newsRepo = new DrizzleNewsRepository(db);
  }

  public async start(): Promise<void> {
    if (!this.apiKey) {
      // Log-and-skip: a missing optional API key must not kill the whole
      // worker process (cleanup/calendar/sync workers don't need it).
      logger.warn(
        'FINNHUB_API_KEY is not configured — News Worker will stay idle until the key is provided.'
      );
      return;
    }
    if (await this.wasDeliberatelyHalted()) {
      logger.info('News Worker was previously paused/stopped by an admin — not auto-starting.');
      return;
    }
    await this.runAsLeaderOrStandby();
  }

  protected async doStart(): Promise<void> {
    logger.info(
      `Starting Smart News Ingestion Worker (Poll interval: ${this.pollIntervalMs / 1000}s)...`
    );
    this.isPaused = false;

    // Initial immediate fetch
    await this.pollNews();

    // Schedule regular 10s intervals
    this.timer = setInterval(() => {
      if (this.isPaused) return;
      this.pollNews().catch((err) => {
        logger.error({ err: err.message }, 'Unexpected error during news polling loop');
      });
    }, this.pollIntervalMs);

    this.attachCommandListener();
  }

  public async pollNews(): Promise<void> {
    if (this.isRunning || this.isShuttingDown) return;
    this.isRunning = true;

    try {
      const url = `https://finnhub.io/api/v1/news?category=general&token=${this.apiKey}`;
      // Hard timeout — a hung TCP connection must not stall the news cycle.
      let resp: Response;
      try {
        resp = await fetch(url, { signal: AbortSignal.timeout(env.FINNHUB_TIMEOUT_MS) });
      } catch (err: any) {
        err.stage = 'UPSTREAM_FETCH';
        throw err;
      }

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
        let savedCount = 0;
        try {
          savedCount = await this.newsRepo.saveMany(articlesToSave);
        } catch (err: any) {
          err.stage = 'DB_INGEST';
          throw err;
        }
        this.processedCount += savedCount;

        if (savedCount > 0) {
          logger.info(
            `[NEWS INGESTION] Successfully ingested ${savedCount} new unique market news articles.`
          );
        }
      }
    } catch (err: any) {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error(
        { err: err.message, stage: err.stage ?? 'UNKNOWN' },
        'Finnhub news pipeline failed'
      );
    } finally {
      this.isRunning = false;
    }
  }

  /** No persistent connection here — pause() skips the interval tick until resumed. */
  protected async doPause(): Promise<void> {
    this.isPaused = true;
    logger.info('News Worker paused — polling ticks will be skipped until resumed.');
  }

  protected async doStop(): Promise<void> {
    this.isPaused = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.detachCommandListener();
    logger.info('News Worker polling stopped.');
  }

  protected async doRestart(): Promise<void> {
    await this.doStop();
    await this.doStart();
  }

  public getHealth(): WorkerHealthSnapshot {
    return {
      status: this.isPaused ? 'paused' : this.timer ? 'running' : 'stopped',
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    await this.releaseLeaderLease();
    await this.doStop();
    await this.pool.end();
    logger.info('News Worker stopped cleanly.');
  }

  public async restart(): Promise<void> {
    await this.doRestart();
  }

  public async pause(): Promise<void> {
    await this.doPause();
  }
}

// Direct CLI entrypoint execution
const isDirectExecution =
  process.argv[1]?.endsWith('news-worker.ts') || process.argv[1]?.endsWith('news-worker.js');
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
