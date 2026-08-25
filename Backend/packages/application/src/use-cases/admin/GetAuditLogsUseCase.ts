import { IAdminActionRepository, IUserRepository, AdminAction } from '@betrix/domain';

export interface EnrichedAdminAction {
  id: string;
  adminId: string;
  adminEmail: string | null;
  adminName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  targetEmail: string | null;
  targetName: string | null;
  details: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export class GetAuditLogsUseCase {
  constructor(
    private readonly adminActionRepo: IAdminActionRepository,
    private readonly userRepo?: IUserRepository
  ) {}

  public async execute(
    pagination: { page: number; limit: number },
    actionType?: string,
    userId?: string
  ): Promise<{
    data: EnrichedAdminAction[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const paginated = await this.adminActionRepo.findAll(pagination, actionType, userId);

    if (!this.userRepo || paginated.data.length === 0) {
      return {
        ...paginated,
        data: paginated.data.map((a) => this.enrich(a, new Map()))
      };
    }

    // Batch-lookup every distinct admin/target id on this page in a single
    // query, instead of one findById per row (N+1).
    // Filter to valid UUIDs only — targetId can be non-UUID (symbol names,
    // worker IDs, etc.) which would crash the UUID column query.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idsOnPage = new Set<string>();
    for (const a of paginated.data) {
      if (UUID_RE.test(a.adminId)) idsOnPage.add(a.adminId);
      if (UUID_RE.test(a.targetId)) idsOnPage.add(a.targetId);
    }
    if (idsOnPage.size === 0) {
      return {
        ...paginated,
        data: paginated.data.map((a) => this.enrich(a, new Map()))
      };
    }
    const users = await this.userRepo.findByIds([...idsOnPage]);
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      ...paginated,
      data: paginated.data.map((a) => this.enrich(a, userById))
    };
  }

  private enrich(
    a: AdminAction,
    userById: Map<string, { email: string; name: string | null }>
  ): EnrichedAdminAction {
    const admin = userById.get(a.adminId);
    // targetId isn't always a user (e.g. targetType 'symbol', 'voucher') — only
    // resolve a target name/email when the target actually looks up as a user.
    const target = userById.get(a.targetId);
    return {
      id: a.id,
      adminId: a.adminId,
      adminEmail: admin?.email ?? null,
      adminName: admin?.name ?? null,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      targetEmail: a.targetType === 'user' ? (target?.email ?? null) : null,
      targetName: a.targetType === 'user' ? (target?.name ?? null) : null,
      details: a.details,
      ip: a.ip,
      userAgent: a.userAgent,
      createdAt: a.createdAt.toISOString()
    };
  }
}
