import { DrizzleStreamSymbolRepository, StreamSymbolRow } from '@betrix/infra';

export class GetStreamSymbolsUseCase {
  constructor(private readonly streamSymbolRepo: DrizzleStreamSymbolRepository) {}

  public async execute(activeOnly: boolean = false): Promise<StreamSymbolRow[]> {
    return this.streamSymbolRepo.findAll(activeOnly);
  }
}
