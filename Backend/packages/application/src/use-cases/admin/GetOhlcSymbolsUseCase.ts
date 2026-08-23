import { IOhlcSymbolRepository, OhlcSymbol } from '@betrix/domain';

export class GetOhlcSymbolsUseCase {
  constructor(private readonly ohlcSymbolRepo: IOhlcSymbolRepository) {}

  public async execute(activeOnly: boolean = false): Promise<OhlcSymbol[]> {
    return this.ohlcSymbolRepo.findAll(activeOnly);
  }
}
