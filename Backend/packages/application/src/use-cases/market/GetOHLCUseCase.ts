import { Value } from '@sinclair/typebox/value';
import { OHLCBar } from '@betrix/domain';
import { MarketDataService } from '../../services/MarketDataService.js';
import {
  GetOHLCParamsDTO,
  GetOHLCQueryDTO,
  GetOHLCQuerySchema
} from '../../schemas/market.schema.js';

export class GetOHLCUseCase {
  constructor(private readonly marketDataService: MarketDataService) {}

  public async execute(params: GetOHLCParamsDTO, query?: GetOHLCQueryDTO): Promise<OHLCBar[]> {
    // A1 — schema is the source of truth; Default fills `limit: 100`.
    const input = Value.Default(GetOHLCQuerySchema, query ?? {}) as GetOHLCQueryDTO;
    return this.marketDataService.getOHLC(params.symbol, params.timeframe, input.limit);
  }
}
