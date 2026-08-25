import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { CalendarEvent, ICalendarRepository } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { calendarEvents } from '../drizzle/schema.js';

export class DrizzleCalendarRepository implements ICalendarRepository {
  constructor(private readonly db: DrizzleDb) {}

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
    if (events.length === 0) return 0;
    const inserted = await this.db
      .insert(calendarEvents)
      .values(events.map((e) => this.toRow(e)))
      .onConflictDoNothing()
      .returning({ id: calendarEvents.id });
    return inserted.length;
  }

  async upsertOne(event: CalendarEvent): Promise<CalendarEvent> {
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
}

/** Returns the inclusive [start, end] unix-second bounds of a "YYYY-MM" month, UTC. */
function monthBoundsUnix(yearMonth: string): { startUnix: number; endUnix: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = Date.UTC(year!, month! - 1, 1, 0, 0, 0);
  const end = Date.UTC(year!, month!, 0, 23, 59, 59);
  return { startUnix: Math.floor(start / 1000), endUnix: Math.floor(end / 1000) };
}
