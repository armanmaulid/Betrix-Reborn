import { OHLCBar, PriceTick } from '../entities/OHLCBar.js';

/** Port for real-time market data streaming (e.g., Finnhub WebSocket). */
export interface IRealtimeProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribeSymbols(symbols: string[]): void;
  onPriceTick(callback: (tick: PriceTick) => void): void;
}

/** Port for fetching historical OHLC candle data (e.g., Dukascopy). */
export interface IHistoricalProvider {
  fetchHistory(
    symbol: string,
    timeframe: string,
    fromDate: Date,
    toDate: Date
  ): Promise<OHLCBar[]>;
}
