import { instrumentMetaData } from 'dukascopy-node';
import { Symbol, ISymbolRepository } from '@betrix/domain';

export class DukascopySymbolCatalog {
  /**
   * Classifies a Dukascopy instrument ID and metadata into standard market categories.
   */
  public static classifyCategory(id: string, meta: any): string {
    const idLower = id.toLowerCase();
    const name = meta.name || '';
    const desc = (meta.description || '').toLowerCase();

    // 1. Indices
    if (
      idLower.includes('idx') ||
      (desc.includes('index') &&
        !name.includes('.') &&
        !idLower.startsWith('2828') &&
        !idLower.startsWith('3188'))
    ) {
      return 'indices';
    }

    // 2. Government Bonds
    if (
      idLower.includes('bond') ||
      idLower.includes('gilt') ||
      idLower.includes('bund') ||
      desc.includes('treasury')
    ) {
      return 'bonds';
    }

    // 3. Digital Assets / Crypto
    if (
      idLower.startsWith('btc') ||
      idLower.startsWith('eth') ||
      idLower.startsWith('ltc') ||
      idLower.startsWith('xrp') ||
      idLower.startsWith('bch') ||
      idLower.startsWith('ada') ||
      idLower.startsWith('dot') ||
      idLower.startsWith('sol') ||
      idLower.startsWith('dog') ||
      idLower.startsWith('uni') ||
      idLower.startsWith('lnk') ||
      idLower.startsWith('mat') ||
      idLower.startsWith('xlm')
    ) {
      return 'crypto';
    }

    // 4. Commodities (Metals, Energy, Agriculture)
    if (
      idLower.includes('cmd') ||
      idLower.startsWith('xau') ||
      idLower.startsWith('xag') ||
      idLower.startsWith('xpt') ||
      idLower.startsWith('xpd') ||
      idLower.startsWith('copper') ||
      idLower.startsWith('brent') ||
      idLower.startsWith('light') ||
      idLower.startsWith('gas') ||
      idLower.startsWith('cocoa') ||
      idLower.startsWith('coffee') ||
      idLower.startsWith('cotton') ||
      idLower.startsWith('sugar') ||
      idLower.startsWith('wheat') ||
      idLower.startsWith('soybean') ||
      desc.includes('gold') ||
      desc.includes('silver') ||
      desc.includes('oil') ||
      desc.includes('crude')
    ) {
      if (
        !name.includes('.') ||
        idLower.includes('cmd') ||
        idLower.startsWith('xau') ||
        idLower.startsWith('xag')
      ) {
        return 'commodity';
      }
    }

    // 5. Forex Currencies & Crosses
    if (!name.includes('.') && name.length === 7 && name.includes('/')) {
      return 'forex';
    }

    // 6. Stocks & ETFs (Equities)
    if (name.includes('.') || idLower.length > 7) {
      return 'stocks';
    }

    return 'forex';
  }

  /**
   * Normalizes symbol code for institutional consistency (e.g. 'eurusd' -> 'EURUSD', '0005hkhkd' -> '0005HKHKD').
   */
  public static normalizeSymbol(id: string, name: string): string {
    if (name && name.includes('/')) {
      return name.replace('/', '').replace('.', '').toUpperCase();
    }
    return id.toUpperCase();
  }

  /**
   * Parses all 1,499+ instruments from dukascopy-node into domain Symbol entities.
   */
  public static parseAllBrokerSymbols(): Symbol[] {
    const now = new Date();
    const symbols: Symbol[] = [];
    const seenSymbols = new Set<string>();

    for (const [id, meta] of Object.entries(instrumentMetaData as Record<string, any>)) {
      const normalizedSym = this.normalizeSymbol(id, meta.name || id);
      if (seenSymbols.has(normalizedSym)) continue;
      seenSymbols.add(normalizedSym);

      const category = this.classifyCategory(id, meta);

      symbols.push(
        new Symbol({
          symbol: normalizedSym,
          description: meta.description || meta.name || normalizedSym,
          path: meta.name || normalizedSym,
          category,
          finnhubSymbol: null,
          dukascopySymbol: id.toLowerCase(),
          isActive: false,
          createdAt: now,
          updatedAt: now
        })
      );
    }

    return symbols;
  }

  /**
   * Synchronizes all broker symbols with PostgreSQL database.
   * Inserts missing symbols and updates catalog dynamically.
   */
  public static async syncCatalogWithDatabase(symbolRepo: ISymbolRepository): Promise<{
    totalBrokerSymbols: number;
    newSymbolsInserted: number;
    existingSymbolsCount: number;
  }> {
    const brokerSymbols = this.parseAllBrokerSymbols();
    const existingInDb = await symbolRepo.findAll(false);
    const existingMap = new Set(existingInDb.map((s) => s.symbol.toUpperCase()));

    const toInsert: Symbol[] = [];
    for (const bSym of brokerSymbols) {
      if (!existingMap.has(bSym.symbol.toUpperCase())) {
        toInsert.push(bSym);
      }
    }

    let newInserted = 0;
    if (toInsert.length > 0) {
      newInserted = await symbolRepo.saveMany(toInsert);
    }

    return {
      totalBrokerSymbols: brokerSymbols.length,
      newSymbolsInserted: newInserted,
      existingSymbolsCount: existingInDb.length
    };
  }
}
