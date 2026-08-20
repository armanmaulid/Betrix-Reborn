import { eq } from 'drizzle-orm';
import { ISymbolRepository, Symbol, Nullable } from '@betrix/domain';
import { DrizzleDb } from '../drizzle/client.js';
import { symbols } from '../drizzle/schema.js';

export class DrizzleSymbolRepository implements ISymbolRepository {
  constructor(private readonly db: DrizzleDb) {}

  private mapToDomain(row: typeof symbols.$inferSelect): Symbol {
    return new Symbol({
      symbol: row.symbol,
      description: row.description,
      path: row.path,
      category: row.category,
      finnhubSymbol: row.finnhubSymbol,
      dukascopySymbol: row.dukascopySymbol,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  async findAll(activeOnly: boolean = false): Promise<Symbol[]> {
    const query = activeOnly
      ? this.db.select().from(symbols).where(eq(symbols.isActive, true))
      : this.db.select().from(symbols);

    const rows = await query.orderBy(symbols.category, symbols.symbol);
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByCategory(category: string): Promise<Symbol[]> {
    const rows = await this.db
      .select()
      .from(symbols)
      .where(eq(symbols.category, category))
      .orderBy(symbols.symbol);

    return rows.map((r) => this.mapToDomain(r));
  }

  async findBySymbol(symbol: string): Promise<Nullable<Symbol>> {
    const result = await this.db
      .select()
      .from(symbols)
      .where(eq(symbols.symbol, symbol.toUpperCase()))
      .limit(1);

    return result[0] ? this.mapToDomain(result[0]) : null;
  }

  async save(symbol: Symbol): Promise<Symbol> {
    const inserted = await this.db
      .insert(symbols)
      .values({
        symbol: symbol.symbol,
        description: symbol.description,
        path: symbol.path,
        category: symbol.category,
        finnhubSymbol: symbol.finnhubSymbol,
        dukascopySymbol: symbol.dukascopySymbol,
        isActive: symbol.isActive,
        createdAt: symbol.createdAt,
        updatedAt: symbol.updatedAt
      })
      .onConflictDoUpdate({
        target: symbols.symbol,
        set: {
          description: symbol.description,
          path: symbol.path,
          category: symbol.category,
          finnhubSymbol: symbol.finnhubSymbol,
          dukascopySymbol: symbol.dukascopySymbol,
          isActive: symbol.isActive,
          updatedAt: new Date()
        }
      })
      .returning();

    return this.mapToDomain(inserted[0]!);
  }

  async saveMany(symbolsList: Symbol[]): Promise<number> {
    if (symbolsList.length === 0) return 0;
    
    const chunkSize = 100;
    let totalSaved = 0;

    for (let i = 0; i < symbolsList.length; i += chunkSize) {
      const chunk = symbolsList.slice(i, i + chunkSize);
      await this.db
        .insert(symbols)
        .values(
          chunk.map((s) => ({
            symbol: s.symbol,
            description: s.description,
            path: s.path,
            category: s.category,
            finnhubSymbol: s.finnhubSymbol,
            dukascopySymbol: s.dukascopySymbol,
            isActive: s.isActive,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
          }))
        )
        .onConflictDoUpdate({
          target: symbols.symbol,
          set: {
            description: symbols.description,
            path: symbols.path,
            category: symbols.category,
            finnhubSymbol: symbols.finnhubSymbol,
            dukascopySymbol: symbols.dukascopySymbol,
            isActive: symbols.isActive,
            updatedAt: new Date()
          }
        });
      totalSaved += chunk.length;
    }

    return totalSaved;
  }

  async delete(symbol: string): Promise<boolean> {
    const deleted = await this.db
      .delete(symbols)
      .where(eq(symbols.symbol, symbol.toUpperCase()))
      .returning();

    return deleted.length > 0;
  }
}
