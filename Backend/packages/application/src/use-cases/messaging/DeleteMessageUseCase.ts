import { IMessageRepository } from '@betrix/domain';

export class DeleteMessageUseCase {
  constructor(private readonly messageRepo: IMessageRepository) {}

  public async execute(messageId: string, userId: string): Promise<{ success: boolean }> {
    const deleted = await this.messageRepo.softDelete(messageId, userId);
    return { success: deleted };
  }
}
