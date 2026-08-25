export type CalendarEventImportance = 'low' | 'medium' | 'high';

export interface CalendarEventProps {
  id: string;
  currency: string;
  eventCode: string;
  eventName: string;
  referencePeriodDate?: string | null;
  announcementUnix: number;
  announcementDatetimeUtc: string;
  announcementDatetimeLocal: string;
  importance: CalendarEventImportance;
  marketTier: number;
  isTopTier?: boolean;
  sourceName?: string | null;
  sourceUrl?: string | null;
  beforeValue?: number | null;
  forecastValue?: number | null;
  forecastType?: string | null;
  actualValue?: number | null;
  hasOfficialForecast?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * A single economic calendar release, sourced from FXMacroData. `forecastValue`
 * is populated from the `/v1/predictions/` endpoint filtered to a single
 * `prediction_type` per the priority rule in FxMacroDataClient (market_consensus
 * first, fxmacrodata as fallback, never averaged) — `forecastType` records which
 * one was used so the UI can label a model estimate differently from a real
 * market consensus. `beforeValue`/`actualValue` come from `/v1/announcements/`.
 * All three may legitimately be null: not every indicator has an official
 * forecast (see `hasOfficialForecast`), and `actualValue` is null until the
 * event has actually released.
 */
export class CalendarEvent {
  public readonly id: string;
  public readonly currency: string;
  public readonly eventCode: string;
  public readonly eventName: string;
  public readonly referencePeriodDate: string | null;
  public readonly announcementUnix: number;
  public readonly announcementDatetimeUtc: string;
  public readonly announcementDatetimeLocal: string;
  public readonly importance: CalendarEventImportance;
  public readonly marketTier: number;
  public readonly isTopTier: boolean;
  public readonly sourceName: string | null;
  public readonly sourceUrl: string | null;
  public readonly beforeValue: number | null;
  public readonly forecastValue: number | null;
  public readonly forecastType: string | null;
  public readonly actualValue: number | null;
  public readonly hasOfficialForecast: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: CalendarEventProps) {
    this.id = props.id;
    this.currency = props.currency.toUpperCase();
    this.eventCode = props.eventCode;
    this.eventName = props.eventName;
    this.referencePeriodDate = props.referencePeriodDate ?? null;
    this.announcementUnix = props.announcementUnix;
    this.announcementDatetimeUtc = props.announcementDatetimeUtc;
    this.announcementDatetimeLocal = props.announcementDatetimeLocal;
    this.importance = props.importance;
    this.marketTier = props.marketTier;
    this.isTopTier = props.isTopTier ?? false;
    this.sourceName = props.sourceName ?? null;
    this.sourceUrl = props.sourceUrl ?? null;
    this.beforeValue = props.beforeValue ?? null;
    this.forecastValue = props.forecastValue ?? null;
    this.forecastType = props.forecastType ?? null;
    this.actualValue = props.actualValue ?? null;
    this.hasOfficialForecast = props.hasOfficialForecast ?? false;
    this.createdAt =
      typeof props.createdAt === 'string'
        ? new Date(props.createdAt)
        : (props.createdAt ?? new Date());
    this.updatedAt =
      typeof props.updatedAt === 'string'
        ? new Date(props.updatedAt)
        : (props.updatedAt ?? new Date());
  }

  public isUpcoming(fromDate: Date = new Date()): boolean {
    return this.announcementUnix * 1000 > fromDate.getTime();
  }

  public hasReleased(): boolean {
    return this.actualValue !== null;
  }

  /** Actual minus forecast, computed on demand — never persisted as its own column. */
  public surprise(): number | null {
    if (this.actualValue === null || this.forecastValue === null) return null;
    return this.actualValue - this.forecastValue;
  }

  public toJSON() {
    return {
      id: this.id,
      currency: this.currency,
      eventCode: this.eventCode,
      eventName: this.eventName,
      referencePeriodDate: this.referencePeriodDate,
      announcementUnix: this.announcementUnix,
      announcementDatetimeUtc: this.announcementDatetimeUtc,
      announcementDatetimeLocal: this.announcementDatetimeLocal,
      importance: this.importance,
      marketTier: this.marketTier,
      isTopTier: this.isTopTier,
      sourceName: this.sourceName,
      sourceUrl: this.sourceUrl,
      beforeValue: this.beforeValue,
      forecastValue: this.forecastValue,
      forecastType: this.forecastType,
      actualValue: this.actualValue,
      hasOfficialForecast: this.hasOfficialForecast,
      surprise: this.surprise(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
