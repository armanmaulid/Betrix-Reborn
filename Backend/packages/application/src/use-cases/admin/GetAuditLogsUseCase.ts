import { PaginatedResult, PaginationParams } from '@betrix/core';
import { IAdminActionRepository, AdminAction } from '@betrix/domain';

export class GetAuditLogsUseCase {
  constructor(private readonly adminActionRepo: IAdminActionRepository) {}

  public async execute(
    pagination: PaginationParams,
    actionType?: string
  ): Promise<PaginatedResult<AdminAction>> {
    return this.adminActionRepo.findAll(pagination, actionType);
  }
}
