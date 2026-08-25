import { describe, it, expect } from 'vitest';
import { AiAgent } from './AiAgent';

describe('Intelligence Domain: AiAgent', () => {
  it('should instantiate AiAgent and calculate estimated credits accurately', () => {
    const agent = new AiAgent({
      id: 'gpt-4o',
      name: 'GPT-4o Institutional',
      modelName: 'gpt-4o',
      taskType: 'analysis',
      tier: 'deep',
      creditsPer1kTokens: 15,
      maxTokens: 8192,
      temperature: 0.7,
      supportsThinking: true,
      isDefault: true,
      isActive: true,
      visibility: 'public',
      createdAt: '2026-01-01T00:00:00Z'
    });

    expect(agent.isDefault).toBe(true);
    expect(agent.calculateEstimatedCredits(10000)).toBe(150);
    expect(agent.getTierBadgeVariant()).toBe('accent');
  });
});
