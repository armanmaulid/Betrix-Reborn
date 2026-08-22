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
    this.bid = props.bid ?? 0;
    this.ask = props.ask ?? 0;
    this.spread = props.spread ?? Number(Math.abs(this.ask - this.bid).toFixed(5));
    this.volume = props.volume ?? 0;
    this.change24h = props.change24h ?? 0;
    this.change24hPercent = props.change24hPercent ?? 0;
    this.timestamp = props.timestamp || Date.now();
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
