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
  includeNews: Type.Optional(Type.Boolean({ default: true })),
  newsLimit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, default: 3 }))
});
export type MarketContextOptionsDTO = Static<typeof MarketContextOptionsSchema>;

// A1 — narrow so `Value.Default(MarketContextOptionsSchema, ...)` callers see
// the defaulted fields as non-optional (TypeBox keeps `Type.Optional + default`
// as `T | undefined` at the type level).
export type ResolvedMarketContextOptionsDTO = Omit<
  MarketContextOptionsDTO,
  'timeframe' | 'candleCount' | 'newsLimit' | 'includeNews'
> & {
  timeframe: string;
  candleCount: number;
  newsLimit: number;
  includeNews: boolean;
};

// Send Message DTO (Synchronous REST completion)
export const SendMessageSchema = Type.Object({
  sessionId: Type.Optional(Type.String()),
  agentId: Type.Optional(Type.String()),
  taskType: Type.Optional(Type.String({ default: 'market_analysis' })),
  model: Type.Optional(Type.String()),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2, default: 0.7 })),
  maxTokens: Type.Optional(Type.Integer({ minimum: 256, maximum: 65536, default: 8192 })),
  message: Type.String({ minLength: 1, maxLength: 8000 }),
  marketContext: Type.Optional(MarketContextOptionsSchema),
  systemPrompt: Type.Optional(Type.String({ maxLength: 2000 }))
});
export type SendMessageDTO = Static<typeof SendMessageSchema>;

// A1 — narrow the static type so `Value.Decode(SendMessageSchema, ...)` callers
// see `maxTokens: number`, not `number | undefined`. `Type.Optional + default`
// keeps the base `SendMessageDTO` as `T | undefined` (TypeBox limitation), but
// `Value.Decode` is guaranteed to apply the default at runtime.
export type ResolvedSendMessageDTO = Omit<
  SendMessageDTO,
  'maxTokens' | 'temperature' | 'taskType'
> & {
  maxTokens: number;
  temperature: number;
  taskType: string;
};

// Stream Message DTO (SSE streaming completion)
export const StreamMessageSchema = Type.Object({
  sessionId: Type.Optional(Type.String()),
  agentId: Type.Optional(Type.String()),
  taskType: Type.Optional(Type.String({ default: 'market_analysis' })),
  model: Type.Optional(Type.String()),
  temperature: Type.Optional(Type.Number({ minimum: 0, maximum: 2, default: 0.7 })),
  maxTokens: Type.Optional(Type.Integer({ minimum: 256, maximum: 65536, default: 8192 })),
  message: Type.String({ minLength: 1, maxLength: 8000 }),
  marketContext: Type.Optional(MarketContextOptionsSchema),
  systemPrompt: Type.Optional(Type.String({ maxLength: 2000 }))
});
export type StreamMessageDTO = Static<typeof StreamMessageSchema>;
export type ResolvedStreamMessageDTO = Omit<
  StreamMessageDTO,
  'maxTokens' | 'temperature' | 'taskType'
> & {
  maxTokens: number;
  temperature: number;
  taskType: string;
};

// Session ID Parameter
export const SessionIdParamSchema = Type.Object({
  sessionId: Type.String({ minLength: 1 })
});
export type SessionIdParamDTO = Static<typeof SessionIdParamSchema>;
