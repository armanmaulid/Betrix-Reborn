import { IStreamSymbolRepository, StreamSymbol } from '@betrix/domain';

export class GetStreamSymbolsUseCase {
  constructor(private readonly streamSymbolRepo: IStreamSymbolRepository) {}

  public async execute(activeOnly: boolean = false): Promise<StreamSymbol[]> {
    return this.streamSymbolRepo.findAll(activeOnly);
  }
}
