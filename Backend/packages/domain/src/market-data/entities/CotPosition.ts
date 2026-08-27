export interface CotPositionProps {
  /** Composite id: {CURRENCY}_{YYYY-MM-DD}, e.g. USD_2025-08-23. */
  id: string;
  currency: string;
  tradeDate: string;
  commercialLong: number | null;
  commercialShort: number | null;
  commercialNet: number | null;
  noncommercialLong: number | null;
  noncommercialShort: number | null;
  noncommercialNet: number | null;
  totalOpenInterest: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Weekly CFTC Commitment of Traders snapshot for a currency. The id is
 * {CURRENCY}_{YYYY-MM-DD}; FXMacroData publishes these on Tuesdays/Fridays
 * depending on currency, so the row count is much sparser than FX spot.
 */
export class CotPosition {
  public readonly id: string;
  public readonly currency: string;
  public readonly tradeDate: string;
  public readonly commercialLong: number | null;
  public readonly commercialShort: number | null;
  public readonly commercialNet: number | null;
  public readonly noncommercialLong: number | null;
  public readonly noncommercialShort: number | null;
  public readonly noncommercialNet: number | null;
  public readonly totalOpenInterest: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: CotPositionProps) {
    this.id = props.id;
    this.currency = props.currency.toUpperCase();
    this.tradeDate = props.tradeDate;
    this.commercialLong = props.commercialLong ?? null;
    this.commercialShort = props.commercialShort ?? null;
    this.commercialNet = props.commercialNet ?? null;
    this.noncommercialLong = props.noncommercialLong ?? null;
    this.noncommercialShort = props.noncommercialShort ?? null;
    this.noncommercialNet = props.noncommercialNet ?? null;
    this.totalOpenInterest = props.totalOpenInterest ?? null;
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
  }

  public static buildId(currency: string, tradeDate: string): string {
    return `${currency.toUpperCase()}_${tradeDate}`;
  }
}
