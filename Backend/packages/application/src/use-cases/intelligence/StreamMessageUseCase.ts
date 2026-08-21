import { randomUUID } from 'node:crypto';
import { AppError } from '@betrix/core';
import {
  IChatRepository,
  ICreditRepository,
  IAiGateway,
  IAiAgentRepository,
  AiAgent,
  EventDispatcher,
  ChatMessageStreamedEvent,
  PromptTemplateRegistry
} from '@betrix/domain';
import { ContextInjectionService } from '../../services/ContextInjectionService.js';
import { StreamMessageDTO } from '../../schemas/chat.schema.js';

export interface StreamMessageCallbacks {
  onThink?: (chunk: string) => void;
  onDelta?: (chunk: string) => void;
  onDone?: (meta: {
    sessionId: string;
    agentId?: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    creditsSpent: number;
  }) => void;
  onError?: (error: Error) => void;
}

export class StreamMessageUseCase {
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly creditRepo: ICreditRepository,
    private readonly aiGateway: IAiGateway,
    private readonly contextInjectionService: ContextInjectionService,
    private readonly eventDispatcher: EventDispatcher,
    private readonly agentRepo?: IAiAgentRepository,
    private readonly defaultModel: string = 'dahono/deepseek-v4-pro-0813'
  ) {}

  public async execute(
    userId: string,
    dto: StreamMessageDTO,
    callbacks: StreamMessageCallbacks
  ): Promise<void> {
    // 1. Atomic credit reservation (Bug 8 fix — no check-then-deduct race)
    const maxTokens = dto.maxTokens || 8192;
    const estimatedInputTokens = Math.ceil((dto.message.length + 8000) / 4);
    const reservationAmount = Math.max(1, Math.ceil(((estimatedInputTokens + maxTokens) / 1000)));
    const reserved = await this.creditRepo.reserveCredits(userId, reservationAmount);
    if (!reserved) {
      throw new AppError('Insufficient credits to initiate AI chat. Please top up or redeem a voucher.', 402, 'PAYMENT_REQUIRED');
    }
    let settled = false;

    // 2. Resolve Dynamic Agent from Database (Zero Backend Restart)
    let agent: AiAgent | null = null;
    if (this.agentRepo) {
      if (dto.agentId) {
        agent = await this.agentRepo.findById(dto.agentId);
      } else if (dto.model) {
        agent = (await this.agentRepo.findById(dto.model)) || null;
      }
      if (!agent) {
        agent = await this.agentRepo.findDefault();
      }
    }

    const modelName = agent?.modelName || dto.model || this.defaultModel;
    const taskType = agent?.taskType || dto.taskType || 'market_analysis';
    const sessionId = dto.sessionId || randomUUID();

    // 3. Build Market Context (ADR-07, ADR-22, ADR-28)
    let marketContextBlock = '';
    if (dto.marketContext) {
      const injected = await this.contextInjectionService.buildMarketContext(dto.marketContext);
      marketContextBlock = injected.contextBlock;
    }

    // 4. System Prompt Construction
    const template = PromptTemplateRegistry.getTemplate(taskType);
    let systemPromptContent = dto.systemPrompt || agent?.systemPrompt || template.systemPrompt;
    if (marketContextBlock) {
      systemPromptContent += `\n\n${marketContextBlock}`;
    }

    // 5. Conversation History (last 10 only — context window)
    const history = await this.chatRepo.findRecentBySessionId(sessionId, userId, 10);
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPromptContent }
    ];

    for (const item of history) {
      messages.push({ role: 'user', content: item.message });
      messages.push({ role: 'assistant', content: item.reply });
    }

    messages.push({ role: 'user', content: dto.message });

    let fullReply = '';

    // 6. Stream from AI Gateway with dual think/delta callbacks
    try {
    await this.aiGateway.stream(
      {
        model: modelName,
        messages,
        temperature: agent?.temperature !== undefined ? agent.temperature / 100 : (dto.temperature ?? 0.7),
        maxTokens: agent?.maxTokens || dto.maxTokens,
        baseUrl: agent?.baseUrl || undefined,
        apiKey: agent?.apiKey || undefined
      },
      {
        onThink: (chunk) => {
          callbacks.onThink?.(chunk);
        },
        onDelta: (chunk) => {
          fullReply += chunk;
          callbacks.onDelta?.(chunk);
        },
        onDone: (meta) => {
          const totalTokens = meta.inputTokens + meta.outputTokens;
          const creditsRate = agent?.creditsPer1kTokens ?? 1;
          const creditsSpent = Math.max(1, Math.ceil((totalTokens / 1000) * creditsRate));
          settled = true;

          // Settle reservation with actual usage — fire-and-forget safe now:
          // even if this throws, the finally below releases the hold.
          void this.creditRepo
            .settleReservation(userId, reservationAmount, creditsSpent, `AI_CHAT:${agent?.id || modelName}:${sessionId}`)
            .catch(() => {});

          // Emit onDone SSE event with metadata
          callbacks.onDone?.({
            sessionId,
            agentId: agent?.id,
            inputTokens: meta.inputTokens,
            outputTokens: meta.outputTokens,
            latencyMs: meta.latencyMs,
            creditsSpent
          });

          // 7. Asynchronous Persistence & Credit Billing (ADR-21)
          const event: ChatMessageStreamedEvent = {
            userId,
            sessionId,
            taskType,
            model: agent?.id || modelName,
            userMessage: dto.message,
            aiReply: fullReply,
            inputTokens: meta.inputTokens,
            outputTokens: meta.outputTokens,
            latencyMs: meta.latencyMs,
            creditsSpent,
            createdAt: new Date()
          };

          this.eventDispatcher.dispatch('chat:streamed', event);
        },
        onError: (err) => {
          callbacks.onError?.(err);
        }
      }
    );
    } finally {
      // Release the hold if stream failed/aborted before onDone fired.
      if (!settled) {
        await this.creditRepo.settleReservation(userId, reservationAmount, 0, `AI_CHAT_RELEASE:${sessionId}`).catch(() => {});
      }
    }
  }
}
