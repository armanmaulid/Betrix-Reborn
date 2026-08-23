import { INewsRepository, IAdminActionRepository, AdminAction } from '@betrix/domain';

export class DeleteNewsUseCase {
  constructor(
    private readonly newsRepo: INewsRepository,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    id: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<boolean> {
    const deleted = await this.newsRepo.deleteById(id);

    if (deleted && this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'DELETE_NEWS',
          targetType: 'news_article',
          targetId: id,
          details: { id },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return deleted;
  }
}
