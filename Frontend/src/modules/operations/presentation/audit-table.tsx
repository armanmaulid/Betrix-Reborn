'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, User, Globe } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/formatters';
import type { AuditLog } from '@/modules/operations/domain/entities/AuditLog';
import { Badge } from '@/shared/presentation/ui/badge';
import { TableShell, type TableColumn } from '@/shared/presentation/ui/table-shell';

const COLUMNS: TableColumn[] = [
  { key: 'timestamp', label: 'Event Timestamp' },
  { key: 'action', label: 'Action Event' },
  { key: 'actor', label: 'Actor / Trader' },
  { key: 'resource', label: 'Resource Target' },
  { key: 'ip', label: 'IP Address' },
  { key: 'payload', label: 'Payload', align: 'right' }
];

export interface AuditTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  isError: boolean;
  onInspect: (log: AuditLog) => void;
}

export function AuditTable({ logs, isLoading, isError, onInspect }: AuditTableProps) {
  return (
    <TableShell
      columns={COLUMNS}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && logs.length === 0}
      loadingMessage="QUERYING AUDIT TRAIL LOGS..."
      errorMessage="FAILED TO LOAD AUDIT LOGS. PLEASE TRY AGAIN."
      emptyMessage="NO AUDIT LOGS FOUND FOR THE SELECTED FILTER."
      wrapperClassName="font-mono"
    >
      {logs.map((log: AuditLog) => (
        <tr key={log.id} className="hover:bg-surface-hover/80 transition-colors font-mono">
          {/* Timestamp */}
          <td className="p-3 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
            {formatDateTime(log.createdAt)}
          </td>

          {/* Action */}
          <td className="p-3">
            <Badge tone="accent-soft">{log.action}</Badge>
          </td>

          {/* Actor */}
          <td className="p-3 text-xs">
            {log.userId ? (
              <Link
                href={`/users/${log.userId}`}
                className="text-foreground hover:text-accent flex items-center gap-1 group"
              >
                <User className="w-3 h-3 text-muted-foreground group-hover:text-accent shrink-0" />
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] truncate max-w-[140px]">
                    {log.userName || log.userEmail || log.userId}
                  </span>
                  {(log.userName || log.userEmail) && (
                    <span className="text-[9px] text-muted-foreground select-all truncate max-w-[140px]">
                      {log.userId}
                    </span>
                  )}
                </span>
              </Link>
            ) : (
              <span className="text-muted-foreground/60 italic text-[11px]">SYSTEM ANONYMOUS</span>
            )}
          </td>

          {/* Resource Target */}
          <td className="p-3 text-[11px] text-foreground font-bold">
            {log.resource}
            {log.resourceId && (
              <div className="text-[9px] text-muted-foreground font-normal select-all">
                ID: {log.resourceId}
              </div>
            )}
            {(log.targetName || log.targetEmail) && (
              <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[140px]">
                {log.targetName || log.targetEmail}
              </div>
            )}
          </td>

          {/* IP Address */}
          <td className="p-3 text-[11px] text-muted-foreground tabular-nums">
            <div className="flex items-center gap-1 select-all">
              <Globe className="w-3 h-3 text-muted-foreground/60 shrink-0" />
              <span>{log.ipAddress || '—'}</span>
            </div>
          </td>

          {/* Payload Inspection */}
          <td className="p-3 text-right">
            <button
              onClick={() => onInspect(log)}
              className="inline-flex items-center gap-1 border border-border bg-black hover:border-accent hover:text-accent text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>INSPECT</span>
            </button>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}
