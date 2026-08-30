import { IAdminActionRepository } from '@betrix/domain';
import { toCsvRow } from '@betrix/core';

export class ExportAuditLogsUseCase {
  constructor(private readonly adminActionRepo: IAdminActionRepository) {}

  public async execute(
    format: 'json' | 'csv' = 'json',
    actionType?: string
  ): Promise<{ format: string; content: string; filename: string }> {
    const logs = await this.adminActionRepo.exportAll(actionType);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `betrix_audit_logs_${timestamp}.${format}`;

    if (format === 'json') {
      return {
        format: 'json',
        content: JSON.stringify(
          logs.map((l) => l.toJSON()),
          null,
          2
        ),
        filename
      };
    }

    // CSV format (A4 — uses toCsvRow from @betrix/core, RFC 4180 escaping)
    const headers = [
      'id',
      'adminId',
      'action',
      'targetType',
      'targetId',
      'details',
      'ip',
      'createdAt'
    ];
    const rows = logs.map((l) => {
      const j = l.toJSON();
      return toCsvRow([
        j.id,
        j.adminId,
        j.action,
        j.targetType,
        j.targetId,
        j.details,
        j.ip,
        j.createdAt
      ]);
    });

    return {
      format: 'csv',
      content: [toCsvRow(headers), ...rows].join('\n'),
      filename
    };
  }
}
