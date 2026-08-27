export interface CommodityPriceProps {
  /** Composite id: {INDICATOR}_{YYYY-MM-DD}, e.g. gold_2025-08-26. */
  id: string;
  /** FXMacroData commodity identifier: 'gold' | 'silver' | 'platinum'. */
  indicator: string;
  tradeDate: string;
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  unit: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Daily close (and optional OHLC) for a commodity. Idempotent via the
 * composite id so backfills and ongoing snapshots are safe to re-run.
 */
export class CommodityPrice {
  public readonly id: string;
  public readonly indicator: string;
  public readonly tradeDate: string;
  public readonly close: number;
  public readonly open: number | null;
  public readonly high: number | null;
  public readonly low: number | null;
  public readonly unit: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: CommodityPriceProps) {
    this.id = props.id;
    this.indicator = props.indicator;
    this.tradeDate = props.tradeDate;
    this.close = props.close;
    this.open = props.open ?? null;
    this.high = props.high ?? null;
    this.low = props.low ?? null;
    this.unit = props.unit ?? null;
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
  }

  public static buildId(indicator: string, tradeDate: string): string {
    return `${indicator.toLowerCase()}_${tradeDate}`;
  }
}
