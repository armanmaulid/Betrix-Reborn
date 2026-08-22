import { MarketInstrument, StreamSymbolEntity } from '../entities/MarketInstrument';
import { PriceTick } from '../value-objects/PriceTick';

export interface IMarketRepository {
  getSymbols(activeOnly?: boolean): Promise<MarketInstrument[]>;
  saveSymbol(instrument: Partial<MarketInstrument> & { symbol: string }): Promise<MarketInstrument>;
  deleteSymbol(symbol: string): Promise<boolean>;

  getStreamSymbols(activeOnly?: boolean): Promise<StreamSymbolEntity[]>;
  saveStreamSymbol(symbol: Partial<StreamSymbolEntity> & { symbol: string; finnhubSymbol: string }): Promise<StreamSymbolEntity>;
  deleteStreamSymbol(symbol: string): Promise<boolean>;

  getPricesSnapshot(): Promise<PriceTick[]>;
}
