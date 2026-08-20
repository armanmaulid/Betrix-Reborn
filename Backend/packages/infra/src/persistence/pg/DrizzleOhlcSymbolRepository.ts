import { eq } from 'drizzle-orm';
import { DrizzleDb } from '../drizzle/client.js';
import { ohlcSymbols } from '../drizzle/schema.js';

export interface OhlcSymbolRow {
  symbol: string;
  dukascopySymbol: string;
  description: string | null;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DrizzleOhlcSymbolRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findActive(): Promise<OhlcSymbolRow[]> {
    const rows = await this.db
      .select()
      .from(ohlcSymbols)
      .where(eq(ohlcSymbols.isActive, true))
      .orderBy(ohlcSymbols.symbol);

    return rows;
  }
}
