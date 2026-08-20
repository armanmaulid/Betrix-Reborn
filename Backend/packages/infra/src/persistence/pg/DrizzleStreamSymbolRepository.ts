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

  async findActive(): Promise<StreamSymbolRow[]> {
    const rows = await this.db
      .select()
      .from(streamSymbols)
      .where(eq(streamSymbols.isActive, true))
      .orderBy(streamSymbols.symbol);

    return rows;
  }
}
