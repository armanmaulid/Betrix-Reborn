import { Type, Static, TSchema, FormatRegistry } from '@sinclair/typebox';

// Register standard formats for TypeBox runtime validation
if (!FormatRegistry.Has('email')) {
  FormatRegistry.Set('email', (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

if (!FormatRegistry.Has('date-time')) {
  FormatRegistry.Set(
    'date-time',
    (value) => typeof value === 'string' && !isNaN(Date.parse(value))
  );
}

// Common Pagination Query Schema
export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 }))
});
export type PaginationQueryDTO = Static<typeof PaginationQuerySchema>;

// Standard Id Parameter Schema
export const IdParamSchema = Type.Object({
  id: Type.String({ minLength: 1 })
});
export type IdParamDTO = Static<typeof IdParamSchema>;

// Standard Symbol Parameter Schema
export const SymbolParamSchema = Type.Object({
  symbol: Type.String({ minLength: 2, maxLength: 20 })
});
export type SymbolParamDTO = Static<typeof SymbolParamSchema>;

// Standard Pagination Metadata Schema
export const PaginationMetaSchema = Type.Object({
  total: Type.Integer(),
  page: Type.Integer(),
  limit: Type.Integer(),
  totalPages: Type.Integer()
});
export type PaginationMetaDTO = Static<typeof PaginationMetaSchema>;

// Standard API Success Envelope Schema Generator (ADR-31)
export function SuccessEnvelopeSchema<T extends TSchema>(dataSchema: T) {
  return Type.Object({
    success: Type.Literal(true),
    data: dataSchema,
    meta: Type.Optional(PaginationMetaSchema)
  });
}

// Standard API Error Envelope Schema (ADR-31)
export const ErrorEnvelopeSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown())
  })
});
export type ErrorEnvelopeDTO = Static<typeof ErrorEnvelopeSchema>;
