import { IStreamSymbolRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class DeleteStreamSymbolUseCase {
  constructor(
    private readonly streamSymbolRepo: IStreamSymbolRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    symbol: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<boolean> {
    const deleted = await this.streamSymbolRepo.delete(symbol.toUpperCase());

    if (deleted && this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'DELETE_STREAM_SYMBOL',
          targetType: 'stream_symbol',
          targetId: symbol.toUpperCase(),
          details: { symbol: symbol.toUpperCase() },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return deleted;
  }
}
