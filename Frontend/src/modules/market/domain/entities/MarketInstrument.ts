export interface MarketInstrumentProps {
  symbol: string;
  name?: string;
  category: string;
  description?: string;
  digits?: number;
  pipSize?: number;
  finnhubSymbol?: string;
  dukascopySymbol?: string;
  isActive: boolean;
}

export class MarketInstrument {
  public readonly symbol: string;
  public readonly name: string;
  public readonly category: string;
  public readonly description: string;
  public readonly digits: number;
  public readonly pipSize: number;
  public readonly finnhubSymbol?: string;
  public readonly dukascopySymbol?: string;
  public readonly isActive: boolean;

  constructor(props: MarketInstrumentProps) {
    this.symbol = props.symbol.toUpperCase().trim();
    this.name = props.name || props.symbol;
    this.category = props.category.toLowerCase();
    this.description = props.description || '';
    this.digits = props.digits ?? 2;
    this.pipSize = props.pipSize ?? (props.digits ? 1 / Math.pow(10, props.digits) : 0.01);
    this.finnhubSymbol = props.finnhubSymbol;
    this.dukascopySymbol = props.dukascopySymbol;
    this.isActive = Boolean(props.isActive);
  }
}

export interface StreamSymbolEntityProps {
  symbol: string;
  finnhubSymbol: string;
  category: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export class StreamSymbolEntity {
  public readonly symbol: string;
  public readonly finnhubSymbol: string;
  public readonly category: string;
  public readonly description: string | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: StreamSymbolEntityProps) {
    this.symbol = props.symbol.toUpperCase().trim();
    this.finnhubSymbol = props.finnhubSymbol.toUpperCase().trim();
    this.category = props.category.toLowerCase();
    this.description = props.description ?? null;
    this.isActive = Boolean(props.isActive);
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
  }
}

export interface OhlcSymbolEntityProps {
  symbol: string;
  dukascopySymbol: string;
  category: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export class OhlcSymbolEntity {
  public readonly symbol: string;
  public readonly dukascopySymbol: string;
  public readonly category: string;
  public readonly description: string | null;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: OhlcSymbolEntityProps) {
    this.symbol = props.symbol.toUpperCase().trim();
    this.dukascopySymbol = props.dukascopySymbol;
    this.category = props.category.toLowerCase();
    this.description = props.description ?? null;
    this.isActive = Boolean(props.isActive);
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : new Date();
  }
}
