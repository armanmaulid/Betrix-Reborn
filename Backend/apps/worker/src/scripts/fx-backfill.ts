/**
 * Backfill FX spot prices (Tier 3a) for the major currency pairs using the
 * FXMacroData Professional tier. Gated on FXMACRODATA_API_KEY.
 *
 * Default: 5 years of history for 7 major pairs (USD-based + cross) with
 * technical indicators. Override with env vars:
 *   FX_BACKFILL_YEARS=3
 *   FX_BACKFILL_PAIRS=EURUSD,GBPUSD,USDJPY
 */
import pino from 'pino';
import { env } from '@betrix/config';
import { FxSpotPriceBackfiller } from './marketdata/marketdata-backfill-lib.js';
import { parseList } from '../shared/parseList.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

import { premiumEnvDiagnostic } from './marketdata/marketdata-backfill-lib.js';
premiumEnvDiagnostic(logger, 'FX');

const DEFAULT_PAIRS: Array<{ base: string; quote: string }> = [
  { base: 'EUR', quote: 'USD' },
  { base: 'GBP', quote: 'USD' },
  { base: 'USD', quote: 'JPY' },
  { base: 'USD', quote: 'CHF' },
  { base: 'AUD', quote: 'USD' },
  { base: 'NZD', quote: 'USD' },
  { base: 'USD', quote: 'CAD' }
];

async function main(): Promise<void> {
  const currentYear = new Date().getUTCFullYear();
  const years = Number(process.env.FX_BACKFILL_YEARS ?? '5');
  const startYear = currentYear - years;
  const endYear = currentYear;

  // W4 — parse the comma-separated list once, then split each 6-char token
  // into a {base, quote} pair (throws on malformed input, matching the
  // original strict behavior).
  const pairStrings = parseList(process.env.FX_BACKFILL_PAIRS, {
    transform: (s) => s.toUpperCase(),
    fallback: DEFAULT_PAIRS.map((p) => p.base + p.quote)
  });
  const pairs = pairStrings.map((s) => {
    if (s.length !== 6)
      throw new Error(`FX_BACKFILL_PAIRS: expected BASE+QUOTE 6 chars, got "${s}"`);
    return { base: s.slice(0, 3), quote: s.slice(3, 6) };
  });
  const includeTechnical = (process.env.FX_BACKFILL_TECHNICAL ?? 'true') === 'true';

  const backfiller = new FxSpotPriceBackfiller(logger);
  try {
    const result = await backfiller.backfillPairs(pairs, startYear, endYear, includeTechnical);
    logger.info(
      `[FX SPOT COMPLETE] pairs=${pairs.length} years=${startYear}..${endYear} fetched=${result.fetched} saved=${result.saved} failed=${result.failed}`
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'FX spot backfill failed');
    process.exitCode = 1;
  } finally {
    await backfiller.close();
  }
}

main();
