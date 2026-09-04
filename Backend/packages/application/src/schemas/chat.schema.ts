import { Type, Static } from '@sinclair/typebox';

// Modular Technical Indicators Selection Schema (ADR-22)
export const TechnicalIndicatorsConfigSchema = Type.Object({
  sma: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 500 }))),
  ema: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 500 }))),
  rsi: Type.Optional(Type.Boolean({ default: true })),
  atr: Type.Optional(Type.Boolean({ default: true })),
  macd: Type.Optional(Type.Boolean({ default: false })),
  supportResistance: Type.Optional(Type.Boolean({ default: true }))
});
export type TechnicalIndicatorsConfigDTO = Static<typeof TechnicalIndicatorsConfigSchema>;

// Market Context Injection Options Schema (ADR-07 & ADR-22)
export const MarketContextOptionsSchema = Type.Object({
  symbol: Type.String({ minLength: 2, maxLength: 20 }),
  timeframe: Type.Optional(Type.String({ default: 'h1' })),
  candleCount: Type.Optional(Type.Integer({ minimum: 5, maximum: 200, default: 30 })),
  indicators: Type.Optional(TechnicalIndicatorsConfigSchema),
  includeCandles: Type.Optional(Type.Boolean({ default: true })),
  includeIndicators: Type.Optional(Type.Boolean({ default: true })),
  includeNews: Type.Optional(Type.Boolean({ default: true })),
  newsLimit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: 3 }))
});
export type MarketContextOptionsDTO = Static<typeof MarketContextOptionsSchema>;

// Send Message DTO (Synchronous REST completion)
export const SendMessageSchema = Type.Object({
  sessionId: Type.Optional(Type.String()),
  agentId: Type.Optional(Type.String()),
  taskType: Type.Optional(Type.String({ default: 'market_analysis' })),
  model: Type.Optional(Type.String()),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
  maxTokens: Type.Optional(Type.Integer({ minimum: 256, maximum: 65536 })),
  message: Type.String({ minLength: 1, maxLength: 8000 }),
  marketContext: Type.Optional(MarketContextOptionsSchema),
  systemPrompt: Type.Optional(Type.String({ maxLength: 2000 }))
});
export type SendMessageDTO = Static<typeof SendMessageSchema>;

// Stream Message DTO (SSE streaming completion)
export const StreamMessageSchema = Type.Object({
  sessionId: Type.Optional(Type.String()),
  agentId: Type.Optional(Type.String()),
  taskType: Type.Optional(Type.String({ default: 'market_analysis' })),
  model: Type.Optional(Type.String()),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2 })),
  maxTokens: Type.Optional(Type.Integer({ minimum: 256, maximum: 65536 })),
  message: Type.String({ minLength: 1, maxLength: 8000 }),
  marketContext: Type.Optional(MarketContextOptionsSchema),
  systemPrompt: Type.Optional(Type.String({ maxLength: 2000 }))
});
export type StreamMessageDTO = Static<typeof StreamMessageSchema>;

// Session ID Parameter
export const SessionIdParamSchema = Type.Object({
  sessionId: Type.String({ minLength: 1 })
});
export type SessionIdParamDTO = Static<typeof SessionIdParamSchema>;
