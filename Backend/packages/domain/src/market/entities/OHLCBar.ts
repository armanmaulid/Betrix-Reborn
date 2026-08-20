export interface OHLCBarProps {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class OHLCBar {
  public readonly time: number;
  public readonly open: number;
  public readonly high: number;
  public readonly low: number;
  public readonly close: number;
  public readonly volume: number;

  constructor(props: OHLCBarProps) {
    this.time = props.time;
    this.open = props.open;
    this.high = props.high;
    this.low = props.low;
    this.close = props.close;
    this.volume = props.volume;
  }

  /** Absolute body size (|close - open|) */
  public body(): number {
    return Math.abs(this.close - this.open);
  }

  /** Full candle range (high - low) */
  public range(): number {
    return this.high - this.low;
  }

  /** True if close > open (bullish candle) */
  public isBullish(): boolean {
    return this.close > this.open;
  }

  /** True if close < open (bearish candle) */
  public isBearish(): boolean {
    return this.close < this.open;
  }

  /** True if candle timestamp falls on a weekend (Sat/Sun UTC) */
  public isWeekend(): boolean {
    const date = new Date(this.time * 1000);
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  public toJSON(): Record<string, unknown> {
    return {
      time: this.time,
      datetime: new Date(this.time * 1000).toISOString(),
      open: this.open,
      high: this.high,
      low: this.low,
      close: this.close,
      volume: this.volume
    };
  }
}

export interface PriceTickProps {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
  timestamp: number; // Milliseconds Unix epoch
}

export class PriceTick {
  public readonly symbol: string;
  public readonly bid: number;
  public readonly ask: number;
  public readonly spread: number;
  public readonly volume: number;
  public readonly timestamp: number;

  constructor(props: PriceTickProps) {
    this.symbol = props.symbol.toUpperCase();
    this.bid = props.bid;
    this.ask = props.ask;
    this.spread = props.spread;
    this.volume = props.volume;
    this.timestamp = props.timestamp;
  }

  get last(): number {
    return Number(((this.bid + this.ask) / 2).toFixed(5));
  }

  /**
   * Calculate 24h price change from current price and D1 open price.
   * Domain logic — belongs here, not in application service.
   */
  public static calculate24hChange(
    currentPrice: number,
    d1Open: number
  ): { changeAmount: number; changePercent: number } {
    if (!d1Open || d1Open === 0) {
      return { changeAmount: 0, changePercent: 0 };
    }
    const changeAmount = Number((currentPrice - d1Open).toFixed(5));
    const changePercent = Number(((changeAmount / d1Open) * 100).toFixed(2));
    return { changeAmount, changePercent };
  }

  public toJSON(): Record<string, unknown> {
    return {
      symbol: this.symbol,
      bid: this.bid,
      ask: this.ask,
      last: this.last,
      spread: this.spread,
      volume: this.volume,
      timestamp: this.timestamp,
      datetime: new Date(this.timestamp).toISOString()
    };
  }
}
