import cron, { ScheduledTask } from 'node-cron';
import pino from 'pino';
import { env } from '@betrix/config';
import { BrokerTimeCalculator } from '@betrix/domain';
import {
  createPgPool,
  createDrizzleClient,
  createRedisClient,
  DrizzleCalendarRepository,
  DrizzleWorkerStateRepository,
  RedisWorkerCommandBus,
  FxMacroDataClient,
  type FxMacroDataCalendarEvent
} from '@betrix/infra';
import type { IManagedWorker, WorkerHealthSnapshot } from '@betrix/application';
import { ManagedWorkerBase } from './shared/ManagedWorkerBase.js';
import { toScheduleOnlyEvents } from './shared/calendar-mapping.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

/**
 * How far back/forward the startup seed looks, relative to the current UTC
 * year: [currentYear - 1, currentYear, currentYear + 1].
 */
function seedYearSpan(): number[] {
  const current = new Date().getUTCFullYear();
  return [current - 1, current, current + 1];
}

/**
 * Resolves the active calendar currency list. Tier 2 multi-currency: when
 * `FXMACRODATA_CALENDAR_CURRENCIES` is set (comma-separated), it takes
 * precedence. Otherwise we fall back to the single `FXMACRODATA_CALENDAR_CURRENCY`
 * for backward compatibility. Always lowercased — callers uppercase at the
 * call site for logging.
 */
function activeCalendarCurrencies(): string[] {
  return (
    env.FXMACRODATA_CALENDAR_CURRENCIES ??
    [env.FXMACRODATA_CALENDAR_CURRENCY]
  );
}

/**
 * CalendarSeederWorker — guarantees the economic calendar SCHEDULE exists.
 *
 * Split of duties (deliberate, no overlap):
 *  - THIS worker owns COVERAGE: schedule rows (names/times), seeded cheaply.
 *    • On start: last year + this year + next year, skipping any UTC day that
 *      already has rows (day-level idempotence → restarts are near no-ops).
 *    • Daily broker-rollover cron: if the CURRENT month has no rows, seed it.
 *  - CalendarWorker ("fxmacrodata-calendar-sync") owns VALUES: SSE stream,
 *    join-based monthly enrichment, and the periodic Before/Actual/Forecast
 *    refresh pass. It is untouched by this worker.
 *
 * Cost: schedule-only means ONE GET /v1/calendar call per run — a restart
 * storm cannot dent the 100 req/day free tier, unlike a full indicator join.
 */
export class CalendarSeederWorker extends ManagedWorkerBase implements IManagedWorker {
  private dailyCronJob: ScheduledTask | null = null;
  private isPaused = false;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | null = null;
  private pool: ReturnType<typeof createPgPool>;
  private calendarRepo: DrizzleCalendarRepository;
  /** T6.3 persistent quota guard across crash-loops. */
  private markerRedis = createRedisClient();
  private fxMacroData = new FxMacroDataClient();

  constructor(private readonly brokerUtcOffset: number = env.BROKER_UTC_OFFSET) {
    const redis = createRedisClient();
    const pool = createPgPool(env.DATABASE_URL, 5);
    const db = createDrizzleClient(pool);
    super(
      'calendar-scheduler-seed',
      new RedisWorkerCommandBus(redis),
      new DrizzleWorkerStateRepository(db),
      logger
    );

    this.pool = pool;
    this.calendarRepo = new DrizzleCalendarRepository(db);
  }

  public async start(): Promise<void> {
    if (await this.wasDeliberatelyHalted()) {
      logger.info(
        'Calendar Seeder Worker was previously paused/stopped by an admin — not auto-starting.'
      );
      return;
    }
    await this.runAsLeaderOrStandby();
  }

  protected async doStart(): Promise<void> {
    const cronExpr = BrokerTimeCalculator.getBrokerRolloverCronExpression(this.brokerUtcOffset, 7);
    logger.info(
      `Starting Calendar Seeder Worker (Broker Offset: UTC+${this.brokerUtcOffset}, cron: '${cronExpr}')...`
    );
    this.isPaused = false;

    // Task 1 — startup coverage for last/current/next year. Idempotent at
    // DAY level, so repeated deployments only insert genuinely missing days.
    await this.seedStartupYears();

    // Task 2 — daily guard: "does THIS month have data? skip : seed".
    this.dailyCronJob = cron.schedule(cronExpr, async () => {
      if (this.isPaused) return;
      await this.seedCurrentMonthIfMissing();
    });

    this.attachCommandListener();
  }

