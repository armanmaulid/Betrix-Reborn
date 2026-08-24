import { MarketInstrument, StreamSymbolEntity, OhlcSymbolEntity } from '../../domain/entities/MarketInstrument';
import { PriceTick, coerceFinite } from '../../domain/value-objects/PriceTick';

export class MarketMapper {
  public static toPriceTick(dto: any, existing?: Partial<PriceTick>): PriceTick {
    const symbol = (dto.symbol || dto.s || '').toUpperCase();
    const rawPrice = coerceFinite(dto.p, 0);
    const bidFallback = rawPrice > 0 ? rawPrice : coerceFinite(existing?.bid, 0);
    const askFallback = rawPrice > 0 ? rawPrice : coerceFinite(existing?.ask, 0);

    return new PriceTick({
      symbol,
      bid: coerceFinite(dto.bid, bidFallback),
      ask: coerceFinite(dto.ask, askFallback),
      spread: coerceFinite(dto.spread, Math.max(0, coerceFinite(dto.ask, askFallback) - coerceFinite(dto.bid, bidFallback))),
      change24h: coerceFinite(dto.change24h ?? existing?.change24h, 0),
      change24hPercent: coerceFinite(dto.change24hPercent ?? dto.c24p ?? existing?.change24hPercent, 0),
      volume: coerceFinite(dto.volume24h ?? dto.v ?? existing?.volume, 0),
      timestamp: coerceFinite(dto.timestamp ?? dto.t, 0) || Date.now()
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

  public static toOhlcSymbolEntity(dto: any): OhlcSymbolEntity {
    return new OhlcSymbolEntity({
      symbol: String(dto.symbol || '').toUpperCase(),
      dukascopySymbol: String(dto.dukascopySymbol || ''),
      category: String(dto.category || 'forex').toLowerCase(),
      description: dto.description || null,
      isActive: Boolean(dto.isActive ?? true),
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt
    });
  }
}
