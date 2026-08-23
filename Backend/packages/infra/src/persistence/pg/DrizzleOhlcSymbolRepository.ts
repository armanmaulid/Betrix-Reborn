import { eq } from 'drizzle-orm';
import { IOhlcSymbolRepository, OhlcSymbol } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { ohlcSymbols } from '../drizzle/schema.js';

export class DrizzleOhlcSymbolRepository implements IOhlcSymbolRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findAll(activeOnly: boolean = false): Promise<OhlcSymbol[]> {
    const query = activeOnly
      ? this.db.select().from(ohlcSymbols).where(eq(ohlcSymbols.isActive, true))
      : this.db.select().from(ohlcSymbols);

    return query.orderBy(ohlcSymbols.symbol);
  }

  async findActive(): Promise<OhlcSymbol[]> {
    return this.findAll(true);
  }

  async findBySymbol(symbol: string): Promise<OhlcSymbol | null> {
    const result = await this.db
      .select()
      .from(ohlcSymbols)
      .where(eq(ohlcSymbols.symbol, symbol.toUpperCase()))
      .limit(1);

    return result[0] || null;
  }

  async save(data: {
    symbol: string;
    dukascopySymbol: string;
    description?: string | null;
    category?: string;
    isActive?: boolean;
  }): Promise<OhlcSymbol> {
    const sym = data.symbol.toUpperCase();
    const inserted = await this.db
      .insert(ohlcSymbols)
      .values({
        symbol: sym,
        dukascopySymbol: data.dukascopySymbol,
        description: data.description ?? null,
        category: data.category ?? 'forex',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: ohlcSymbols.symbol,
        set: {
          dukascopySymbol: data.dukascopySymbol,
          description: data.description !== undefined ? data.description : null,
          category: data.category ?? 'forex',
          isActive: data.isActive !== undefined ? data.isActive : true,
          updatedAt: new Date()
        }
      })
      .returning();

    return inserted[0]!;
  }

  async delete(symbol: string): Promise<boolean> {
    const deleted = await this.db
      .delete(ohlcSymbols)
      .where(eq(ohlcSymbols.symbol, symbol.toUpperCase()))
      .returning();

    return deleted.length > 0;
  }
}
