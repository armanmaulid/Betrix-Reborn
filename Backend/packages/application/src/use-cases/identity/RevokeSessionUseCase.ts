import { ISessionRepository } from '@betrix/domain';

export class RevokeSessionUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  public async execute(token: string): Promise<{ success: boolean; message: string }> {
    await this.sessionRepo.delete(token);
    return {
      success: true,
      message: 'Session successfully revoked.'
    };
  }
}
