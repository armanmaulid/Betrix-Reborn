/**
 * Tier 1 backfill: discover the FULL set of USD indicators from the
 * FXMacroData data catalogue and backfill their historical-announcement
 * series. Independent of the calendar schedule — surfaces indicators the
 * calendar hasn't listed yet.
 *
 * Gated on FXMACRODATA_API_KEY (USD catalogue is free but we still gate to
 * keep behaviour consistent and avoid burning the 365-day window in CI).
 */
import pino from 'pino';
import { env } from '@betrix/config';
import { UsdCatalogueBackfiller } from './marketdata/marketdata-backfill-lib.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

async function main(): Promise<void> {
  const backfiller = new UsdCatalogueBackfiller(logger);
  try {
    const indicators = await backfiller.discoverUsdIndicators();
    if (indicators.length === 0) {
      logger.info('[USD CATALOGUE] No indicators discovered (key missing or empty catalogue).');
      return;
    }
    logger.info(
      `[USD CATALOGUE] ${indicators.length} indicators ready: ${indicators
        .slice(0, 5)
        .map((i) => i.indicator)
        .join(', ')}${indicators.length > 5 ? '…' : ''}`
    );
    logger.info(
      '[USD CATALOGUE] To fetch the actual series for each indicator, run `calendar:backfill` (already wired). ' +
        'The catalogue only DISCOVERS what is available; announcements are pulled by the backfill script.'
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'USD catalogue discovery failed');
    process.exitCode = 1;
  }
}

main();
