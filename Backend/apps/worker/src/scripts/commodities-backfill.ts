/**
 * Backfill commodity prices (Tier 3b) for gold, silver, platinum using
 * the FXMacroData Professional tier. Gated on FXMACRODATA_API_KEY.
 *
 * Default: 5 years for gold/silver/platinum. Override with:
 *   COMMODITIES_BACKFILL_YEARS=3
 *   COMMODITIES_BACKFILL_LIST=gold,silver
 */
import pino from 'pino';
import { env } from '@betrix/config';
import { CommodityPriceBackfiller } from './marketdata/marketdata-backfill-lib.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

type CommodityIndicator = 'gold' | 'silver' | 'platinum';
const DEFAULT: CommodityIndicator[] = ['gold', 'silver', 'platinum'];

function parseIndicators(): CommodityIndicator[] {
  const raw = process.env.COMMODITIES_BACKFILL_LIST;
  if (!raw) return DEFAULT;
  const valid: CommodityIndicator[] = ['gold', 'silver', 'platinum'];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase() as CommodityIndicator)
    .filter((s) => valid.includes(s));
}

async function main(): Promise<void> {
  const currentYear = new Date().getUTCFullYear();
  const years = Number(process.env.COMMODITIES_BACKFILL_YEARS ?? '5');
  const startYear = currentYear - years;
  const endYear = currentYear;
  const indicators = parseIndicators();

  const backfiller = new CommodityPriceBackfiller(logger);
  try {
    const result = await backfiller.backfillIndicators(indicators, startYear, endYear);
    logger.info(
      `[COMMODITIES COMPLETE] indicators=${indicators.join(',')} years=${startYear}..${endYear} fetched=${result.fetched} saved=${result.saved} failed=${result.failed}`
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Commodities backfill failed');
    process.exitCode = 1;
  } finally {
    await backfiller.close();
  }
}

main();