  /**
   * Seeds the schedule for [Y-1, Y, Y+1] in ONE upstream call:
   * fetch the full calendar once, then keep only events whose UTC day has no
   * stored row yet inside the three-year window.
   */
  public async seedStartupYears(): Promise<void> {
    const currencies = activeCalendarCurrencies();

    // T6.3 — crash-loop quota guard: skip the upstream fetch when a successful
    // full seed happened within CALENDAR_SEED_MIN_GAP_HOURS (Redis-persisted).
    const gapHours = env.CALENDAR_SEED_MIN_GAP_HOURS;
    const markerKey = `b:${env.NODE_ENV || 'development'}:ops:marker:calendar-seed-ok`;
    let lastSeedAt: string | null = null;
    try {
      lastSeedAt = (await this.markerRedis.get<string>(markerKey)) ?? null;
    } catch {
      // Marker read failure must not block seeding.
    }
    if (lastSeedAt && Date.now() - Number(lastSeedAt) < gapHours * 3600_000) {
      logger.info('[CALENDAR SEED] Skipping startup seed — completed recently (quota guard).');
      return;
    }

    const years = seedYearSpan();

    for (const cur of currencies) {
      try {
        const schedule = await this.fetchSchedule(cur);

        // Do NOT pre-filter by "missing day": the old filter compared each event's
        // reference-period `date` against a set keyed on the *publication* day
        // (announcementUnix) — different things — and multiple distinct events can
        // legitimately share a reference period (e.g. CPI + PPI both for "2025-03"),
        // so it could silently skip real events. Idempotence is already guaranteed
        // by the primary key + saveMany(... onConflictDoNothing); just insert all
        // and let duplicates no-op.
        const saved = await this.calendarRepo.saveMany(toScheduleOnlyEvents(schedule, cur));
        this.processedCount += saved;

        const perYear = new Map<number, number>();
        for (const e of schedule) {
          const y = Number(e.date?.slice(0, 4));
          if (!Number.isNaN(y)) perYear.set(y, (perYear.get(y) ?? 0) + 1);
        }
        logger.info(
          `[CALENDAR SEED] Startup seed ${cur.toUpperCase()} ${years.join('/')}: ` +
            `schedule=${schedule.length}, inserted=${saved} ` +
            `(${[...perYear.entries()].map(([y, n]) => `${y}:${n}`).join(', ') || 'empty'}).`
        );
      } catch (err: any) {
        // Per-currency failure: log and continue with the next currency so
        // a single 4xx (e.g. non-USD without a paid key) doesn't block the rest.
        this.errorCount += 1;
        this.lastError = err.message;
        logger.error(
          { err: err.message, currency: cur },
          '[CALENDAR SEED] Startup seeding failed for currency — continuing with next.'
        );
      }
    }

    try {
      await this.markerRedis.set(markerKey, String(Date.now()), {
        ex: Math.ceil(gapHours * 3600)
      });
    } catch {
      // Marker write failure is non-fatal.
    }
  }

  /**
   * Task 2 — exactly the requested daily behaviour: does the CURRENT month
   * have rows? yes → skip (zero HTTP calls); no → seed its schedule.
   */
  public async seedCurrentMonthIfMissing(): Promise<void> {
    const currency = env.FXMACRODATA_CALENDAR_CURRENCY.toUpperCase();
    const currentYearMonth = new Date().toISOString().slice(0, 7);

    try {
      const existingCount = await this.calendarRepo.countByCurrencyAndMonth(
        currency,
        currentYearMonth
      );
      if (existingCount > 0) {
        logger.info(
          `[CALENDAR SEED] ${currency} ${currentYearMonth} already has ${existingCount} events, skip.`
        );
        return;
      }

      const schedule = await this.fetchSchedule();
      const monthEvents = schedule.filter((e) => e.date?.startsWith(currentYearMonth));
      const saved = await this.calendarRepo.saveMany(toScheduleOnlyEvents(monthEvents, currency));
      this.processedCount += saved;
      logger.info(
        `[CALENDAR SEED] Seeded ${saved}/${monthEvents.length} scheduled events for ${currency} ${currentYearMonth}.`
      );
    } catch (err: any) {
      this.errorCount += 1;
      this.lastError = err.message;
      logger.error(
        { err: err.message },
        `[CALENDAR SEED] Monthly seed failed for ${currency} ${currentYearMonth}.`
      );
    }
  }

  /**
   * Single upstream call powering both tasks. Requests the FULL three-year
   * window (last year → next year) so PAST schedules are actually retrieved —
   * FXMacroData's /v1/calendar returns only UPCOMING releases unless
   * start_date/end_date are supplied, which is why historical years were empty.
   */
  private async fetchSchedule(): Promise<FxMacroDataCalendarEvent[]> {
    const years = seedYearSpan();
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    if (firstYear === undefined || lastYear === undefined) {
      return this.fxMacroData.fetchCalendar(env.FXMACRODATA_CALENDAR_CURRENCY);
    }
    const start = `${firstYear}-01-01`;
    const end = `${lastYear}-12-31`;
    return this.fxMacroData.fetchCalendar(env.FXMACRODATA_CALENDAR_CURRENCY, start, end);
  }

  /**
   * Same pause semantics as the other workers: the daily cron simply checks
   * the flag, so pause/resume costs nothing and loses nothing.
   */
  protected async doPause(): Promise<void> {
    this.isPaused = true;
    logger.info('Calendar Seeder Worker paused — crons idle until resumed.');
  }

  protected async doStop(): Promise<void> {
    this.isPaused = false;
    if (this.dailyCronJob) {
      this.dailyCronJob.stop();
      this.dailyCronJob = null;
    }
    this.detachCommandListener();
    logger.info('Calendar Seeder Worker stopped.');
  }

  protected async doRestart(): Promise<void> {
    await this.doStop();
    await this.doStart();
  }

  public getHealth(): WorkerHealthSnapshot {
    return {
      status: this.isPaused ? 'paused' : 'running',
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError
    };
  }

  public async stop(): Promise<void> {
    await this.releaseLeaderLease();
    await this.doStop();
    await this.pool.end();
    logger.info('Calendar Seeder Worker stopped cleanly.');
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
  process.argv[1]?.endsWith('calendar-seeder-worker.ts') ||
  process.argv[1]?.endsWith('calendar-seeder-worker.js');
if (isDirectExecution) {
  const worker = new CalendarSeederWorker();

  const shutdown = async () => {
    logger.info('Received shutdown signal. Stopping Calendar Seeder Worker...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  worker.start().catch((err) => {
    logger.error(err, 'Failed to start Calendar Seeder Worker');
    process.exit(1);
  });
}
