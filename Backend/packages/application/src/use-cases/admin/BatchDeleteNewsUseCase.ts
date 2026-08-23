import { INewsRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class BatchDeleteNewsUseCase {
  constructor(
    private readonly newsRepo: INewsRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    ids: string[],
    context?: { ip?: string; userAgent?: string }
  ): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const deletedCount = await this.newsRepo.deleteMany(ids);

    if (deletedCount > 0 && this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'BATCH_DELETE_NEWS',
          targetType: 'news_article',
          targetId: `batch_${deletedCount}`,
          details: { ids, count: deletedCount },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return deletedCount;
  }
}
