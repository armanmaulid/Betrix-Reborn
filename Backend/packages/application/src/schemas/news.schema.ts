import { Type, Static } from '@sinclair/typebox';

// Get News Query Options
export const GetNewsQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  category: Type.Optional(Type.String()),
  tag: Type.Optional(Type.String())
});
export type GetNewsQueryDTO = Static<typeof GetNewsQuerySchema>;

// Trigger Fetch News Request
export const FetchNewsBodySchema = Type.Object({
  category: Type.Optional(Type.String({ default: 'general' }))
});
export type FetchNewsBodyDTO = Static<typeof FetchNewsBodySchema>;
