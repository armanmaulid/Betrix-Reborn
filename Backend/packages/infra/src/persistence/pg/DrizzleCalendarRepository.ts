import { and, eq, gte, lte, lt, sql } from 'drizzle-orm';
import { CalendarEvent, ICalendarRepository } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { redisKeys } from '../redis/redis-keys.js';
import { calendarEvents } from '../drizzle/schema.js';

export class DrizzleCalendarRepository implements ICalendarRepository {
  constructor(
    private readonly db: DrizzleDb,
    private readonly redis?: {
      get<T>(key: string): Promise<T | null>;
      set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
      incr(key: string): Promise<number>;
    }
  ) {}

  /** T3.2 — O(1) generation bump; stale versions expire via TTL (1h). */
  private async calendarCacheVersion(): Promise<string> {
    try {
      const v = await this.redis?.incr(redisKeys.cacheCalendarVersion());
      return String(v ?? 0);
    } catch {
      return '0';
    }
  }

  private bumpCalendarCache(): void {
    void this.redis?.incr(redisKeys.cacheCalendarVersion()).catch(() => undefined);
  }
  private mapToDomain(row: typeof calendarEvents.$inferSelect): CalendarEvent {
    return new CalendarEvent({
      id: row.id,
      currency: row.currency,
      eventCode: row.eventCode,
      eventName: row.eventName,
      referencePeriodDate: row.referencePeriodDate,
      announcementUnix: row.announcementUnix,
      announcementDatetimeUtc: row.announcementDatetimeUtc,
      announcementDatetimeLocal: row.announcementDatetimeLocal,
      importance: row.importance as CalendarEvent['importance'],
      marketTier: row.marketTier,
      isTopTier: row.isTopTier,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      beforeValue: row.beforeValue,
      forecastValue: row.forecastValue,
      forecastType: row.forecastType,
      actualValue: row.actualValue,
      hasOfficialForecast: row.hasOfficialForecast,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  private toRow(event: CalendarEvent) {
    return {
      id: event.id,
      currency: event.currency,
      eventCode: event.eventCode,
      eventName: event.eventName,
      referencePeriodDate: event.referencePeriodDate,
      announcementUnix: event.announcementUnix,
      announcementDatetimeUtc: event.announcementDatetimeUtc,
      announcementDatetimeLocal: event.announcementDatetimeLocal,
      importance: event.importance,
      marketTier: event.marketTier,
      isTopTier: event.isTopTier,
      sourceName: event.sourceName,
      sourceUrl: event.sourceUrl,
      beforeValue: event.beforeValue,
      forecastValue: event.forecastValue,
      forecastType: event.forecastType,
      actualValue: event.actualValue,
      hasOfficialForecast: event.hasOfficialForecast,
      updatedAt: new Date()
    };
  }

  async saveMany(events: CalendarEvent[]): Promise<number> {
    this.bumpCalendarCache();
    if (events.length === 0) return 0;
    const inserted = await this.db
      .insert(calendarEvents)
      .values(events.map((e) => this.toRow(e)))
      .onConflictDoNothing()
      .returning({ id: calendarEvents.id });
    return inserted.length;
  }

  async upsertOne(event: CalendarEvent): Promise<CalendarEvent> {
    this.bumpCalendarCache();
    const row = this.toRow(event);
    const rows = await this.db
      .insert(calendarEvents)
      .values(row)
      .onConflictDoUpdate({
        target: calendarEvents.id,
        set: row
      })
      .returning();
    return this.mapToDomain(rows[0]!);
  }

  async findByCurrencyAndMonth(currency: string, yearMonth: string): Promise<CalendarEvent[]> {
    // T3.2 — dashboard-hot month reads served from Redis (TTL 1h) with a
    // generation-prefixed key; any write bumps the version and invalidates.
    if (this.redis) {
      const ver = await this.calendarCacheVersion();
      const key = `${ver}:${redisKeys.cacheCalendarMonth(currency, yearMonth)}`;
      try {
        const raw = await this.redis.get<string>(key);
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return parsed.map((o: Record<string, unknown>) => new CalendarEvent(o as never));
        }
      } catch {
        // Cache read failure falls through to the DB query.
      }

      const events = await this.findMonthFromDb(currency, yearMonth);
      try {
        await this.redis.set(key, JSON.stringify(events.map((e) => e.toJSON())), { ex: 3600 });
      } catch {
        // Non-fatal.
      }
      return events;
    }

    return this.findMonthFromDb(currency, yearMonth);
  }

  private async findMonthFromDb(currency: string, yearMonth: string): Promise<CalendarEvent[]> {
    const { startUnix, endUnix } = monthBoundsUnix(yearMonth);
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.currency, currency.toUpperCase()),
          gte(calendarEvents.announcementUnix, startUnix),
          lte(calendarEvents.announcementUnix, endUnix)
        )
      )
      .orderBy(calendarEvents.announcementUnix);
    return rows.map((r) => this.mapToDomain(r));
  }

  async countByCurrencyAndMonth(currency: string, yearMonth: string): Promise<number> {
    const { startUnix, endUnix } = monthBoundsUnix(yearMonth);
    const result = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.currency, currency.toUpperCase()),
          gte(calendarEvents.announcementUnix, startUnix),
          lte(calendarEvents.announcementUnix, endUnix)
        )
      );
    return result[0]?.count ?? 0;
  }

  async findUpcoming(
    currency: string,
    limit: number = 20,
    pastDays: number = 0
  ): Promise<CalendarEvent[]> {
    const nowUnix = Math.floor(Date.now() / 1000);
    // Widening the lower bound keeps recently-released rows visible so users can
    // compare Before/Forecast/Actual right after a release instead of the event
    // vanishing the moment its timestamp passes.
    const fromUnix = nowUnix - Math.max(0, pastDays) * 86400;
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.currency, currency.toUpperCase()),
          gte(calendarEvents.announcementUnix, fromUnix)
        )
      )
      .orderBy(calendarEvents.announcementUnix)
      .limit(limit);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByCurrencyAndRange(
    currency: string,
    startUnix: number,
    endUnix: number
  ): Promise<CalendarEvent[]> {
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.currency, currency.toUpperCase()),
          gte(calendarEvents.announcementUnix, startUnix),
          lte(calendarEvents.announcementUnix, endUnix)
        )
      )
      .orderBy(calendarEvents.announcementUnix);
    return rows.map((r) => this.mapToDomain(r));
  }

  async listAnnouncementUnixInRange(
    currency: string,
    startUnix: number,
    endUnix: number
  ): Promise<number[]> {
    const rows = await this.db
      .select({ announcementUnix: calendarEvents.announcementUnix })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.currency, currency.toUpperCase()),
          gte(calendarEvents.announcementUnix, startUnix),
          lte(calendarEvents.announcementUnix, endUnix)
        )
      );
    return rows.map((r) => r.announcementUnix);
  }

  async findByAnnouncementId(announcementId: string): Promise<CalendarEvent | null> {
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, announcementId))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  /** T4.5 — retention: purge calendar events announced before the cutoff. */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    this.bumpCalendarCache();
    const deleted = await this.db
      .delete(calendarEvents)
      .where(lt(calendarEvents.createdAt, cutoff))
      .returning({ id: calendarEvents.id });
    return deleted.length;
  }
}

/** Returns the inclusive [start, end] unix-second bounds of a "YYYY-MM" month, UTC. */
function monthBoundsUnix(yearMonth: string): { startUnix: number; endUnix: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = Date.UTC(year!, month! - 1, 1, 0, 0, 0);
  const end = Date.UTC(year!, month!, 0, 23, 59, 59);
  return { startUnix: Math.floor(start / 1000), endUnix: Math.floor(end / 1000) };
}
