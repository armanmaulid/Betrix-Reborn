import { PaginatedResult, PaginationParams } from '@betrix/core';
import { IMessageRepository, Message } from '@betrix/domain';

export class GetInboxUseCase {
  constructor(private readonly messageRepo: IMessageRepository) {}

  public async execute(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Message>> {
    return this.messageRepo.findInbox(userId, pagination);
  }
}
