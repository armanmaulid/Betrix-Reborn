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

const utcDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' });
import {
  joinWithAnnouncementsAndPredictions,
  toCalendarEvent,
  mergeEventWithUpstream
} from './shared/calendar-mapping.js';
import { activeCalendarCurrencies } from './shared/fxmacrodata-helpers.js';

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

    // Full 3-year coverage (last year + this year + next year) is a much
    // bigger job than the monthly safety net above — it's expected to run
    // for a long time on a fresh DB and to span multiple worker restarts
    // once the daily FXMacroData call budget is hit partway through (no
    // separate daily cron for this: it's idempotent per currency+year via
    // countByCurrencyAndYear, so simply re-running it — which happens
    // naturally on every worker restart — picks up wherever it left off).
    // Fire-and-forget rather than awaited: doStart() must still register
    // cron jobs and the command listener promptly, not block on however
    // long this takes. Errors are caught and logged inside — this must
    // never crash startup.
    void this.syncYearsIfMissing().catch((err: any) => {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error({ err: err.message }, '[CALENDAR YEAR SYNC] Startup year-coverage pass failed');
    });

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

    const updated = mergeEventWithUpstream(existing, announcement, predictionGroup);

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
    const currencies = activeCalendarCurrencies();
    const currentYearMonth = new Date().toISOString().slice(0, 7);

    for (const currency of currencies) {
      const cur = currency.toUpperCase();
      const existingCount = await this.calendarRepo.countByCurrencyAndMonth(cur, currentYearMonth);
      if (existingCount > 0) {
        logger.info(
          `[CALENDAR SYNC] ${cur} ${currentYearMonth} already has ${existingCount} events, skip fetch.`
        );
        continue;
      }

      try {
        // Range = full current month (incl. already-released past days): the
        // default /v1/calendar only returns UPCOMING releases, so without the
        // bounds a zero-row month would be partially seeded and miss past days.
        const [cy, cm] = currentYearMonth.split('-').map(Number);
        const monthStart = `${currentYearMonth}-01`;
        const monthEnd = utcDateKey.format(BrokerTimeCalculator.getUtcMonthEnd(cy!, cm!));
        const rawEvents = await this.fxMacroData.fetchCalendar(currency, monthStart, monthEnd);
        const eventsThisMonth = rawEvents.filter((e) => e.date?.startsWith(currentYearMonth));

        // T6.4 - the daily join costs 2 calls per unique indicator. Respect the
        // shared daily budget: when exhausted, fall back to a schedule-only
        // insert (0 extra calls); the refresh pass catches up values later.
        const uniqueCodes = new Set(eventsThisMonth.map((e) => e.release));
        const plannedCalls = uniqueCodes.size * 2;
        if (!this.consumeDailyBudget(plannedCalls)) {
          logger.warn(
            `[CALENDAR SYNC] Daily FXMacroData budget exhausted - inserting schedule-only rows for ${cur} ${currentYearMonth}.`
          );
          const scheduleOnly = eventsThisMonth.map((raw) =>
            toCalendarEvent(raw, cur, undefined, undefined)
          );
          const savedOnly = await this.calendarRepo.saveMany(scheduleOnly);
          this.processedCount += savedOnly;
          logger.info(`[CALENDAR SYNC] Schedule-only insert: ${savedOnly} rows.`);
          continue;
        }

        const events = await joinWithAnnouncementsAndPredictions(
          this.fxMacroData,
          eventsThisMonth,
          cur,
          logger
        );
        const saved = await this.calendarRepo.saveMany(events);
        this.processedCount += saved;
        logger.info(`[CALENDAR SYNC] Inserted ${saved} new events for ${cur} ${currentYearMonth}.`);
      } catch (err: any) {
        // Log and continue - the cron will retry tomorrow. Never throw here,
        // or a transient FXMacroData outage would crash the worker process.
        this.errorCount += 1;
        this.lastError = err.message;
        logger.error(
          { err: err.message, currency: cur },
          `Failed to sync calendar for ${cur} ${currentYearMonth}`
        );
      }
    }
  }

  /**
   * Full-year coverage backfill: for each active currency and each target
   * year, insert that year's calendar (schedule + Before/Actual/Forecast)
   * IF-AND-ONLY-IF the currency+year combination has zero rows already —
   * mirrors syncIfMonthMissingInner's "insert only if missing" idempotency,
   * scoped to a year instead of a month.
   *
   * Default scope is ['last', 'current', 'next'] (the 3-year window this
   * exists for). Pass a narrower list (e.g. ['current']) to check just one.
   *
   * Currency order: non-USD ("premium", gated behind FXMACRODATA_API_KEY —
   * see FxMacroDataClient) is processed BEFORE USD. USD's announcements/
   * predictions stay free even after a trial key expires (see
   * FxMacroDataClient's fetchAnnouncements/fetchPredictions doc comments),
   * so it can always be backfilled later — premium currencies can't, once
   * the trial window closes. Prioritizing them first maximizes what actually
   * gets captured against a fixed, ticking trial clock.
   *
   * Idempotent and safe to call repeatedly (every worker restart re-runs
   * this in doStart()): years already covered are skipped instantly via
   * countByCurrencyAndYear, so a run that was cut short by the daily
   * FXMacroData call budget simply picks up the remaining currency+year
   * pairs next time, with no separate tracking table needed.
   */
  private yearSyncRunning = false;
  public async syncYearsIfMissing(
    scope: Array<'last' | 'current' | 'next'> = ['last', 'current', 'next']
  ): Promise<void> {
    if (this.yearSyncRunning) return;
    this.yearSyncRunning = true;
    try {
      await this.syncYearsIfMissingInner(scope);
    } finally {
      this.yearSyncRunning = false;
    }
  }

  private async syncYearsIfMissingInner(scope: Array<'last' | 'current' | 'next'>): Promise<void> {
    const thisYear = new Date().getUTCFullYear();
    const yearFor = { last: thisYear - 1, current: thisYear, next: thisYear + 1 } as const;
    const targetYears = [...new Set(scope.map((s) => yearFor[s]))].sort((a, b) => a - b);

    const allCurrencies = activeCalendarCurrencies().map((c) => c.toUpperCase());
    // Premium (non-USD) first — see doc comment above for why.
    const currencies = [
      ...allCurrencies.filter((c) => c !== 'USD'),
      ...allCurrencies.filter((c) => c === 'USD')
    ];

    logger.info(
      `[CALENDAR YEAR SYNC] Checking ${currencies.length} currencies x ${targetYears.length} year(s) [${targetYears.join(', ')}] for coverage...`
    );

    let pendingCount = 0;

    for (const cur of currencies) {
      for (const year of targetYears) {
        const yearStr = String(year);
        const existingCount = await this.calendarRepo.countByCurrencyAndYear(cur, yearStr);
        if (existingCount > 0) {
          logger.info(
            `[CALENDAR YEAR SYNC] ${cur} ${yearStr} already has ${existingCount} events, skip fetch.`
          );
          continue;
        }

        try {
          // Full calendar year range. /v1/calendar only returns UPCOMING
          // releases by default, so an explicit range is required to also
          // pull already-released past days within the year — same reasoning
          // as syncIfMonthMissingInner's monthStart/monthEnd bounds.
          const yearStart = `${yearStr}-01-01`;
          const yearEnd = `${yearStr}-12-31`;
          const rawEvents = await this.fxMacroData.fetchCalendar(
            cur.toLowerCase(),
            yearStart,
            yearEnd
          );
          const eventsThisYear = rawEvents.filter((e) => e.date?.startsWith(yearStr));

          if (eventsThisYear.length === 0) {
            logger.info(
              `[CALENDAR YEAR SYNC] ${cur} ${yearStr}: FXMacroData returned no scheduled events for this year — nothing to insert (this is expected for a far-future year with nothing announced yet).`
            );
            continue;
          }

          // Same cost-control pattern as the monthly sync: the join costs 2
          // calls per unique indicator code. If the shared daily budget can't
          // cover it, fall back to a schedule-only insert (0 extra calls) so
          // at least the event dates/names are captured — refreshRecentValues
          // will backfill Before/Actual/Forecast once budget resets, though
          // only for events inside its lookback/ahead window, so a schedule-
          // only year far outside that window may stay schedule-only until
          // this pass is re-run (which happens automatically on restart).
          const uniqueCodes = new Set(eventsThisYear.map((e) => e.release));
          const plannedCalls = uniqueCodes.size * 2;
          if (!this.consumeDailyBudget(plannedCalls)) {
            logger.warn(
              `[CALENDAR YEAR SYNC] Daily FXMacroData budget exhausted — inserting schedule-only rows for ${cur} ${yearStr}. Remaining currency+year pairs will be picked up on the next worker restart or run.`
            );
            const scheduleOnly = eventsThisYear.map((raw) =>
              toCalendarEvent(raw, cur, undefined, undefined)
            );
            const savedOnly = await this.calendarRepo.saveMany(scheduleOnly);
            this.processedCount += savedOnly;
            logger.info(
              `[CALENDAR YEAR SYNC] Schedule-only insert: ${savedOnly} rows for ${cur} ${yearStr}.`
            );
            pendingCount += 1;
            continue;
          }

          const events = await joinWithAnnouncementsAndPredictions(
            this.fxMacroData,
            eventsThisYear,
            cur,
            logger
          );
          const saved = await this.calendarRepo.saveMany(events);
          this.processedCount += saved;
          logger.info(
            `[CALENDAR YEAR SYNC] Inserted ${saved} new events for ${cur} ${yearStr} (${uniqueCodes.size} unique indicators).`
          );
        } catch (err: any) {
          // Log and continue — never throw, or one bad currency+year would
          // abort the whole sweep (and, since this runs fire-and-forget from
          // doStart(), an uncaught throw here would only surface as an
          // unhandled rejection instead of a clean log line).
          this.errorCount += 1;
          this.lastError = err.message;
          pendingCount += 1;
          logger.error(
            { err: err.message, currency: cur, year: yearStr },
            `[CALENDAR YEAR SYNC] Failed to sync ${cur} ${yearStr}`
          );
        }
      }
    }

    if (pendingCount > 0) {
      logger.warn(
        `[CALENDAR YEAR SYNC] ${pendingCount} currency+year pair(s) still incomplete (budget-limited or errored) — will retry on next worker restart.`
      );
    } else {
      logger.info('[CALENDAR YEAR SYNC] 3-year coverage check complete — all pairs covered.');
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
    const currencies = activeCalendarCurrencies();
    const nowSec = Math.floor(Date.now() / 1000);
    const lookbackStart = nowSec - env.CALENDAR_REFRESH_LOOKBACK_HOURS * 3600;
    const aheadEnd = nowSec + env.CALENDAR_REFRESH_AHEAD_HOURS * 3600;

    for (const currency of currencies) {
      const cur = currency.toUpperCase();

      let recent: CalendarEvent[];
      let upcoming: CalendarEvent[];
      try {
        [recent, upcoming] = await Promise.all([
          this.calendarRepo.findByCurrencyAndRange(cur, lookbackStart, nowSec),
          this.calendarRepo.findByCurrencyAndRange(cur, nowSec, aheadEnd)
        ]);
      } catch (err: any) {
        this.errorCount += 1;
        this.lastError = err.message;
        logger.error(
          { err: err.message, currency: cur },
          '[CALENDAR REFRESH] Failed to load refresh candidates.'
        );
        continue;
      }

      const needsActual = recent.filter((e) => e.actualValue === null);
      const targets = new Map<string, CalendarEvent>();
      for (const e of [...needsActual, ...upcoming]) targets.set(e.id, e);
      if (targets.size === 0) {
        logger.info(`[CALENDAR REFRESH] ${cur}: nothing to refresh, no HTTP calls.`);
        continue;
      }

      // Soonest-first priority so the next release is always covered even when
      // the per-pass cap truncates a crowded calendar week.
      const codes: string[] = [
        ...new Set(
          [...targets.values()]
            .sort(
              (a, b) =>
                Math.abs(a.announcementUnix - nowSec) - Math.abs(b.announcementUnix - nowSec)
            )
            .map((e) => e.eventCode)
        )
      ].slice(0, env.CALENDAR_REFRESH_MAX_CODES_PER_PASS);

      if (!this.consumeDailyBudget(codes.length * 2)) {
        this.lastError = 'Daily FXMacroData call budget exhausted';
        logger.warn(
          `[CALENDAR REFRESH] Daily call budget (${env.FXMACRODATA_DAILY_CALL_BUDGET}) exhausted - skipping pass for ${cur}.`
        );
        continue;
      }

      let updatedRows = 0;
      for (const code of codes) {
        let announcements;
        let predictionGroups;
        try {
          [announcements, predictionGroups] = await Promise.all([
            this.fxMacroData.fetchAnnouncements(cur.toLowerCase(), code),
            this.fxMacroData.fetchPredictions(cur.toLowerCase(), code)
          ]);
        } catch (err: any) {
          this.errorCount += 1;
          this.lastError = err.message;
          logger.warn(
            { err: err.message, currency: cur },
            `[CALENDAR REFRESH] Fetch failed for '${code}'.`
          );
          continue;
        }

        for (const row of targets.values()) {
          if (row.eventCode !== code) continue;

          // row.id follows the same deterministic convention as upstream's
          // announcement_id ({currency}_{release}_{date}), so a direct match is
          // exact - never fuzzy.
          const announcement = announcements.find((a) => a.announcement_id === row.id);

          // Only overwrite with real upstream values - never downgrade an
          // existing stored value back to null because one response omitted it.
          const updated = mergeEventWithUpstream(
            row,
            announcement,
            predictionGroups.find((p) => p.announcement_id === row.id)
          );

          try {
            await this.calendarRepo.upsertOne(updated);
            updatedRows += 1;
          } catch (err: any) {
            this.errorCount += 1;
            this.lastError = err.message;
            logger.warn(
              { err: err.message, currency: cur },
              `[CALENDAR REFRESH] Upsert failed for ${row.id}.`
            );
          }
        }
      }

      this.processedCount += updatedRows;
      logger.info(
        `[CALENDAR REFRESH] ${cur}: ${updatedRows} row(s) refreshed across ${codes.length} indicator(s).`
      );
    }
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
