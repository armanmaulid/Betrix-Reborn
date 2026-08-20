import { randomUUID } from 'node:crypto';
import {
  IChatRepository,
  ICreditRepository,
  IActivityLogRepository,
  ChatMessage,
  ChatMessageStreamedEvent,
  EventDispatcher
} from '@betrix/domain';

export class ChatLoggingHandler {
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly creditRepo: ICreditRepository,
    private readonly activityLogRepo?: IActivityLogRepository
  ) {}

  public register(dispatcher: EventDispatcher): void {
    dispatcher.register<ChatMessageStreamedEvent>('chat:streamed', async (event) => {
      await this.handle(event);
    });
  }

  public async handle(event: ChatMessageStreamedEvent): Promise<void> {
    try {
      // 1. Deduct credits if applicable
      if (event.creditsSpent > 0) {
        await this.creditRepo.deductCredits(
          event.userId,
          event.creditsSpent,
          `AI_CHAT_STREAM:${event.model}:${event.sessionId}`
        );
      }

      // 2. Persist chat message
      const chatMsg = new ChatMessage({
        id: randomUUID(),
        userId: event.userId,
        sessionId: event.sessionId,
        taskType: event.taskType,
        modelUsed: event.model,
        message: event.userMessage,
        reply: event.aiReply,
        latencyMs: event.latencyMs,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        createdAt: event.createdAt
      });

      await this.chatRepo.save(chatMsg);

      // 3. Log user activity
      if (this.activityLogRepo) {
        await this.activityLogRepo.log(event.userId, 'AI_CHAT_STREAM_COMPLETED', {
          sessionId: event.sessionId,
          model: event.model,
          tokens: event.inputTokens + event.outputTokens,
          creditsSpent: event.creditsSpent
        });
      }
    } catch (err: any) {
      console.error('[ChatLoggingHandler] Error processing streamed chat log:', err);
    }
  }
}
