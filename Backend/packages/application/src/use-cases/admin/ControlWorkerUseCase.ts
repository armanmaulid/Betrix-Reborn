import { BackgroundWorkerInfo, IAdminActionRepository, AdminAction } from '@betrix/domain';
import { WorkerManagerService } from '../../services/WorkerManagerService.js';
import { ControlWorkerDTO } from '../../schemas/admin.schema.js';

export class ControlWorkerUseCase {
  constructor(
    private readonly workerManager: WorkerManagerService,
    private readonly adminActionRepo?: IAdminActionRepository
  ) {}

  public async execute(
    adminId: string,
    workerId: string,
    dto: ControlWorkerDTO,
    context?: { ip?: string; userAgent?: string }
  ): Promise<BackgroundWorkerInfo> {
    const updatedWorker = await this.workerManager.controlWorker(workerId, dto.action);

    if (this.adminActionRepo && adminId) {
      await this.adminActionRepo.save(
        new AdminAction({
          id: crypto.randomUUID(),
          adminId,
          action: 'CONTROL_WORKER',
          targetType: 'system_worker',
          targetId: workerId,
          details: {
            workerId,
            workerName: updatedWorker.name,
            action: dto.action,
            newStatus: updatedWorker.status
          },
          ip: context?.ip,
          userAgent: context?.userAgent,
          createdAt: new Date()
        })
      );
    }

    return updatedWorker;
  }
}
