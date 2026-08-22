import { MarketInstrument, StreamSymbolEntity } from '../../domain/entities/MarketInstrument';
import { PriceTick } from '../../domain/value-objects/PriceTick';

export class MarketMapper {
  public static toPriceTick(dto: any, existing?: Partial<PriceTick>): PriceTick {
    const symbol = (dto.symbol || dto.s || '').toUpperCase();
    const rawPrice = Number(dto.p ?? 0);
    const bid = Number(dto.bid ?? (rawPrice > 0 ? rawPrice : existing?.bid ?? 0));
    const ask = Number(dto.ask ?? (rawPrice > 0 ? rawPrice : existing?.ask ?? 0));
    const spread = dto.spread ?? Math.max(0, ask - bid);
    const change24hPercent = Number(dto.change24hPercent ?? dto.c24p ?? existing?.change24hPercent ?? 0);

    return new PriceTick({
      symbol,
      bid,
      ask,
      spread,
      change24h: Number(dto.change24h ?? existing?.change24h ?? 0),
      change24hPercent,
      volume: Number(dto.volume24h ?? dto.v ?? existing?.volume ?? 0),
      timestamp: dto.timestamp ?? dto.t ?? Date.now()
    });
  }

  public static toInstrumentEntity(dto: any): MarketInstrument {
    return new MarketInstrument({
      symbol: String(dto.symbol || '').toUpperCase(),
      name: dto.name || dto.symbol,
      category: String(dto.category || 'crypto').toLowerCase(),
      description: dto.description || '',
      digits: Number(dto.digits ?? 2),
      pipSize: Number(dto.pipSize ?? (dto.digits ? 1 / Math.pow(10, dto.digits) : 0.01)),
      finnhubSymbol: dto.finnhubSymbol || undefined,
      dukascopySymbol: dto.dukascopySymbol || undefined,
      isActive: Boolean(dto.isActive ?? true)
    });
  }

  public static toStreamSymbolEntity(dto: any): StreamSymbolEntity {
    return new StreamSymbolEntity({
      symbol: String(dto.symbol || '').toUpperCase(),
      finnhubSymbol: String(dto.finnhubSymbol || '').toUpperCase(),
      category: String(dto.category || 'forex').toLowerCase(),
      description: dto.description || null,
      isActive: Boolean(dto.isActive ?? true),
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt
    });
  }
}
