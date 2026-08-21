import { BackgroundWorkerInfo } from '@betrix/domain';
import { WorkerManagerService } from '../../services/WorkerManagerService.js';

export class ListWorkersUseCase {
  constructor(private readonly workerManager: WorkerManagerService) {}

  public async execute(): Promise<BackgroundWorkerInfo[]> {
    return this.workerManager.getAllWorkers();
  }
}
