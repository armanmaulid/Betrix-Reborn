'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, User, Globe } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/formatters';
import type { AuditLog } from '@operations/domain/entities/AuditLog';

export interface AuditTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  isError: boolean;
  onInspect: (log: AuditLog) => void;
}

export function AuditTable({ logs, isLoading, isError, onInspect }: AuditTableProps) {
  return (
    <div className="border border-border bg-surface overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/80 text-[10px] text-muted-foreground uppercase tracking-wider">
            <th className="p-3">EVENT TIMESTAMP</th>
            <th className="p-3">ACTION EVENT</th>
            <th className="p-3">ACTOR / TRADER</th>
            <th className="p-3">RESOURCE TARGET</th>
            <th className="p-3">IP ADDRESS</th>
            <th className="p-3 text-right">PAYLOAD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">
                QUERYING AUDIT TRAIL LOGS...
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-negative">
                FAILED TO LOAD AUDIT LOGS. PLEASE TRY AGAIN.
              </td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                NO AUDIT LOGS FOUND FOR THE SELECTED FILTER.
              </td>
            </tr>
          ) : (
            logs.map((log: AuditLog) => (
              <tr key={log.id} className="hover:bg-surface-hover/80 transition-colors font-mono">
                {/* Timestamp */}
                <td className="p-3 text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </td>

                {/* Action */}
                <td className="p-3">
                  <span className="px-2 py-0.5 text-[9px] font-bold border border-accent/40 bg-accent/10 text-accent uppercase">
                    {log.action}
                  </span>
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
                    <span className="text-muted-foreground/60 italic text-[11px]">
                      SYSTEM ANONYMOUS
                    </span>
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
