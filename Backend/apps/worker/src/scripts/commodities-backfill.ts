/**
 * Backfill commodity prices (Tier 3b) for gold, silver, platinum using
 * the FXMacroData Professional tier. Gated on FXMACRODATA_API_KEY.
 *
 * Default: 5 years for gold/silver/platinum. Override with:
 *   COMMODITIES_BACKFILL_YEARS=3
 *   COMMODITIES_BACKFILL_LIST=gold,silver
 */
import { CommodityPriceBackfiller } from './marketdata/marketdata-backfill-lib.js';
import { parseList } from '../shared/parseList.js';
import { runBackfiller } from './runBackfiller.js';

type CommodityIndicator = 'gold' | 'silver' | 'platinum';
const VALID_INDICATORS = [
  'gold',
  'silver',
  'platinum'
] as const satisfies readonly CommodityIndicator[];

const indicators = parseList<CommodityIndicator>(process.env.COMMODITIES_BACKFILL_LIST, {
  transform: (s) => s.toLowerCase() as CommodityIndicator,
  validate: (s) => (VALID_INDICATORS as readonly string[]).includes(s),
  fallback: ['gold', 'silver', 'platinum']
});

runBackfiller({
  label: 'COMMODITIES',
  yearsEnvVar: 'COMMODITIES_BACKFILL_YEARS',
  input: indicators,
  factory: (logger) => new CommodityPriceBackfiller(logger),
  run: (backfiller, { startYear, endYear, input }) =>
    backfiller.backfillIndicators(input, startYear, endYear)
}).catch((err) => {
  console.error('Unexpected error in commodities backfill runner:', err);
  process.exit(1);
});
