import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentMapper } from './mappers/AgentMapper';
import { HttpAgentRepository } from './repositories/HttpAgentRepository';
import { HttpClient } from '@shared/infrastructure/http/api-client';

describe('Intelligence Infrastructure: AgentMapper & HttpAgentRepository', () => {
  let mockHttpClient: HttpClient;
  let agentRepo: HttpAgentRepository;

  beforeEach(() => {
    mockHttpClient = new HttpClient();
    agentRepo = new HttpAgentRepository(mockHttpClient);
  });

  it('should map raw agent DTO to AiAgent domain entity', () => {
    const rawDto = {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      modelName: 'claude-3-5-sonnet-20241022',
      taskType: 'deep_reasoning',
      tier: 'deep',
      creditsPer1kTokens: 20,
      maxTokens: 8192,
      temperature: 0.5,
      supportsThinking: true,
      isDefault: false,
      isActive: true,
      visibility: 'public'
    };

    const domainAgent = AgentMapper.toDomain(rawDto);

    expect(domainAgent.id).toBe('claude-3-5-sonnet');
    expect(domainAgent.tier).toBe('deep');
    expect(domainAgent.supportsThinking).toBe(true);
    expect(domainAgent.calculateEstimatedCredits(10000)).toBe(200);
  });

  it('should test agent inference via repository', async () => {
    const mockTestResult = {
      agentId: 'claude-3-5-sonnet',
      agentName: 'Claude 3.5 Sonnet',
      modelUsed: 'claude-3-5-sonnet-20241022',
      reply: 'Market analysis complete.',
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, latencyMs: 450 }
    };

    vi.spyOn(mockHttpClient, 'post').mockResolvedValue({ data: mockTestResult });

    const result = await agentRepo.testAgent('claude-3-5-sonnet', { message: 'Analyze EURUSD' });

    expect(result.reply).toBe('Market analysis complete.');
    expect(result.usage.latencyMs).toBe(450);
  });
});
