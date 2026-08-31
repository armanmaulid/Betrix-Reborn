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
    // T-5 — `Value.Default` returns `unknown`; the `as GetOHLCQueryDTO` is
    // a controlled widening because the schema is static and all defaults
    // are produced by TypeBox from that same schema. A type-level
    // `Static<typeof Schema>` guard would not add runtime safety here.
    // Intentional, do not "fix".
    const input = Value.Default(GetOHLCQuerySchema, query ?? {}) as GetOHLCQueryDTO;
    return this.marketDataService.getOHLC(params.symbol, params.timeframe, input.limit);
  }
}
