export interface PriceTickProps {
  symbol: string;
  bid: number;
  ask: number;
  spread?: number;
  volume?: number;
  change24h?: number;
  change24hPercent?: number;
  timestamp?: number;
}

/**
 * Coerce an unknown value into a finite number, falling back when the value is
 * nullish/empty or not numerically representable (NaN, Infinity, garbage).
 * Unlike `??`, this also catches NaN produced by `Number('abc')` upstream.
 */
export function coerceFinite(value: unknown, fallback: unknown = 0): number {
  const resolveFallback = (): number => {
    const f = Number(fallback);
    return Number.isFinite(f) ? f : 0;
  };
  if (value === null || value === undefined || value === '') return resolveFallback();
  const n = Number(value);
  return Number.isFinite(n) ? n : resolveFallback();
}

export class PriceTick {
  public readonly symbol: string;
  public readonly bid: number;
  public readonly ask: number;
  public readonly spread: number;
  public readonly volume: number;
  public readonly change24h: number;
  public readonly change24hPercent: number;
  public readonly timestamp: number;

  constructor(props: PriceTickProps) {
    this.symbol = props.symbol.toUpperCase().trim();
    this.bid = coerceFinite(props.bid, 0);
    this.ask = coerceFinite(props.ask, 0);
    this.spread = coerceFinite(props.spread, Number(Math.abs(this.ask - this.bid).toFixed(5)));
    this.volume = coerceFinite(props.volume, 0);
    this.change24h = coerceFinite(props.change24h, 0);
    this.change24hPercent = coerceFinite(props.change24hPercent, 0);
    this.timestamp = coerceFinite(props.timestamp, 0) || Date.now();
  }

  public get last(): number {
    return Number(((this.bid + this.ask) / 2).toFixed(5));
  }

  public isPositiveChange(): boolean {
    return this.change24hPercent > 0;
  }

  public isNegativeChange(): boolean {
    return this.change24hPercent < 0;
  }

  public formatPrice(category?: string): string {
    if (this.last === 0) return '---.---';
    const cat = category?.toLowerCase();
    if (cat === 'crypto' || this.last > 500) return this.last.toFixed(2);
    if (this.last > 50) return this.last.toFixed(3);
    return this.last.toFixed(5);
  }

  public static calculate24hChange(currentPrice: number, d1Open: number) {
    if (!d1Open || d1Open === 0) return { changeAmount: 0, changePercent: 0 };
    const changeAmount = Number((currentPrice - d1Open).toFixed(5));
    const changePercent = Number(((changeAmount / d1Open) * 100).toFixed(2));
    return { changeAmount, changePercent };
  }
}
