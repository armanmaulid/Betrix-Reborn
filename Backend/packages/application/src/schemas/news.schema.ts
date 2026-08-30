import { Type, Static } from '@sinclair/typebox';

// Get News Query Options
export const GetNewsQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  category: Type.Optional(Type.String()),
  tag: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  sort: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')]))
});
export type GetNewsQueryDTO = Static<typeof GetNewsQuerySchema>;

// A1 — narrow so `Value.Cast(GetNewsQuerySchema, ...)` callers see `page: number`
// / `limit: number` (TypeBox keeps `Type.Optional + default` as `T | undefined`).
export type ResolvedGetNewsQueryDTO = Omit<GetNewsQueryDTO, 'page' | 'limit'> & {
  page: number;
  limit: number;
};

// Trigger Fetch News Request
export const FetchNewsBodySchema = Type.Object({
  category: Type.Optional(Type.String({ default: 'general' }))
});
export type FetchNewsBodyDTO = Static<typeof FetchNewsBodySchema>;

// Batch Delete News Request
export const BatchDeleteNewsBodySchema = Type.Object({
  ids: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })
});
export type BatchDeleteNewsBodyDTO = Static<typeof BatchDeleteNewsBodySchema>;
