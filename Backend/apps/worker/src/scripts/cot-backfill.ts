/**
 * Backfill CFTC Commitment of Traders (Tier 3c) for major currencies using
 * the FXMacroData Professional tier. Gated on FXMACRODATA_API_KEY.
 *
 * Default: 5 years for the 8 COT-supported currencies. Override with:
 *   COT_BACKFILL_YEARS=3
 *   COT_BACKFILL_CURRENCIES=USD,EUR,GBP,JPY
 */
import { CotPositionBackfiller } from './marketdata/marketdata-backfill-lib.js';
import { parseList } from '../shared/parseList.js';
import { runBackfiller } from './runBackfiller.js';

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];

const currencies = parseList(process.env.COT_BACKFILL_CURRENCIES, {
  transform: (s) => s.toUpperCase(),
  fallback: DEFAULT_CURRENCIES
});

runBackfiller({
  label: 'COT',
  yearsEnvVar: 'COT_BACKFILL_YEARS',
  input: currencies,
  factory: (logger) => new CotPositionBackfiller(logger),
  run: (backfiller, { startYear, endYear, input }) =>
    backfiller.backfillCurrencies(input, startYear, endYear)
}).catch((err) => {
  console.error('Unexpected error in COT backfill runner:', err);
  process.exit(1);
});
