import { IMessageRepository, Message } from '@betrix/domain';

export class GetThreadUseCase {
  constructor(private readonly messageRepo: IMessageRepository) {}

  public async execute(threadId: string): Promise<Message[]> {
    return this.messageRepo.findThread(threadId);
  }
}
