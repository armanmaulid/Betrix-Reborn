import cron, { ScheduledTask } from 'node-cron';
import pino from 'pino';
import { env } from '@betrix/config';
import { BrokerTimeCalculator, CalendarEvent } from '@betrix/domain';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  DrizzleCalendarRepository,
  DrizzleWorkerStateRepository,
  RedisWorkerCommandBus,
  FxMacroDataClient,
  type FxMacroDataStreamEvent
} from '@betrix/infra';
import type { IManagedWorker, WorkerHealthSnapshot } from '@betrix/application';
import { ManagedWorkerBase } from './shared/ManagedWorkerBase.js';
import { pickForecast, joinWithAnnouncementsAndPredictions } from './shared/calendar-mapping.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export class CalendarWorker extends ManagedWorkerBase implements IManagedWorker {
  private dailyCronJob: ScheduledTask | null = null;
  private unsubscribeSSE: (() => void) | null = null;
  private isShuttingDown = false;
  private isPaused = false;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;
  private pool: ReturnType<typeof createPgPool>;
  private calendarRepo: DrizzleCalendarRepository;
  private fxMacroData = new FxMacroDataClient();

  constructor(private readonly brokerUtcOffset: number = env.BROKER_UTC_OFFSET) {
    const redis = createRedisClient();
    const pool = createPgPool(env.DATABASE_URL, 5);
    const db = createDrizzleClient(pool);
    super(
      'fxmacrodata-calendar-sync',
      new RedisWorkerCommandBus(redis),
      new DrizzleWorkerStateRepository(db),
      logger
    );

    this.pool = pool;
    this.calendarRepo = new DrizzleCalendarRepository(db);
  }

  public async start(): Promise<void> {
    if (await this.wasDeliberatelyHalted()) {
      logger.info('Calendar Worker was previously paused/stopped by an admin — not auto-starting.');
      return;
    }
    await this.doStart();
  }

  protected async doStart(): Promise<void> {
    const cronExpr = BrokerTimeCalculator.getBrokerRolloverCronExpression(this.brokerUtcOffset);
    logger.info(
      `Starting Calendar Sync Worker (Broker Offset: UTC+${this.brokerUtcOffset}, cron: '${cronExpr}')...`
    );
    this.isPaused = false;

    // Daily job is the safety net, not the primary channel — see connectSSE() below.
    await this.syncIfMonthMissing();
    this.dailyCronJob = cron.schedule(cronExpr, async () => {
      if (this.isPaused) return;
      logger.info('[CRON] Executing daily calendar sync check...');
      await this.syncIfMonthMissing();
    });

    this.connectSSE();
    this.attachCommandListener();
  }

  private connectSSE(): void {
    // FXMacroData's SSE stream requires a trial/subscriber API key — unlike
    // the REST endpoints, which serve USD data for free. Without a key the
    // stream 401s and would otherwise reconnect-loop forever, spamming logs.
    // Fall back to the daily cron (already the safety net) in that case.
    if (!env.FXMACRODATA_API_KEY) {
      logger.info(
        'FXMACRODATA_API_KEY not set — SSE stream disabled, relying on the daily cron sync only.'
      );
      return;
    }

    this.unsubscribeSSE = this.fxMacroData.subscribeEvents(
      (event) => {
        if (this.isPaused) return;
        this.handleStreamEvent(event).catch((err: any) => {
          this.errorCount += 1;
          this.lastError = err.message;
          logger.error({ err: err.message }, 'Failed to handle FXMacroData stream event');
        });
      },
      (err) => {
        this.errorCount += 1;
        this.lastError = err.message;
        logger.warn(
          { err: err.message },
          'FXMacroData SSE stream error — auto-reconnect scheduled'
        );
      }
    );
  }

  /**
   * The stream payload is a trigger, not the source of truth for values:
   * re-fetch /v1/announcements/ (and /v1/predictions/) for the affected
   * indicator so the stored value always matches the REST API rather than
   * whatever shape the stream event happens to carry.
   */
  private async handleStreamEvent(event: FxMacroDataStreamEvent): Promise<void> {
    const currency = event.currency.toUpperCase();
    const [announcements, predictionGroups] = await Promise.all([
      this.fxMacroData.fetchAnnouncements(event.currency, event.indicator),
      this.fxMacroData.fetchPredictions(event.currency, event.indicator)
    ]);

    const announcement = announcements.find((a) => a.announcement_id === event.announcement_id);
    const predictionGroup = predictionGroups.find(
      (p) => p.announcement_id === event.announcement_id
    );

    if (!announcement) {
      logger.warn(
        `Received stream event for ${event.announcement_id} but no matching announcement found — skipping.`
      );
      return;
    }

    const existing = await this.calendarRepo.findByAnnouncementId(event.announcement_id);
    if (!existing) {
      logger.warn(
        `Stream event for ${event.announcement_id} has no existing calendar row to update — skipping.`
      );
      return;
    }

    const updated = new CalendarEvent({
      ...existing,
      beforeValue: announcement.previous_value,
      actualValue: announcement.val,
      hasOfficialForecast: announcement.has_official_forecast,
      ...pickForecastProps(predictionGroup)
    });

    await this.calendarRepo.upsertOne(updated);
    this.processedCount += 1;
    logger.info(`[SSE] Updated calendar event ${event.announcement_id} (currency: ${currency})`);
  }

  /**
   * Daily safety net: if the current broker month has no rows yet, fetch the
   * full calendar, join with announcements/predictions, and save. If the
   * month already has data (the common case once SSE is working), this is a
   * no-op — see the checklist requirement to verify no HTTP call happens in
   * that case.
   */
  public async syncIfMonthMissing(): Promise<void> {
    const currency = env.FXMACRODATA_CALENDAR_CURRENCY.toUpperCase();
    const currentYearMonth = new Date().toISOString().slice(0, 7);

    const existingCount = await this.calendarRepo.countByCurrencyAndMonth(
      currency,
      currentYearMonth
    );
    if (existingCount > 0) {
      logger.info(
        `[CALENDAR SYNC] ${currency} ${currentYearMonth} already has ${existingCount} events, skip fetch.`
      );
      return;
    }

    try {
      const rawEvents = await this.fxMacroData.fetchCalendar(env.FXMACRODATA_CALENDAR_CURRENCY);
      const eventsThisMonth = rawEvents.filter((e) => e.date?.startsWith(currentYearMonth));

      const events = await joinWithAnnouncementsAndPredictions(
        this.fxMacroData,
        eventsThisMonth,
        currency,
        logger
      );
      const saved = await this.calendarRepo.saveMany(events);
      this.processedCount += saved;
      logger.info(
        `[CALENDAR SYNC] Inserted ${saved} new events for ${currency} ${currentYearMonth}.`
      );
    } catch (err: any) {
      // Log and continue — the cron will retry tomorrow. Never throw here,
      // or a transient FXMacroData outage would crash the worker process.
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error(
        { err: err.message },
        `Failed to sync calendar for ${currency} ${currentYearMonth}`
      );
    }
  }

  /**
   * Keeps the SSE connection OPEN (unlike stop()) and simply discards
   * incoming events while paused — same pause semantics as FinnhubWsWorker,
   * for the same reason: instant resume with no reconnect cost.
   */
  protected async doPause(): Promise<void> {
    this.isPaused = true;
    logger.info(
      'Calendar Worker paused — SSE connection stays open, events are discarded until resumed.'
    );
  }

  protected async doStop(): Promise<void> {
    this.isPaused = false;
    if (this.dailyCronJob) {
      this.dailyCronJob.stop();
      this.dailyCronJob = null;
    }
    this.unsubscribeSSE?.();
    this.unsubscribeSSE = null;
    this.detachCommandListener();
    logger.info('Calendar Worker cron and SSE stream stopped.');
  }

  protected async doRestart(): Promise<void> {
    await this.doStop();
    await this.doStart();
  }

  public getHealth(): WorkerHealthSnapshot {
    return {
      status: this.isPaused ? 'paused' : this.unsubscribeSSE ? 'running' : 'stopped',
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    await this.doStop();
    await this.pool.end();
    logger.info('Calendar Worker stopped cleanly.');
  }

  public async restart(): Promise<void> {
    await this.doRestart();
  }

  public async pause(): Promise<void> {
    await this.doPause();
  }
}

function pickForecastProps(group: Parameters<typeof pickForecast>[0]): {
  forecastValue: number | null;
  forecastType: string | null;
} {
  const forecast = pickForecast(group);
  return { forecastValue: forecast.value, forecastType: forecast.type };
}

// Direct CLI entrypoint execution
const isDirectExecution =
  process.argv[1]?.endsWith('calendar-worker.ts') ||
  process.argv[1]?.endsWith('calendar-worker.js');
if (isDirectExecution) {
  const worker = new CalendarWorker();

  const shutdown = async () => {
    logger.info('Received shutdown signal. Stopping Calendar Worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Failed to start Calendar Worker');
    process.exit(1);
  });
}
