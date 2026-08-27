import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  FxSpotPrice,
  CommodityPrice,
  CotPosition,
  IFxSpotPriceRepository,
  FxSpotPriceQuery,
  ICommodityPriceRepository,
  CommodityPriceQuery,
  ICotPositionRepository,
  CotPositionQuery
} from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { fxSpotPrices, commodityPrices, cotPositions } from '../drizzle/schema.js';

export class DrizzleFxSpotPriceRepository implements IFxSpotPriceRepository {
  constructor(private readonly db: DrizzleDb) {}

  async saveMany(prices: FxSpotPrice[]): Promise<number> {
    if (prices.length === 0) return 0;
    const rows = prices.map((p) => this.toRow(p));
    const inserted = await this.db
      .insert(fxSpotPrices)
      .values(rows)
      .onConflictDoUpdate({
        target: fxSpotPrices.id,
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          unit: sql`excluded.unit`,
          sma20: sql`excluded.sma_20`,
          sma50: sql`excluded.sma_50`,
          sma200: sql`excluded.sma_200`,
          rsi14: sql`excluded.rsi_14`,
          macd: sql`excluded.macd`,
          macdSignal: sql`excluded.macd_signal`,
          macdHist: sql`excluded.macd_hist`,
          ema12: sql`excluded.ema_12`,
          ema26: sql`excluded.ema_26`,
          bbUpper: sql`excluded.bb_upper`,
          bbMiddle: sql`excluded.bb_middle`,
          bbLower: sql`excluded.bb_lower`,
          updatedAt: new Date()
        }
      })
      .returning({ id: fxSpotPrices.id });
    return inserted.length;
  }

  async upsertOne(price: FxSpotPrice): Promise<FxSpotPrice> {
    await this.saveMany([price]);
    const found = await this.findById(price.id);
    if (!found) throw new Error(`DrizzleFxSpotPriceRepository: upsert lost row ${price.id}`);
    return found;
  }

  async findById(id: string): Promise<FxSpotPrice | null> {
    const rows = await this.db
      .select()
      .from(fxSpotPrices)
      .where(eq(fxSpotPrices.id, id))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async findMany(query: FxSpotPriceQuery): Promise<FxSpotPrice[]> {
    const where = and(
      query.base ? eq(fxSpotPrices.base, query.base.toUpperCase()) : undefined,
      query.quote ? eq(fxSpotPrices.quote, query.quote.toUpperCase()) : undefined,
      query.fromDate ? gte(fxSpotPrices.tradeDate, query.fromDate) : undefined,
      query.toDate ? lte(fxSpotPrices.tradeDate, query.toDate) : undefined
    );
    const rows = await this.db
      .select()
      .from(fxSpotPrices)
      .where(where)
      .orderBy(fxSpotPrices.tradeDate)
      .limit(query.limit ?? 10000);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findLatest(base: string, quote: string): Promise<FxSpotPrice | null> {
    const rows = await this.db
      .select()
      .from(fxSpotPrices)
      .where(and(eq(fxSpotPrices.base, base.toUpperCase()), eq(fxSpotPrices.quote, quote.toUpperCase())))
      .orderBy(desc(fxSpotPrices.tradeDate))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async countForPair(base: string, quote: string): Promise<number> {
    const rows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(fxSpotPrices)
      .where(and(eq(fxSpotPrices.base, base.toUpperCase()), eq(fxSpotPrices.quote, quote.toUpperCase())));
    return Number(rows[0]?.c ?? 0);
  }

  private mapToDomain(r: typeof fxSpotPrices.$inferSelect): FxSpotPrice {
    return new FxSpotPrice({
      id: r.id,
      base: r.base,
      quote: r.quote,
      tradeDate: String(r.tradeDate),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      unit: r.unit,
      sma20: r.sma20,
      sma50: r.sma50,
      sma200: r.sma200,
      rsi14: r.rsi14,
      macd: r.macd,
      macdSignal: r.macdSignal,
      macdHist: r.macdHist,
      ema12: r.ema12,
      ema26: r.ema26,
      bbUpper: r.bbUpper,
      bbMiddle: r.bbMiddle,
      bbLower: r.bbLower,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    });
  }

  private toRow(p: FxSpotPrice) {
    return {
      id: p.id,
      base: p.base,
      quote: p.quote,
      tradeDate: p.tradeDate,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      unit: p.unit,
      sma20: p.sma20,
      sma50: p.sma50,
      sma200: p.sma200,
      rsi14: p.rsi14,
      macd: p.macd,
      macdSignal: p.macdSignal,
      macdHist: p.macdHist,
      ema12: p.ema12,
      ema26: p.ema26,
      bbUpper: p.bbUpper,
      bbMiddle: p.bbMiddle,
      bbLower: p.bbLower
    };
  }
}

export class DrizzleCommodityPriceRepository implements ICommodityPriceRepository {
  constructor(private readonly db: DrizzleDb) {}

  async saveMany(rows: CommodityPrice[]): Promise<number> {
    if (rows.length === 0) return 0;
    const values = rows.map((r) => this.toRow(r));
    const inserted = await this.db
      .insert(commodityPrices)
      .values(values)
      .onConflictDoUpdate({
        target: commodityPrices.id,
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          unit: sql`excluded.unit`,
          updatedAt: new Date()
        }
      })
      .returning({ id: commodityPrices.id });
    return inserted.length;
  }

  async upsertOne(row: CommodityPrice): Promise<CommodityPrice> {
    await this.saveMany([row]);
    const found = await this.findById(row.id);
    if (!found) throw new Error(`DrizzleCommodityPriceRepository: upsert lost row ${row.id}`);
    return found;
  }

  async findById(id: string): Promise<CommodityPrice | null> {
    const rows = await this.db
      .select()
      .from(commodityPrices)
      .where(eq(commodityPrices.id, id))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async findMany(query: CommodityPriceQuery): Promise<CommodityPrice[]> {
    const where = and(
      query.indicator ? eq(commodityPrices.indicator, query.indicator) : undefined,
      query.fromDate ? gte(commodityPrices.tradeDate, query.fromDate) : undefined,
      query.toDate ? lte(commodityPrices.tradeDate, query.toDate) : undefined
    );
    const rows = await this.db
      .select()
      .from(commodityPrices)
      .where(where)
      .orderBy(commodityPrices.tradeDate)
      .limit(query.limit ?? 10000);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findLatest(indicator: string): Promise<CommodityPrice | null> {
    const rows = await this.db
      .select()
      .from(commodityPrices)
      .where(eq(commodityPrices.indicator, indicator))
      .orderBy(desc(commodityPrices.tradeDate))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async countForIndicator(indicator: string): Promise<number> {
    const rows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(commodityPrices)
      .where(eq(commodityPrices.indicator, indicator));
    return Number(rows[0]?.c ?? 0);
  }

  private mapToDomain(r: typeof commodityPrices.$inferSelect): CommodityPrice {
    return new CommodityPrice({
      id: r.id,
      indicator: r.indicator,
      tradeDate: String(r.tradeDate),
      close: r.close,
      open: r.open,
      high: r.high,
      low: r.low,
      unit: r.unit,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    });
  }

  private toRow(r: CommodityPrice) {
    return {
      id: r.id,
      indicator: r.indicator,
      tradeDate: r.tradeDate,
      close: r.close,
      open: r.open,
      high: r.high,
      low: r.low,
      unit: r.unit
    };
  }
}

export class DrizzleCotPositionRepository implements ICotPositionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async saveMany(rows: CotPosition[]): Promise<number> {
    if (rows.length === 0) return 0;
    const values = rows.map((r) => this.toRow(r));
    const inserted = await this.db
      .insert(cotPositions)
      .values(values)
      .onConflictDoUpdate({
        target: cotPositions.id,
        set: {
          commercialLong: sql`excluded.commercial_long`,
          commercialShort: sql`excluded.commercial_short`,
          commercialNet: sql`excluded.commercial_net`,
          noncommercialLong: sql`excluded.noncommercial_long`,
          noncommercialShort: sql`excluded.noncommercial_short`,
          noncommercialNet: sql`excluded.noncommercial_net`,
          totalOpenInterest: sql`excluded.total_open_interest`,
          updatedAt: new Date()
        }
      })
      .returning({ id: cotPositions.id });
    return inserted.length;
  }

  async upsertOne(row: CotPosition): Promise<CotPosition> {
    await this.saveMany([row]);
    const found = await this.findById(row.id);
    if (!found) throw new Error(`DrizzleCotPositionRepository: upsert lost row ${row.id}`);
    return found;
  }

  async findById(id: string): Promise<CotPosition | null> {
    const rows = await this.db
      .select()
      .from(cotPositions)
      .where(eq(cotPositions.id, id))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async findMany(query: CotPositionQuery): Promise<CotPosition[]> {
    const where = and(
      query.currency ? eq(cotPositions.currency, query.currency.toUpperCase()) : undefined,
      query.fromDate ? gte(cotPositions.tradeDate, query.fromDate) : undefined,
      query.toDate ? lte(cotPositions.tradeDate, query.toDate) : undefined
    );
    const rows = await this.db
      .select()
      .from(cotPositions)
      .where(where)
      .orderBy(cotPositions.tradeDate)
      .limit(query.limit ?? 10000);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findLatest(currency: string): Promise<CotPosition | null> {
    const rows = await this.db
      .select()
      .from(cotPositions)
      .where(eq(cotPositions.currency, currency.toUpperCase()))
      .orderBy(desc(cotPositions.tradeDate))
      .limit(1);
    return rows[0] ? this.mapToDomain(rows[0]) : null;
  }

  async countForCurrency(currency: string): Promise<number> {
    const rows = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(cotPositions)
      .where(eq(cotPositions.currency, currency.toUpperCase()));
    return Number(rows[0]?.c ?? 0);
  }

  private mapToDomain(r: typeof cotPositions.$inferSelect): CotPosition {
    return new CotPosition({
      id: r.id,
      currency: r.currency,
      tradeDate: String(r.tradeDate),
      commercialLong: r.commercialLong,
      commercialShort: r.commercialShort,
      commercialNet: r.commercialNet,
      noncommercialLong: r.noncommercialLong,
      noncommercialShort: r.noncommercialShort,
      noncommercialNet: r.noncommercialNet,
      totalOpenInterest: r.totalOpenInterest,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    });
  }

  private toRow(r: CotPosition) {
    return {
      id: r.id,
      currency: r.currency,
      tradeDate: r.tradeDate,
      commercialLong: r.commercialLong,
      commercialShort: r.commercialShort,
      commercialNet: r.commercialNet,
      noncommercialLong: r.noncommercialLong,
      noncommercialShort: r.noncommercialShort,
      noncommercialNet: r.noncommercialNet,
      totalOpenInterest: r.totalOpenInterest
    };
  }
}
