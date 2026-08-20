import { OHLCBar } from '@betrix/domain';
import { MarketDataService } from '../../services/MarketDataService.js';
import { GetOHLCParamsDTO, GetOHLCQueryDTO } from '../../schemas/market.schema.js';

export class GetOHLCUseCase {
  constructor(private readonly marketDataService: MarketDataService) {}

  public async execute(params: GetOHLCParamsDTO, query?: GetOHLCQueryDTO): Promise<OHLCBar[]> {
    const limit = query?.limit || 100;
    return this.marketDataService.getOHLC(params.symbol, params.timeframe, limit);
  }
}
