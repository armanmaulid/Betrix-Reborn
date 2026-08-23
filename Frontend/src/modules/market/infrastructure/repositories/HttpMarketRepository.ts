import type { IMarketRepository } from '../../domain/repositories/IMarketRepository';
import { MarketInstrument, StreamSymbolEntity, OhlcSymbolEntity } from '../../domain/entities/MarketInstrument';
import { PriceTick } from '../../domain/value-objects/PriceTick';
import { HttpClient, unwrapData, unwrapListData } from '@shared/infrastructure/http/api-client';
import { MarketMapper } from '../mappers/MarketMapper';

export class HttpMarketRepository implements IMarketRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  public async getSymbols(activeOnly: boolean = false): Promise<MarketInstrument[]> {
    const res = await this.http.get<{ data: any[] }>('/api/market/symbols', {
      queryParams: { activeOnly }
    });
    return unwrapListData(res).map(MarketMapper.toInstrumentEntity);
  }

  public async saveSymbol(instrument: Partial<MarketInstrument> & { symbol: string }): Promise<MarketInstrument> {
    const res = await this.http.post<{ data: any }>('/api/admin/symbols', instrument);
    return MarketMapper.toInstrumentEntity(unwrapData(res));
  }

  public async deleteSymbol(symbol: string): Promise<boolean> {
    await this.http.delete(`/api/admin/symbols/${encodeURIComponent(symbol.toUpperCase())}`);
    return true;
  }

  public async getStreamSymbols(activeOnly: boolean = false): Promise<StreamSymbolEntity[]> {
    const res = await this.http.get<{ data: any[] }>('/api/market/stream-symbols', {
      queryParams: { activeOnly }
    });
    return unwrapListData(res).map(MarketMapper.toStreamSymbolEntity);
  }

  public async saveStreamSymbol(streamData: Partial<StreamSymbolEntity> & { symbol: string; finnhubSymbol: string }): Promise<StreamSymbolEntity> {
    const res = await this.http.post<{ data: any }>('/api/admin/stream-symbols', streamData);
    return MarketMapper.toStreamSymbolEntity(unwrapData(res));
  }

  public async deleteStreamSymbol(symbol: string): Promise<boolean> {
    await this.http.delete(`/api/admin/stream-symbols/${encodeURIComponent(symbol.toUpperCase())}`);
    return true;
  }

  public async getOhlcSymbols(activeOnly: boolean = false): Promise<OhlcSymbolEntity[]> {
    const res = await this.http.get<{ data: any[] }>('/api/admin/ohlc-symbols', {
      queryParams: { activeOnly }
    });
    return unwrapListData(res).map(MarketMapper.toOhlcSymbolEntity);
  }

  public async saveOhlcSymbol(data: { symbol: string; dukascopySymbol: string; description?: string; isActive?: boolean }): Promise<OhlcSymbolEntity> {
    const res = await this.http.post<{ data: any }>('/api/admin/ohlc-symbols', data);
    return MarketMapper.toOhlcSymbolEntity(unwrapData(res));
  }

  public async deleteOhlcSymbol(symbol: string): Promise<boolean> {
    await this.http.delete(`/api/admin/ohlc-symbols/${encodeURIComponent(symbol.toUpperCase())}`);
    return true;
  }

  public async getPricesSnapshot(): Promise<PriceTick[]> {
    const res = await this.http.get<{ data: any[] }>('/api/market/prices');
    return unwrapListData(res).map((dto) => MarketMapper.toPriceTick(dto));
  }
}

export const marketRepository = new HttpMarketRepository();
