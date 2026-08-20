import { IMessageRepository } from '@betrix/domain';

export class MarkMessageReadUseCase {
  constructor(private readonly messageRepo: IMessageRepository) {}

  public async execute(messageId: string, userId: string): Promise<{ success: boolean }> {
    const updated = await this.messageRepo.markAsRead(messageId, userId);
    return { success: updated };
  }
}
