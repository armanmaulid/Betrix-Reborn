import {
  IStreamSymbolRepository,
  StreamSymbol,
  IAdminActionRepository,
  AdminAction
} from '@betrix/domain';

export class SaveStreamSymbolUseCase {
  constructor(
    private readonly streamSymbolRepo: IStreamSymbolRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    dto: {
      symbol: string;
      finnhubSymbol: string;
      description?: string;
      category?: string;
      isActive?: boolean;
    },
    context?: { ip?: string; userAgent?: string }
  ): Promise<StreamSymbol> {
    const existing = await this.streamSymbolRepo.findBySymbol(dto.symbol.toUpperCase());

    const saved = await this.streamSymbolRepo.save({
      symbol: dto.symbol.toUpperCase(),
      finnhubSymbol: dto.finnhubSymbol,
      description: dto.description ?? existing?.description ?? null,
      category: dto.category ?? existing?.category ?? 'forex',
      isActive: dto.isActive !== undefined ? dto.isActive : (existing?.isActive ?? true)
    });

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: existing ? 'UPDATE_STREAM_SYMBOL' : 'CREATE_STREAM_SYMBOL',
          targetType: 'stream_symbol',
          targetId: saved.symbol,
          details: {
            symbol: saved.symbol,
            finnhubSymbol: saved.finnhubSymbol,
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
