/**
 * Shared backfill scaffolding for FXMacroData market-data endpoints
 * (forex, cot, commodities, data_catalogue). All premium endpoints short-
 * circuit inside FxMacroDataClient when FXMACRODATA_API_KEY is not set;
 * this library adds a louder, user-facing skip message and uniform
 * chunking-by-year to keep per-request responses small and idempotent
 * saveMany (onConflictDoUpdate) safe to re-run.
 *
 * The library NEVER throws on per-pair / per-indicator failures; it logs
 * and continues so a single bad pair can't abort the whole run.
 */
import pino from 'pino';
import { env } from '@betrix/config';
import {
  createPgPool,
  createDrizzleClient,
  FxMacroDataClient,
  DrizzleFxSpotPriceRepository,
  DrizzleCotPositionRepository,
  DrizzleCommodityPriceRepository,
  type FxMacroDataFxPriceRow,
  type FxMacroDataCotRow,
  type FxMacroDataCommodityRow,
  type FxMacroDataCatalogueEntry
} from '@betrix/infra';
import { FxSpotPrice, CotPosition, CommodityPrice } from '@betrix/domain';

/** Resolved year range (UTC, inclusive). */
function utcYearRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** All whole years covered: [startYear, endYear] inclusive, current year capped. */
export function resolvedYearSpan(startYear: number, endYear: number, now = new Date()): number[] {
  const current = now.getUTCFullYear();
  const lo = Math.min(startYear, endYear);
  const hi = Math.min(Math.max(startYear, endYear), current);
  if (hi < lo) return [];
  const years: number[] = [];
  for (let y = lo; y <= hi; y++) years.push(y);
  return years;
}

/** Hard gate: returns true if premium features may run. Logs once if skipped. */
export function premiumGate(logger: pino.Logger, featureLabel: string): boolean {
  if (env.FXMACRODATA_API_KEY && env.FXMACRODATA_API_KEY.length > 0) return true;
  logger.warn(
    `[${featureLabel}] FXMACRODATA_API_KEY is not set — premium feature is gated. ` +
      `Skipping to avoid accidental API burn. Set the key in env to enable.`
  );
  return false;
}

// ── FX spot prices ────────────────────────────────────────────────────────
export class FxSpotPriceBackfiller {
  private pool = createPgPool(env.DATABASE_URL, 5);
  private repo = new DrizzleFxSpotPriceRepository(createDrizzleClient(this.pool));
  private fx = new FxMacroDataClient();

  constructor(private readonly logger: pino.Logger) {}

