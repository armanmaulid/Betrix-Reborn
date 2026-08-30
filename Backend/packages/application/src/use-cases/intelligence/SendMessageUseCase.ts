import { randomUUID } from 'node:crypto';
import { Value } from '@sinclair/typebox/value';
import { AppError } from '@betrix/core';
import {
  IChatRepository,
  ICreditRepository,
  IAiGateway,
  IAiAgentRepository,
  AiAgent,
  ChatMessage,
  PromptTemplateRegistry
} from '@betrix/domain';
import { ContextInjectionService } from '../../services/ContextInjectionService.js';
import {
  SendMessageDTO,
  ResolvedSendMessageDTO,
  SendMessageSchema
} from '../../schemas/chat.schema.js';

export interface SendMessageResult {
  reply: string;
  thinking?: string;
  sessionId: string;
  taskType: string;
  modelUsed: string;
  agentId?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
  };
  creditsSpent: number;
  remainingCredits: number;
}

export class SendMessageUseCase {
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly creditRepo: ICreditRepository,
    private readonly aiGateway: IAiGateway,
    private readonly contextInjectionService: ContextInjectionService,
    private readonly agentRepo?: IAiAgentRepository,
    private readonly defaultModel: string = 'dahono/deepseek-v4-pro-0813'
  ) {}

  public async execute(userId: string, dto: SendMessageDTO): Promise<SendMessageResult> {
    // A1 — schema is the source of truth. Fastify/Ajv validates `body` but
    // does not apply schema `default`; we re-decode at the use-case boundary
    // so manual `|| default` lines are unnecessary. `ResolvedSendMessageDTO`
    // narrows the static type so `maxTokens`/`temperature`/`taskType` are
    // non-optional here (TypeBox keeps `Type.Optional + default` as
    // `T | undefined` at the type level — see SSOT §3 C1 note).
    const input = Value.Default(SendMessageSchema, dto) as ResolvedSendMessageDTO;

    // 1. Atomic credit reservation (Bug 8 fix — no check-then-deduct race)
    // Worst case: input (message + history + system prompt) + maxTokens output, at agent rate
    const estimatedInputTokens = Math.ceil((input.message.length + 8000) / 4);
    const reservationAmount = Math.max(
      1,
      Math.ceil((estimatedInputTokens + input.maxTokens) / 1000)
    );
    const reserved = await this.creditRepo.reserveCredits(userId, reservationAmount);
    if (!reserved) {
      throw new AppError(
        'Insufficient credits to initiate AI chat. Please top up or redeem a voucher.',
        402,
        'PAYMENT_REQUIRED'
      );
    }

    // 2. Resolve Dynamic Agent from Database (Zero Backend Restart)
    let agent: AiAgent | null = null;
    if (this.agentRepo) {
      if (input.agentId) {
        agent = await this.agentRepo.findById(input.agentId);
      } else if (input.model) {
        agent = (await this.agentRepo.findById(input.model)) || null;
      }
      if (!agent) {
        agent = await this.agentRepo.findDefault();
      }
    }

    const modelName = agent?.modelName || input.model || this.defaultModel;
    const taskType = agent?.taskType || input.taskType;
    const sessionId = input.sessionId || randomUUID();

    // 3. Build Market Context if requested (ADR-07, ADR-22, ADR-28)
    let marketContextBlock = '';
    if (input.marketContext) {
      const injected = await this.contextInjectionService.buildMarketContext(input.marketContext);
      marketContextBlock = injected.contextBlock;
    }

    // 4. System Prompt Construction
    const template = PromptTemplateRegistry.getTemplate(taskType);
    let systemPromptContent = input.systemPrompt || agent?.systemPrompt || template.systemPrompt;
    if (marketContextBlock) {
      systemPromptContent += `\n\n${marketContextBlock}`;
    }

    // 5. Load Conversation History (last 10 only — context window)
    const history = await this.chatRepo.findRecentBySessionId(sessionId, userId, 10);
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPromptContent }
    ];

    for (const item of history) {
      messages.push({ role: 'user', content: item.message });
      messages.push({ role: 'assistant', content: item.reply });
    }

    messages.push({ role: 'user', content: input.message });

    // 6. Call AI Gateway — reservation already held; settle on any outcome
    let settled = false;
    try {
      const response = await this.aiGateway.complete({
        model: modelName,
        messages,
        temperature: agent?.temperature !== undefined ? agent.temperature / 100 : input.temperature,
        maxTokens: agent?.maxTokens || input.maxTokens,
        baseUrl: agent?.baseUrl || undefined,
        apiKey: agent?.apiKey || undefined
      });

      // 7. Settle reservation with actual usage (ADR-21)
      const totalTokens = response.inputTokens + response.outputTokens;
      const creditsRate = agent?.creditsPer1kTokens ?? 1;
      const creditsSpent = Math.max(1, Math.ceil((totalTokens / 1000) * creditsRate));

      const remainingCredits = await this.creditRepo.settleReservation(
        userId,
        reservationAmount,
        creditsSpent,
        `AI_CHAT:${agent?.id || modelName}:${sessionId}`
      );
      settled = true;

      // 8. Persist Chat Message
      const chatMsg = new ChatMessage({
        id: randomUUID(),
        userId,
        sessionId,
        taskType,
        modelUsed: modelName,
        message: input.message,
        reply: response.reply,
        latencyMs: response.latencyMs,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        createdAt: new Date()
      });

      await this.chatRepo.save(chatMsg);

      return {
        reply: response.reply,
        thinking: response.thinking,
        sessionId,
        taskType,
        modelUsed: modelName,
        agentId: agent?.id,
        usage: {
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens,
          latencyMs: response.latencyMs
        },
        creditsSpent,
        remainingCredits
      };
    } finally {
      // Safety net: if anything threw between reserve and settle, release the hold uncharged.
      if (!settled) {
        await this.creditRepo
          .settleReservation(userId, reservationAmount, 0, `AI_CHAT_RELEASE:${sessionId}`)
          .catch(() => {});
      }
    }
  }
}
