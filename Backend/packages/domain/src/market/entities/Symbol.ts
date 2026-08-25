import { Nullable } from '@betrix/core';

export interface SymbolProps {
  symbol: string;
  description?: Nullable<string>;
  path?: Nullable<string>;
  category:
    'forex' | 'commodity' | 'metal' | 'energy' | 'crypto' | 'indices' | 'bonds' | 'stocks' | string;
  finnhubSymbol?: Nullable<string>;
  dukascopySymbol?: Nullable<string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Symbol {
  public readonly symbol: string;
  public readonly description: Nullable<string>;
  public readonly path: Nullable<string>;
  public readonly category: string;
  public readonly finnhubSymbol: Nullable<string>;
  public readonly dukascopySymbol: Nullable<string>;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: SymbolProps) {
    this.symbol = props.symbol.toUpperCase();
    this.description = props.description ?? null;
    this.path = props.path ?? null;
    this.category = props.category;
    this.finnhubSymbol = props.finnhubSymbol ?? null;
    this.dukascopySymbol = props.dukascopySymbol ?? null;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** True if symbol is active and has at least one data source mapping */
  public isTradable(): boolean {
    return this.isActive && (this.hasFinnhubMapping() || this.hasDukascopyMapping());
  }

  /** True if this symbol has a Finnhub WebSocket mapping for real-time ticks */
  public hasFinnhubMapping(): boolean {
    return (
      this.finnhubSymbol !== null &&
      this.finnhubSymbol !== undefined &&
      this.finnhubSymbol.length > 0
    );
  }

  /** True if this symbol has a Dukascopy mapping for historical OHLC data */
  public hasDukascopyMapping(): boolean {
    return (
      this.dukascopySymbol !== null &&
      this.dukascopySymbol !== undefined &&
      this.dukascopySymbol.length > 0
    );
  }

  public toJSON() {
    return {
      symbol: this.symbol,
      description: this.description,
      path: this.path,
      category: this.category,
      finnhubSymbol: this.finnhubSymbol,
      dukascopySymbol: this.dukascopySymbol,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