  public async backfillPairs(
    pairs: Array<{ base: string; quote: string }>,
    startYear: number,
    endYear: number,
    includeTechnical = true
  ): Promise<{ fetched: number; saved: number; failed: number }> {
    if (!premiumGate(this.logger, 'FX SPOT BACKFILL')) {
      return { fetched: 0, saved: 0, failed: 0 };
    }
    const years = resolvedYearSpan(startYear, endYear);
    const indicators = includeTechnical
      ? ([
          'sma_20',
          'sma_50',
          'sma_200',
          'rsi_14',
          'macd',
          'ema_12',
          'ema_26',
          'bollinger_bands'
        ] as const)
      : undefined;

    let totalFetched = 0;
    let totalSaved = 0;
    let totalFailed = 0;

    for (const { base, quote } of pairs) {
      let pairFetched = 0;
      let pairSaved = 0;
      for (const year of years) {
        const { start, end } = utcYearRange(year);
        try {
          const rows = await this.fx.fetchFxPrice(base, quote, start, end, indicators as any);
          pairFetched += rows.length;
          if (rows.length === 0) continue;
          const domain = rows.map(
            (r: FxMacroDataFxPriceRow) =>
              new FxSpotPrice({
                id: FxSpotPrice.buildId(base, quote, r.date),
                base,
                quote,
                tradeDate: r.date,
                open: r.open ?? null,
                high: r.high ?? null,
                low: r.low ?? null,
                close: r.close,
                unit: null,
                sma20: r.sma_20 ?? null,
                sma50: r.sma_50 ?? null,
                sma200: r.sma_200 ?? null,
                rsi14: r.rsi_14 ?? null,
                macd: r.macd ?? null,
                macdSignal: r.macd_signal ?? null,
                macdHist: r.macd_hist ?? null,
                ema12: r.ema_12 ?? null,
                ema26: r.ema_26 ?? null,
                bbUpper: r.bb_upper ?? null,
                bbMiddle: r.bb_middle ?? null,
                bbLower: r.bb_lower ?? null
              })
          );
          const saved = await this.repo.saveMany(domain);
          pairSaved += saved;
        } catch (err: any) {
          totalFailed += 1;
          this.logger.warn(
            { err: err.message, base, quote, year },
            'FX spot backfill chunk failed — continuing'
          );
        }
      }
      this.logger.info(`[FX SPOT] ${base}/${quote}: fetched=${pairFetched} saved=${pairSaved}`);
      totalFetched += pairFetched;
      totalSaved += pairSaved;
    }
    return { fetched: totalFetched, saved: totalSaved, failed: totalFailed };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// ── COT positions ────────────────────────────────────────────────────────
export class CotPositionBackfiller {
  private pool = createPgPool(env.DATABASE_URL, 5);
  private repo = new DrizzleCotPositionRepository(createDrizzleClient(this.pool));
  private fx = new FxMacroDataClient();

  constructor(private readonly logger: pino.Logger) {}

  public async backfillCurrencies(
    currencies: string[],
    startYear: number,
    endYear: number
  ): Promise<{ fetched: number; saved: number; failed: number }> {
    if (!premiumGate(this.logger, 'COT BACKFILL')) {
      return { fetched: 0, saved: 0, failed: 0 };
    }
    const years = resolvedYearSpan(startYear, endYear);
    let totalFetched = 0;
    let totalSaved = 0;
    let totalFailed = 0;

    for (const currency of currencies) {
      let currFetched = 0;
      let currSaved = 0;
      for (const year of years) {
        const { start, end } = utcYearRange(year);
        try {
          const rows = await this.fx.fetchCOT(currency, start, end);
          currFetched += rows.length;
          if (rows.length === 0) continue;
          const domain = rows.map(
            (r: FxMacroDataCotRow) =>
              new CotPosition({
                id: CotPosition.buildId(currency, r.date),
                currency,
                tradeDate: r.date,
                commercialLong: r.commercial_long ?? null,
                commercialShort: r.commercial_short ?? null,
                commercialNet: r.commercial_net ?? null,
                noncommercialLong: r.noncommercial_long ?? null,
                noncommercialShort: r.noncommercial_short ?? null,
                noncommercialNet: r.noncommercial_net ?? null,
                totalOpenInterest: r.total_open_interest ?? null
              })
          );
          const saved = await this.repo.saveMany(domain);
          currSaved += saved;
        } catch (err: any) {
          totalFailed += 1;
          this.logger.warn(
            { err: err.message, currency, year },
            'COT backfill chunk failed — continuing'
          );
        }
      }
      this.logger.info(`[COT] ${currency}: fetched=${currFetched} saved=${currSaved}`);
      totalFetched += currFetched;
      totalSaved += currSaved;
    }
    return { fetched: totalFetched, saved: totalSaved, failed: totalFailed };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// ── Commodities ──────────────────────────────────────────────────────────
export class CommodityPriceBackfiller {
  private pool = createPgPool(env.DATABASE_URL, 5);
  private repo = new DrizzleCommodityPriceRepository(createDrizzleClient(this.pool));
  private fx = new FxMacroDataClient();

  constructor(private readonly logger: pino.Logger) {}

  public async backfillIndicators(
    indicators: Array<'gold' | 'silver' | 'platinum'>,
    startYear: number,
    endYear: number
  ): Promise<{ fetched: number; saved: number; failed: number }> {
    if (!premiumGate(this.logger, 'COMMODITIES BACKFILL')) {
      return { fetched: 0, saved: 0, failed: 0 };
    }
    const years = resolvedYearSpan(startYear, endYear);
    let totalFetched = 0;
    let totalSaved = 0;
    let totalFailed = 0;

    for (const indicator of indicators) {
      let indFetched = 0;
      let indSaved = 0;
      for (const year of years) {
        const { start, end } = utcYearRange(year);
        try {
          const rows = await this.fx.fetchCommodities(indicator, start, end);
          indFetched += rows.length;
          if (rows.length === 0) continue;
          const domain = rows.map(
            (r: FxMacroDataCommodityRow) =>
              new CommodityPrice({
                id: CommodityPrice.buildId(indicator, r.date),
                indicator,
                tradeDate: r.date,
                close: r.close,
                open: r.open ?? null,
                high: r.high ?? null,
                low: r.low ?? null,
                unit: r.unit ?? null
              })
          );
          const saved = await this.repo.saveMany(domain);
          indSaved += saved;
        } catch (err: any) {
          totalFailed += 1;
          this.logger.warn(
            { err: err.message, indicator, year },
            'Commodities backfill chunk failed — continuing'
          );
        }
      }
      this.logger.info(`[COMMODITIES] ${indicator}: fetched=${indFetched} saved=${indSaved}`);
      totalFetched += indFetched;
      totalSaved += indSaved;
    }
    return { fetched: totalFetched, saved: totalSaved, failed: totalFailed };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// ── USD data-catalog discovery (Tier 1) ─────────────────────────────────
// Walks the USD catalogue and backfills the historical-announcement series
// for every indicator the catalogue returns. Independent of the calendar
// schedule — discovers indicators the calendar hasn't scheduled yet.
export class UsdCatalogueBackfiller {
  private fx = new FxMacroDataClient();

  constructor(private readonly logger: pino.Logger) {}

  public async discoverUsdIndicators(): Promise<FxMacroDataCatalogueEntry[]> {
    if (!env.FXMACRODATA_API_KEY || env.FXMACRODATA_API_KEY.length === 0) {
      this.logger.warn(
        '[USD CATALOGUE] FXMACRODATA_API_KEY not set — USD catalogue discovery is gated to ' +
          'avoid burning the free 365-day window. Set the key to enable.'
      );
      return [];
    }
    const list = await this.fx.fetchDataCatalogue('usd');
    this.logger.info(`[USD CATALOGUE] Discovered ${list.length} indicators.`);
    return list;
  }
}
