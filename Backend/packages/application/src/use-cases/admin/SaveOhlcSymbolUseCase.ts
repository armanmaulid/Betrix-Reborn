import {
  IOhlcSymbolRepository,
  ISymbolRepository,
  OhlcSymbol,
  IAdminActionRepository,
  AdminAction
} from '@betrix/domain';

export class SaveOhlcSymbolUseCase {
  constructor(
    private readonly ohlcSymbolRepo: IOhlcSymbolRepository,
    private readonly symbolRepo: ISymbolRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    dto: {
      symbol: string;
      dukascopySymbol: string;
      description?: string;
      isActive?: boolean;
    },
    context?: { ip?: string; userAgent?: string }
  ): Promise<OhlcSymbol> {
    const sym = dto.symbol.toUpperCase();

    // FK validation — symbol must exist in catalog
    const catalogSymbol = await this.symbolRepo.findBySymbol(sym);
    if (!catalogSymbol) {
      throw new Error(
        `Symbol "${sym}" does not exist in the market catalog. Add it first via Symbols management.`
      );
    }

    // Ticker validation — the Dukascopy ticker must match the catalog's canonical
    // mapping. A typo here (e.g. "eurus" instead of "eurusd") would otherwise be
    // accepted silently and the SyncWorker would fetch nothing for the symbol.
    const canonicalTicker = catalogSymbol.dukascopySymbol?.toLowerCase();
    if (!canonicalTicker) {
      throw new Error(
        `Symbol "${sym}" has no Dukascopy mapping in the catalog — it cannot be added as an OHLC symbol.`
      );
    }
    const requestedTicker = dto.dukascopySymbol.trim().toLowerCase();
    if (requestedTicker !== canonicalTicker) {
      throw new Error(
        `Dukascopy ticker "${dto.dukascopySymbol}" does not match "${catalogSymbol.dukascopySymbol}" for "${sym}". Use the catalog's canonical ticker.`
      );
    }

    const existing = await this.ohlcSymbolRepo.findBySymbol(sym);

    const saved = await this.ohlcSymbolRepo.save({
      symbol: sym,
      dukascopySymbol: canonicalTicker,
      description: dto.description ?? existing?.description ?? catalogSymbol.description ?? null,
      category: catalogSymbol.category,
      isActive: dto.isActive !== undefined ? dto.isActive : (existing?.isActive ?? true)
    });

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: existing ? 'UPDATE_OHLC_SYMBOL' : 'CREATE_OHLC_SYMBOL',
          targetType: 'ohlc_symbol',
          targetId: saved.symbol,
          details: {
            symbol: saved.symbol,
            dukascopySymbol: saved.dukascopySymbol,
            category: saved.category,
            isActive: saved.isActive
          },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return saved;
  }
}
