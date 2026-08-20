import { IAdminActionRepository } from '@betrix/domain';

export class ExportAuditLogsUseCase {
  constructor(private readonly adminActionRepo: IAdminActionRepository) {}

  public async execute(format: 'json' | 'csv' = 'json'): Promise<{ format: string; content: string; filename: string }> {
    const logs = await this.adminActionRepo.exportAll();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `betrix_audit_logs_${timestamp}.${format}`;

    if (format === 'json') {
      return {
        format: 'json',
        content: JSON.stringify(logs.map((l) => l.toJSON()), null, 2),
        filename
      };
    }

    // CSV format
    const headers = ['id', 'adminId', 'action', 'targetType', 'targetId', 'details', 'ip', 'createdAt'];
    const rows = logs.map((l) => {
      const j = l.toJSON();
      return [
        j.id,
        j.adminId,
        j.action,
        j.targetType,
        j.targetId,
        `"${JSON.stringify(j.details || {}).replace(/"/g, '""')}"`,
        j.ip || '',
        j.createdAt
      ].join(',');
    });

    return {
      format: 'csv',
      content: [headers.join(','), ...rows].join('\n'),
      filename
    };
  }
}
