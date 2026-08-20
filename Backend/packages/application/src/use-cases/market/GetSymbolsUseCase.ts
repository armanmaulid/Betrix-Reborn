import { Symbol } from '@betrix/domain';
import { MarketDataService } from '../../services/MarketDataService.js';
import { GetSymbolsQueryDTO } from '../../schemas/market.schema.js';

export class GetSymbolsUseCase {
  constructor(private readonly marketDataService: MarketDataService) {}

  public async execute(query?: GetSymbolsQueryDTO): Promise<Symbol[]> {
    const activeOnly = query?.activeOnly !== undefined ? query.activeOnly : true;
    return this.marketDataService.getSymbols(activeOnly, query?.category);
  }
}
