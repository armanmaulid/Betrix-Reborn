import { ISessionRepository } from '@betrix/domain';

export class LogoutAllUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  public async execute(userId: string): Promise<{ success: boolean; revokedCount: number }> {
    const count = await this.sessionRepo.deleteByUserId(userId);
    return {
      success: true,
      revokedCount: count
    };
  }
}
