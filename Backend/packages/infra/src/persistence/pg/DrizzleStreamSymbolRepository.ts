import { eq } from 'drizzle-orm';
import { DrizzleDb } from '../drizzle/client.js';
import { streamSymbols } from '../drizzle/schema.js';

export interface StreamSymbolRow {
  symbol: string;
  finnhubSymbol: string;
  description: string | null;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DrizzleStreamSymbolRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findAll(activeOnly: boolean = false): Promise<StreamSymbolRow[]> {
    const query = activeOnly
      ? this.db.select().from(streamSymbols).where(eq(streamSymbols.isActive, true))
      : this.db.select().from(streamSymbols);

    return query.orderBy(streamSymbols.category, streamSymbols.symbol);
  }

  async findActive(): Promise<StreamSymbolRow[]> {
    return this.findAll(true);
  }

  async findBySymbol(symbol: string): Promise<StreamSymbolRow | null> {
    const result = await this.db
      .select()
      .from(streamSymbols)
      .where(eq(streamSymbols.symbol, symbol.toUpperCase()))
      .limit(1);

    return result[0] || null;
  }

  async save(data: {
    symbol: string;
    finnhubSymbol: string;
    description?: string | null;
    category?: string;
    isActive?: boolean;
  }): Promise<StreamSymbolRow> {
    const sym = data.symbol.toUpperCase();
    const inserted = await this.db
      .insert(streamSymbols)
      .values({
        symbol: sym,
        finnhubSymbol: data.finnhubSymbol,
        description: data.description ?? null,
        category: data.category ?? 'forex',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: streamSymbols.symbol,
        set: {
          finnhubSymbol: data.finnhubSymbol,
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
      .delete(streamSymbols)
      .where(eq(streamSymbols.symbol, symbol.toUpperCase()))
      .returning();

    return deleted.length > 0;
  }
}
