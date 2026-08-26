import { randomUUID } from 'node:crypto';
import {
  IUserRepository,
  IMessageRepository,
  IAdminActionRepository,
  INotifier,
  Message,
  AdminAction
} from '@betrix/domain';
import { BroadcastMessageDTO } from '../../schemas/admin.schema.js';

export class BroadcastMessageUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly messageRepo: IMessageRepository,
    private readonly adminActionRepo: IAdminActionRepository,
    private readonly notifier?: INotifier
  ) {}

  public async execute(
    adminId: string,
    dto: BroadcastMessageDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; recipientsCount: number }> {
    let targetIds: string[];

    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      targetIds = dto.targetUserIds;
    } else {
      // Broadcast to all active users
      const allUsers = await this.userRepo.findAll({ page: 1, limit: 10000 });
      targetIds = allUsers.data
        .filter((u) => u.status === 'active' && u.id !== adminId)
        .map((u) => u.id);
    }

    const threadId = randomUUID();

    // T4.6 — single multi-row INSERT replaces the N+1 loop.
    const messages = targetIds.map((toUserId) => {
      const msg = new Message({
        id: randomUUID(),
        fromUserId: adminId,
        toUserId,
        subject: dto.subject,
        body: dto.body,
        threadId,
        createdAt: new Date()
      });
      this.notifier?.broadcastToUser(toUserId, 'message:broadcast', msg.toJSON());
      return msg;
    });

    await this.messageRepo.saveMany(messages);

    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'BROADCAST_MESSAGE',
      targetType: 'users',
      targetId: 'all',
      details: { subject: dto.subject, recipientCount: targetIds.length },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });

    await this.adminActionRepo.save(action);

    return {
      success: true,
      recipientsCount: targetIds.length
    };
  }
}
