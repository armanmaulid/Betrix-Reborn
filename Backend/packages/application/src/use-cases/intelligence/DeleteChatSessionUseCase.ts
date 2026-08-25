import { IChatRepository } from '@betrix/domain';

export class DeleteChatSessionUseCase {
  constructor(private readonly chatRepo: IChatRepository) {}

  public async execute(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; deletedCount: number }> {
    const deletedCount = await this.chatRepo.deleteSession(sessionId, userId);
    return {
      success: true,
      deletedCount
    };
  }
}
