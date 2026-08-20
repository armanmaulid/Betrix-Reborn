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
    // 1. Balance Pre-check (ADR-29)
    const currentBalance = await this.creditRepo.getBalance(userId);
    if (currentBalance < 1) {
      throw new AppError('Insufficient credits to initiate AI chat. Please top up or redeem a voucher.', 402, 'PAYMENT_REQUIRED');
    }

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

    // 5. Conversation History
    const history = await this.chatRepo.findBySessionId(sessionId, userId);
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPromptContent }
    ];

    for (const item of history.slice(-10)) {
      messages.push({ role: 'user', content: item.message });
      messages.push({ role: 'assistant', content: item.reply });
    }

    messages.push({ role: 'user', content: dto.message });

    let fullReply = '';

    // 6. Stream from AI Gateway with dual think/delta callbacks
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
  }
}
