import type { IMarketRepository } from '../../domain/repositories/IMarketRepository';
import { MarketInstrument, StreamSymbolEntity } from '../../domain/entities/MarketInstrument';
import { PriceTick } from '../../domain/value-objects/PriceTick';
import { HttpClient } from '@shared/infrastructure/http/api-client';
import { MarketMapper } from '../mappers/MarketMapper';

export class HttpMarketRepository implements IMarketRepository {
  constructor(private http: HttpClient = new HttpClient()) {}

  public async getSymbols(activeOnly: boolean = false): Promise<MarketInstrument[]> {
    const res = await this.http.get<{ data: any[] }>('/api/market/symbols', {
      queryParams: { activeOnly }
    });
    const items = res.data ?? (Array.isArray(res) ? res : []);
    return items.map(MarketMapper.toInstrumentEntity);
  }

  public async saveSymbol(instrument: Partial<MarketInstrument> & { symbol: string }): Promise<MarketInstrument> {
    const res = await this.http.post<{ data: any }>('/api/admin/symbols', instrument);
    return MarketMapper.toInstrumentEntity(res.data ?? res);
  }

  public async deleteSymbol(symbol: string): Promise<boolean> {
    await this.http.delete(`/api/admin/symbols/${encodeURIComponent(symbol.toUpperCase())}`);
    return true;
  }

  public async getStreamSymbols(activeOnly: boolean = false): Promise<StreamSymbolEntity[]> {
    const res = await this.http.get<{ data: any[] }>('/api/market/stream-symbols', {
      queryParams: { activeOnly }
    });
    const items = res.data ?? (Array.isArray(res) ? res : []);
    return items.map(MarketMapper.toStreamSymbolEntity);
  }

  public async saveStreamSymbol(streamData: Partial<StreamSymbolEntity> & { symbol: string; finnhubSymbol: string }): Promise<StreamSymbolEntity> {
    const res = await this.http.post<{ data: any }>('/api/admin/stream-symbols', streamData);
    return MarketMapper.toStreamSymbolEntity(res.data ?? res);
  }

  public async deleteStreamSymbol(symbol: string): Promise<boolean> {
    await this.http.delete(`/api/admin/stream-symbols/${encodeURIComponent(symbol.toUpperCase())}`);
    return true;
  }

  public async getPricesSnapshot(): Promise<PriceTick[]> {
    const res = await this.http.get<{ data: any[] }>('/api/market/prices');
    const items = res.data ?? (Array.isArray(res) ? res : []);
    return items.map((dto) => MarketMapper.toPriceTick(dto));
  }
}

export const marketRepository = new HttpMarketRepository();
