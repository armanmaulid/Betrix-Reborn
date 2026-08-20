import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@betrix/core';
import { IMessageRepository, IUserRepository, INotifier, Message } from '@betrix/domain';
import { SendUserMessageDTO } from '../../schemas/messaging.schema.js';

export class SendUserMessageUseCase {
  constructor(
    private readonly messageRepo: IMessageRepository,
    private readonly userRepo: IUserRepository,
    private readonly notifier?: INotifier
  ) {}

  public async execute(fromUserId: string, dto: SendUserMessageDTO): Promise<Message> {
    const toUser = await this.userRepo.findById(dto.toUserId);
    if (!toUser) {
      throw new NotFoundError('Recipient user not found.');
    }

    let threadId: string = randomUUID();
    if (dto.replyToMessageId) {
      const parentMsg = await this.messageRepo.findById(dto.replyToMessageId);
      if (parentMsg) {
        threadId = parentMsg.threadId;
      }
    }

    const message = new Message({
      id: randomUUID(),
      fromUserId,
      toUserId: dto.toUserId,
      subject: dto.subject,
      body: dto.body,
      threadId,
      replyToMessageId: dto.replyToMessageId,
      createdAt: new Date()
    });

    const saved = await this.messageRepo.save(message);

    // Push notification if recipient is active
    if (this.notifier) {
      this.notifier.broadcastToUser(dto.toUserId, 'message:new', saved.toJSON());
    }

    return saved;
  }
}
