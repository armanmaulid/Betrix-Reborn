export interface ModelConfig {
  id: string;
  name: string;
  tier: 'cheap' | 'balanced' | 'deep';
  creditsPer1kTokens: number;
  maxTokens: number;
  supportsThinking: boolean;
  isDefault?: boolean;
  description: string;
}

export class ModelPolicy {
  public static readonly ALLOWED_MODELS: Record<string, ModelConfig> = {
    'dahono/deepseek-v4-pro-0813': {
      id: 'dahono/deepseek-v4-pro-0813',
      name: 'DeepSeek V4 Pro (Deep Reasoning)',
      tier: 'deep',
      creditsPer1kTokens: 1,
      maxTokens: 8192,
      supportsThinking: true,
      description:
        'Flagship deep reasoning institutional market analyst with chain-of-thought analysis.'
    },
    'dahono/deepseek-v4-flash-0731': {
      id: 'dahono/deepseek-v4-flash-0731',
      name: 'DeepSeek V4 Flash (High Speed)',
      tier: 'cheap',
      creditsPer1kTokens: 1,
      maxTokens: 4096,
      supportsThinking: false,
      description:
        'Ultra-fast, low-latency market analysis engine for quick trade scans and price action checks.'
    },
    'dahono/glm-5.3': {
      id: 'dahono/glm-5.3',
      name: 'GLM 5.3 Technical Strategist',
      tier: 'balanced',
      creditsPer1kTokens: 1,
      maxTokens: 8192,
      supportsThinking: true,
      description:
        'Balanced quantitative strategist with strong multi-indicator mathematical synthesis.'
    },
    'dahono/kimi-k3': {
      id: 'dahono/kimi-k3',
      name: 'Kimi K3 Macro & Sentiment Analyst',
      tier: 'deep',
      creditsPer1kTokens: 1,
      maxTokens: 8192,
      supportsThinking: true,
      description: 'Deep context macroeconomic and news sentiment analyzer for broad market themes.'
    }
  };

  public static getModel(modelId: string): ModelConfig {
    if (ModelPolicy.ALLOWED_MODELS[modelId]) {
      return ModelPolicy.ALLOWED_MODELS[modelId]!;
    }
    // Dynamic support for custom gateway models configured via .env
    const isReasoner =
      modelId.includes('reasoner') ||
      modelId.includes('r1') ||
      modelId.includes('think') ||
      modelId.includes('deepseek-v4') ||
      modelId.includes('pro');

    return {
      id: modelId,
      name: modelId,
      tier: isReasoner ? 'deep' : 'balanced',
      creditsPer1kTokens: 1,
      maxTokens: 8192,
      supportsThinking: isReasoner,
      description: `Active environment configured model: ${modelId}`
    };
  }

  public static listModels(defaultModel?: string): ModelConfig[] {
    const list: ModelConfig[] = [];
    const seen = new Set<string>();

    if (defaultModel) {
      const def = ModelPolicy.getModel(defaultModel);
      list.push({ ...def, isDefault: true });
      seen.add(def.id);
    }

    for (const model of Object.values(ModelPolicy.ALLOWED_MODELS)) {
      if (!seen.has(model.id)) {
        list.push({ ...model, isDefault: false });
        seen.add(model.id);
      }
    }

    return list;
  }

  /**
   * Calculates required credits based on exact token usage.
   */
  public static calculateCreditCost(modelId: string, totalTokens: number): number {
    const model = ModelPolicy.getModel(modelId);
    const tokensInThousands = totalTokens / 1000;
    const rawCost = tokensInThousands * model.creditsPer1kTokens;
    return Math.max(1, Math.ceil(rawCost));
  }

  public static calculateTokenCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    return ModelPolicy.calculateCreditCost(modelId, inputTokens + outputTokens);
  }
}
