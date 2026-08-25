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
  surprise?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

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

  public surprise(): number | null {
    if (this.actualValue === null || this.forecastValue === null) return null;
    return this.actualValue - this.forecastValue;
  }

  /** True when this indicator is known not to have an official forecast (e.g. NFP) — used by the UI to distinguish "no data yet" from "never has forecast data". */
  public forecastExpectedToBeEmpty(): boolean {
    return !this.hasOfficialForecast;
  }
}
