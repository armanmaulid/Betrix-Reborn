/**
 * Backfill FX spot prices (Tier 3a) for the major currency pairs using the
 * FXMacroData Professional tier. Gated on FXMACRODATA_API_KEY.
 *
 * Default: 5 years of history for 7 major pairs (USD-based + cross) with
 * technical indicators. Override with env vars:
 *   FX_BACKFILL_YEARS=3
 *   FX_BACKFILL_PAIRS=EURUSD,GBPUSD,USDJPY
 */
import { FxSpotPriceBackfiller } from './marketdata/marketdata-backfill-lib.js';
import { parseList } from '../shared/parseList.js';
import { runBackfiller } from './runBackfiller.js';

const DEFAULT_PAIRS: Array<{ base: string; quote: string }> = [
  { base: 'EUR', quote: 'USD' },
  { base: 'GBP', quote: 'USD' },
  { base: 'USD', quote: 'JPY' },
  { base: 'USD', quote: 'CHF' },
  { base: 'AUD', quote: 'USD' },
  { base: 'NZD', quote: 'USD' },
  { base: 'USD', quote: 'CAD' }
];

// W4 — parse the comma-separated list once, then split each 6-char token
// into a {base, quote} pair (throws on malformed input, matching the
// original strict behavior).
const pairStrings = parseList(process.env.FX_BACKFILL_PAIRS, {
  transform: (s) => s.toUpperCase(),
  fallback: DEFAULT_PAIRS.map((p) => p.base + p.quote)
});
const pairs = pairStrings.map((s) => {
  if (s.length !== 6) {
    throw new Error(`FX_BACKFILL_PAIRS: expected BASE+QUOTE 6 chars, got "${s}"`);
  }
  return { base: s.slice(0, 3), quote: s.slice(3, 6) };
});
const includeTechnical = (process.env.FX_BACKFILL_TECHNICAL ?? 'true') === 'true';

runBackfiller({
  label: 'FX SPOT',
  yearsEnvVar: 'FX_BACKFILL_YEARS',
  input: { pairs, includeTechnical },
  factory: (logger) => new FxSpotPriceBackfiller(logger),
  run: (backfiller, { startYear, endYear, input }) =>
    backfiller.backfillPairs(input.pairs, startYear, endYear, input.includeTechnical)
}).catch((err) => {
  console.error('Unexpected error in FX backfill runner:', err);
  process.exit(1);
});
