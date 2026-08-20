import { PaginatedResult, PaginationParams } from '@betrix/core';
import { IChatRepository, ChatMessage } from '@betrix/domain';

export class GetChatHistoryUseCase {
  constructor(private readonly chatRepo: IChatRepository) {}

  public async execute(
    userId: string,
    pagination: PaginationParams,
    sessionId?: string
  ): Promise<PaginatedResult<ChatMessage> | ChatMessage[]> {
    if (sessionId) {
      return this.chatRepo.findBySessionId(sessionId, userId);
    }
    return this.chatRepo.findByUserId(userId, pagination);
  }
}
