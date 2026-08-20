import { Type, Static } from '@sinclair/typebox';

// Get Symbols Query
export const GetSymbolsQuerySchema = Type.Object({
  category: Type.Optional(Type.String()),
  activeOnly: Type.Optional(Type.Boolean({ default: true }))
});
export type GetSymbolsQueryDTO = Static<typeof GetSymbolsQuerySchema>;

// Get OHLC Route Parameters
export const GetOHLCParamsSchema = Type.Object({
  symbol: Type.String({ minLength: 2, maxLength: 20 }),
  timeframe: Type.String({ minLength: 2, maxLength: 10 })
});
export type GetOHLCParamsDTO = Static<typeof GetOHLCParamsSchema>;

// Get OHLC Query Options
export const GetOHLCQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500, default: 100 }))
});
export type GetOHLCQueryDTO = Static<typeof GetOHLCQuerySchema>;
