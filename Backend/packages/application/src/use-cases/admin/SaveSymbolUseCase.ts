import { ISymbolRepository, Symbol, IAdminActionRepository, AdminAction } from '@betrix/domain';
import { SaveSymbolDTO } from '../../schemas/admin.schema.js';

export class SaveSymbolUseCase {
  constructor(
    private readonly symbolRepo: ISymbolRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    dto: SaveSymbolDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<Symbol> {
    const existing = await this.symbolRepo.findBySymbol(dto.symbol.toUpperCase());
    const category = dto.category ?? existing?.category ?? 'forex';

    const symbol = new Symbol({
      symbol: dto.symbol.toUpperCase(),
      description: dto.description ?? existing?.description ?? null,
      path: existing?.path ?? `Market/${category}/${dto.symbol.toUpperCase()}`,
      category,
      finnhubSymbol: dto.finnhubSymbol ?? existing?.finnhubSymbol ?? null,
      dukascopySymbol: dto.dukascopySymbol ?? existing?.dukascopySymbol ?? null,
      isActive: dto.isActive !== undefined ? dto.isActive : (existing?.isActive ?? true),
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date()
    });

    const saved = await this.symbolRepo.save(symbol);

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: existing ? 'UPDATE_SYMBOL' : 'CREATE_SYMBOL',
          targetType: 'market_symbol',
          targetId: saved.symbol,
          details: {
            symbol: saved.symbol,
            category: saved.category,
            finnhubSymbol: saved.finnhubSymbol,
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
