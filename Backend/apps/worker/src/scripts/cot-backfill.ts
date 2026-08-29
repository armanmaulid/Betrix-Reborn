/**
 * Backfill CFTC Commitment of Traders (Tier 3c) for major currencies using
 * the FXMacroData Professional tier. Gated on FXMACRODATA_API_KEY.
 *
 * Default: 5 years for the 8 COT-supported currencies. Override with:
 *   COT_BACKFILL_YEARS=3
 *   COT_BACKFILL_CURRENCIES=USD,EUR,GBP,JPY
 */
import pino from 'pino';
import { env } from '@betrix/config';
import { CotPositionBackfiller } from './marketdata/marketdata-backfill-lib.js';
import { parseList } from '../shared/parseList.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

import { premiumEnvDiagnostic } from './marketdata/marketdata-backfill-lib.js';
premiumEnvDiagnostic(logger, 'COT');

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];

const currencies = parseList(process.env.COT_BACKFILL_CURRENCIES, {
  transform: (s) => s.toUpperCase(),
  fallback: DEFAULT_CURRENCIES
});

async function main(): Promise<void> {
  const currentYear = new Date().getUTCFullYear();
  const years = Number(process.env.COT_BACKFILL_YEARS ?? '5');
  const startYear = currentYear - years;
  const endYear = currentYear;

  const backfiller = new CotPositionBackfiller(logger);
  try {
    const result = await backfiller.backfillCurrencies(currencies, startYear, endYear);
    logger.info(
      `[COT COMPLETE] currencies=${currencies.length} years=${startYear}..${endYear} fetched=${result.fetched} saved=${result.saved} failed=${result.failed}`
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'COT backfill failed');
    process.exitCode = 1;
  } finally {
    await backfiller.close();
  }
}

main();
