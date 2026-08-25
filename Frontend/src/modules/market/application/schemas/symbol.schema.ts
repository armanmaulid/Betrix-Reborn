import { z } from 'zod';

export const SYMBOL_CATEGORIES = [
  { value: 'forex', label: 'FOREX' },
  { value: 'metal', label: 'PRECIOUS METALS' },
  { value: 'energy', label: 'ENERGY' },
  { value: 'crypto', label: 'CRYPTO' },
  { value: 'indices', label: 'INDICES' }
] as const;

const categoryValues = SYMBOL_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const SymbolCategoryEnum = z.enum(categoryValues);
export type SymbolCategory = z.infer<typeof SymbolCategoryEnum>;

/**
 * The concrete form shape — derived from the schema so RHF's resolver and
 * the component stay type-aligned for every mode.
 */
export type SymbolFormValues = z.infer<ReturnType<typeof buildSymbolSchema>>;

/**
 * Mode-aware validation for the market symbol editor:
 * - catalog : symbol required, dukascopy mapping optional
 * - stream  : finnhub ticker (EXCHANGE:SYMBOL) required
 * - ohlc    : lowercase dukascopy ticker required
 */
export function buildSymbolSchema(mode: 'catalog' | 'stream' | 'ohlc') {
  return z.object({
    symbol: z
      .string()
      .min(2, 'Symbol must be at least 2 characters')
      .max(20, 'Symbol cannot exceed 20 characters')
      .regex(/^[A-Z0-9]+$/, 'Symbol may only contain A-Z and 0-9'),
    description: z.string().max(120, 'Description cannot exceed 120 characters'),
    category: SymbolCategoryEnum,
    finnhubSymbol:
      mode === 'stream'
        ? z
            .string()
            .min(3, 'Finnhub ticker is required')
            .max(50)
            .regex(
              /^[A-Z0-9_]+:[A-Z0-9_-]+$/,
              'Format must be EXCHANGE:SYMBOL (e.g. OANDA:EUR_USD)'
            )
        : z.string().max(50).optional().or(z.literal('')),
    dukascopySymbol:
      mode === 'ohlc'
        ? z
            .string()
            .min(2, 'Dukascopy ticker is required')
            .max(30)
            .regex(/^[a-z0-9]+$/, 'Use lowercase letters/digits only (e.g. eurusd)')
        : z
            .string()
            .max(30)
            .regex(/^[a-z0-9]*$/, 'Use lowercase letters/digits only (e.g. eurusd)')
            .optional()
            .or(z.literal('')),
    isActive: z.boolean()
  });
}

export type ValidatedSymbolForm = z.infer<ReturnType<typeof buildSymbolSchema>>;
