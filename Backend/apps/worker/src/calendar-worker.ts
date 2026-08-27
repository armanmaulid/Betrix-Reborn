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
import {
  pickForecast,
  joinWithAnnouncementsAndPredictions,
  toCalendarEvent
} from './shared/calendar-mapping.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export class CalendarWorker extends ManagedWorkerBase implements IManagedWorker {
  private dailyCronJob: ScheduledTask | null = null;
  private refreshCronJob: ScheduledTask | null = null;
  private unsubscribeSSE: (() => void) | null = null;
  private isShuttingDown = false;
  private isPaused = false;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;
  /** Daily FXMacroData call budget guard so refresh passes can never blow the free tier. */
  private budgetUsedToday = 0;
  private budgetDayUtc = new Date().getUTCDate();
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
    await this.runAsLeaderOrStandby();
  }

  protected async doStart(): Promise<void> {
    const cronExpr = BrokerTimeCalculator.getBrokerRolloverCronExpression(this.brokerUtcOffset, 0);
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

    // Periodic value-refresh pass: fills Actual for events that released and
    // re-pulls Forecast for upcoming ones. Costs ZERO FXMacroData calls on a
    // tick with nothing to refresh, and a bounded, budgeted number otherwise —
    // so the REST-only setup (no paid SSE key) stays self-healing.
    this.refreshCronJob = cron.schedule(env.CALENDAR_REFRESH_CRON, async () => {
      if (this.isPaused) return;
      await this.refreshRecentValues();
    });
    logger.info(`[CRON] Value-refresh schedule: '${env.CALENDAR_REFRESH_CRON}'`);

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
    // T6.4 — SSE-triggered refresh costs 2 upstream calls; respect the shared
    // daily budget. Skipping here is safe: the periodic refresh pass will
    // catch this event within its 72h lookback once budget resets.
    if (!this.consumeDailyBudget(2)) {
      logger.warn(
        `[SSE] Daily FXMacroData budget exhausted — skipping refresh for ${event.announcement_id}.`
      );
      return;
    }

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
  private syncRunning = false;
  public async syncIfMonthMissing(): Promise<void> {
    if (this.syncRunning) return;
    this.syncRunning = true;
    try {
      await this.syncIfMonthMissingInner();
    } finally {
      this.syncRunning = false;
    }
  }

  private async syncIfMonthMissingInner(): Promise<void> {
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
      // Range = full current month (incl. already-released past days): the
      // default /v1/calendar only returns UPCOMING releases, so without the
      // bounds a zero-row month would be partially seeded and miss past days.
      const [cy, cm] = currentYearMonth.split('-').map(Number);
      const monthStart = `${currentYearMonth}-01`;
      const monthEnd = new Date(Date.UTC(cy!, cm! + 1, 0)).toISOString().slice(0, 10);
      const rawEvents = await this.fxMacroData.fetchCalendar(
        env.FXMACRODATA_CALENDAR_CURRENCY,
        monthStart,
        monthEnd
      );
      const eventsThisMonth = rawEvents.filter((e) => e.date?.startsWith(currentYearMonth));

      // T6.4 — the daily join costs 2 calls per unique indicator. Respect the
      // shared daily budget: when exhausted, fall back to a schedule-only
      // insert (0 extra calls); the refresh pass catches up values later.
      const uniqueCodes = new Set(eventsThisMonth.map((e) => e.release));
      const plannedCalls = uniqueCodes.size * 2;
      if (!this.consumeDailyBudget(plannedCalls)) {
        logger.warn(
          `[CALENDAR SYNC] Daily FXMacroData budget exhausted — inserting schedule-only rows for ${currency} ${currentYearMonth}.`
        );
        const scheduleOnly = eventsThisMonth.map((raw) =>
          toCalendarEvent(raw, currency.toUpperCase(), undefined, undefined)
        );
        const savedOnly = await this.calendarRepo.saveMany(scheduleOnly);
        this.processedCount += savedOnly;
        logger.info(`[CALENDAR SYNC] Schedule-only insert: ${savedOnly} rows.`);
        return;
      }

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
   * Fills in Before/Actual for events that already released and refreshes
   * Forecast for upcoming ones by re-reading /v1/announcements +
   * /v1/predictions from FXMacroData.
   *
   * Why this exists: the daily sync only INSERTS when the current month has no
   * rows, so without a paid SSE key nothing ever updated actualValue after a
   * release — rows stayed frozen at Before=null/Actual=null forever. This pass
   * makes the REST-only setup self-healing.
   *
   * Cost control (free tier = 100 req/day): one call per UNIQUE indicator code
   * per endpoint (deduped across the whole window), capped per pass, and gated
   * by a daily call budget. A tick with nothing to refresh makes zero calls.
   */
  private refreshRunning = false;
  public async refreshRecentValues(): Promise<void> {
    if (this.refreshRunning) return;
    this.refreshRunning = true;
    try {
      await this.refreshRecentValuesInner();
    } finally {
      this.refreshRunning = false;
    }
  }

  private async refreshRecentValuesInner(): Promise<void> {
    const currency = env.FXMACRODATA_CALENDAR_CURRENCY.toUpperCase();
    const nowSec = Math.floor(Date.now() / 1000);
    const lookbackStart = nowSec - env.CALENDAR_REFRESH_LOOKBACK_HOURS * 3600;
    const aheadEnd = nowSec + env.CALENDAR_REFRESH_AHEAD_HOURS * 3600;

    let recent: CalendarEvent[];
    let upcoming: CalendarEvent[];
    try {
      [recent, upcoming] = await Promise.all([
        this.calendarRepo.findByCurrencyAndRange(currency, lookbackStart, nowSec),
        this.calendarRepo.findByCurrencyAndRange(currency, nowSec, aheadEnd)
      ]);
    } catch (err: any) {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error({ err: err.message }, '[CALENDAR REFRESH] Failed to load refresh candidates.');
      return;
    }

    const needsActual = recent.filter((e) => e.actualValue === null);
    const targets = new Map<string, CalendarEvent>();
    for (const e of [...needsActual, ...upcoming]) targets.set(e.id, e);
    if (targets.size === 0) {
      logger.info('[CALENDAR REFRESH] Nothing to refresh — no HTTP calls made.');
      return;
    }

    // Soonest-first priority so the next release is always covered even when
    // the per-pass cap truncates a crowded calendar week.
    const codes: string[] = [
      ...new Set(
        [...targets.values()]
          .sort(
            (a, b) => Math.abs(a.announcementUnix - nowSec) - Math.abs(b.announcementUnix - nowSec)
          )
          .map((e) => e.eventCode)
      )
    ].slice(0, env.CALENDAR_REFRESH_MAX_CODES_PER_PASS);

    if (!this.consumeDailyBudget(codes.length * 2)) {
      this.lastError = 'Daily FXMacroData call budget exhausted';
      logger.warn(
        `[CALENDAR REFRESH] Daily call budget (${env.FXMACRODATA_DAILY_CALL_BUDGET}) exhausted — skipping pass.`
      );
      return;
    }

    let updatedRows = 0;
    for (const code of codes) {
      let announcements;
      let predictionGroups;
      try {
        [announcements, predictionGroups] = await Promise.all([
          this.fxMacroData.fetchAnnouncements(currency.toLowerCase(), code),
          this.fxMacroData.fetchPredictions(currency.toLowerCase(), code)
        ]);
      } catch (err: any) {
        this.errorCount += 1;
        this.lastError = err.message;
        logger.warn({ err: err.message }, `[CALENDAR REFRESH] Fetch failed for '${code}'.`);
        continue;
      }

      for (const row of targets.values()) {
        if (row.eventCode !== code) continue;

        // row.id follows the same deterministic convention as upstream's
        // announcement_id ({currency}_{release}_{date}), so a direct match is
        // exact — never fuzzy.
        const announcement = announcements.find((a) => a.announcement_id === row.id);
        const forecast = pickForecast(predictionGroups.find((p) => p.announcement_id === row.id));

        // Only overwrite with real upstream values — never downgrade an
        // existing stored value back to null because one response omitted it.
        const updated = new CalendarEvent({
          id: row.id,
          currency: row.currency,
          eventCode: row.eventCode,
          eventName: row.eventName,
          referencePeriodDate: row.referencePeriodDate,
          announcementUnix: row.announcementUnix,
          announcementDatetimeUtc: row.announcementDatetimeUtc,
          announcementDatetimeLocal: row.announcementDatetimeLocal,
          importance: row.importance,
          marketTier: row.marketTier,
          isTopTier: row.isTopTier,
          sourceName: row.sourceName,
          sourceUrl: row.sourceUrl,
          beforeValue: announcement ? announcement.previous_value : row.beforeValue,
          forecastValue: forecast.value ?? row.forecastValue,
          forecastType: forecast.type ?? row.forecastType,
          actualValue: announcement ? announcement.val : row.actualValue,
          hasOfficialForecast: announcement
            ? announcement.has_official_forecast
            : row.hasOfficialForecast
        });

        try {
          await this.calendarRepo.upsertOne(updated);
          updatedRows += 1;
        } catch (err: any) {
          this.errorCount += 1;
          this.lastError = err.message;
          logger.warn({ err: err.message }, `[CALENDAR REFRESH] Upsert failed for ${row.id}.`);
        }
      }
    }

    this.processedCount += updatedRows;
    logger.info(
      `[CALENDAR REFRESH] ${updatedRows} row(s) refreshed across ${codes.length} indicator(s).`
    );
  }

  /** Resets at UTC midnight; returns false once today's quota would be exceeded. */
  private consumeDailyBudget(calls: number): boolean {
    const todayUtc = new Date().getUTCDate();
    if (todayUtc !== this.budgetDayUtc) {
      this.budgetDayUtc = todayUtc;
      this.budgetUsedToday = 0;
    }
    if (this.budgetUsedToday + calls > env.FXMACRODATA_DAILY_CALL_BUDGET) return false;
    this.budgetUsedToday += calls;
    return true;
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
    if (this.refreshCronJob) {
      this.refreshCronJob.stop();
      this.refreshCronJob = null;
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
    await this.releaseLeaderLease();
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
