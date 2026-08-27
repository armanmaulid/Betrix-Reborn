import { randomUUID } from 'node:crypto';
import pino from 'pino';
import {
  IChatRepository,
  ICreditRepository,
  IActivityLogRepository,
  ChatMessage,
  ChatMessageStreamedEvent,
  EventDispatcher
} from '@betrix/domain';

/** Minimal structural logger so this package stays free of config/env deps. */
export interface HandlerLogger {
  error(obj: unknown, msg?: string): void;
}

// Fallback only — real logger is always injected. No pino-pretty transport here:
// it's a dev dep of apps/*, and under pnpm strict resolution this shared package
// cannot resolve it (pino throws at import time before injection happens).
const fallbackLogger: HandlerLogger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

export class ChatLoggingHandler {
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly creditRepo: ICreditRepository,
    private readonly activityLogRepo?: IActivityLogRepository,
    private readonly logger: HandlerLogger = fallbackLogger
  ) {}

  public register(dispatcher: EventDispatcher): void {
    dispatcher.register<ChatMessageStreamedEvent>('chat:streamed', async (event) => {
      await this.handle(event);
    });
  }

  public async handle(event: ChatMessageStreamedEvent): Promise<void> {
    try {
      // NOTE: credits are already deducted by StreamMessageUseCase via
      // creditRepo.settleReservation() BEFORE this event is dispatched.
      // Do NOT call deductCredits here — that would double-charge the user
      // for every streamed chat message (settleReservation + deductCredits
      // both subtract from the same `credits` column).

      // 1. Persist chat message
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

      // 2. Log user activity
      if (this.activityLogRepo) {
        await this.activityLogRepo.log(event.userId, 'AI_CHAT_STREAM_COMPLETED', {
          sessionId: event.sessionId,
          model: event.model,
          tokens: event.inputTokens + event.outputTokens,
          creditsSpent: event.creditsSpent
        });
      }
    } catch (err: any) {
      this.logger.error(
        { err: err.message, sessionId: event.sessionId },
        '[ChatLoggingHandler] Error processing streamed chat log'
      );
    }
  }
}
