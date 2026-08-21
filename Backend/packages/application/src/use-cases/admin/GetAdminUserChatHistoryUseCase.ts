import { randomUUID } from 'node:crypto';
import { NotFoundError, PaginatedResult, PaginationParams } from '@betrix/core';
import {
  IUserRepository,
  IChatRepository,
  IAdminActionRepository,
  AdminAction,
  ChatMessage
} from '@betrix/domain';

export class GetAdminUserChatHistoryUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly chatRepo: IChatRepository,
    private readonly adminActionRepo: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    targetUserId: string,
    pagination: PaginationParams,
    sessionId?: string,
    context?: { ip?: string; userAgent?: string }
  ): Promise<PaginatedResult<ChatMessage> | ChatMessage[]> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    let result: PaginatedResult<ChatMessage> | ChatMessage[];
    if (sessionId) {
      result = await this.chatRepo.findBySessionId(sessionId, targetUserId);
    } else {
      result = await this.chatRepo.findByUserId(targetUserId, pagination);
    }

    // Privacy & Security: Record administrative access to user conversation history
    const action = new AdminAction({
      id: randomUUID(),
      adminId,
      action: 'VIEW_USER_CHAT',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        sessionId: sessionId ?? null,
        page: pagination.page,
        limit: pagination.limit
      },
      ip: context?.ip,
      userAgent: context?.userAgent,
      createdAt: new Date()
    });
    await this.adminActionRepo.save(action);

    return result;
  }
}
