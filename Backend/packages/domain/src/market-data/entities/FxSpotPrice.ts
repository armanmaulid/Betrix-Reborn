export interface FxSpotPriceProps {
  /** Composite id: `{BASE}_{QUOTE}_{YYYY-MM-DD}` — deterministic, idempotent upsert. */
  id: string;
  base: string; // 'EUR'
  quote: string; // 'USD'
  /** Date the bar represents (UTC, YYYY-MM-DD). */
  tradeDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  unit: string | null; // e.g. 'USD/EUR'
  // Technical overlays — null when ?indicators= wasn't requested for that
  // row, or when FXMacroData didn't compute it (e.g. not enough history).
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  ema12: number | null;
  ema26: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * One daily OHLC bar for a forex pair, optionally with FXMacroData-computed
 * technical indicators. Upserted by id ({BASE}_{QUOTE}_{YYYY-MM-DD}) so
 * re-running backfills is idempotent and refresh snapshots overwrite.
 */
export class FxSpotPrice {
  public readonly id: string;
  public readonly base: string;
  public readonly quote: string;
  public readonly tradeDate: string;
  public readonly open: number | null;
  public readonly high: number | null;
  public readonly low: number | null;
  public readonly close: number;
  public readonly unit: string | null;
  public readonly sma20: number | null;
  public readonly sma50: number | null;
  public readonly sma200: number | null;
  public readonly rsi14: number | null;
  public readonly macd: number | null;
  public readonly macdSignal: number | null;
  public readonly macdHist: number | null;
  public readonly ema12: number | null;
  public readonly ema26: number | null;
  public readonly bbUpper: number | null;
  public readonly bbMiddle: number | null;
  public readonly bbLower: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: FxSpotPriceProps) {
    this.id = props.id;
    this.base = props.base.toUpperCase();
    this.quote = props.quote.toUpperCase();
    this.tradeDate = props.tradeDate;
    this.open = props.open ?? null;
    this.high = props.high ?? null;
    this.low = props.low ?? null;
    this.close = props.close;
    this.unit = props.unit ?? null;
    this.sma20 = props.sma20 ?? null;
    this.sma50 = props.sma50 ?? null;
    this.sma200 = props.sma200 ?? null;
    this.rsi14 = props.rsi14 ?? null;
    this.macd = props.macd ?? null;
    this.macdSignal = props.macdSignal ?? null;
    this.macdHist = props.macdHist ?? null;
    this.ema12 = props.ema12 ?? null;
    this.ema26 = props.ema26 ?? null;
    this.bbUpper = props.bbUpper ?? null;
    this.bbMiddle = props.bbMiddle ?? null;
    this.bbLower = props.bbLower ?? null;
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
  }

  /** Helper: build the deterministic composite id. */
  public static buildId(base: string, quote: string, tradeDate: string): string {
    return `${base.toUpperCase()}_${quote.toUpperCase()}_${tradeDate}`;
  }
}
